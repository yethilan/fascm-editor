const ACCESS_CODE = "FASCM@2026";
const DEFAULT_TEMPLATE = "images/1.png";

let undoStack = [];
let redoStack = [];
let currentTemplate = DEFAULT_TEMPLATE;
let editorReady = false;

const loginScreen = document.getElementById("login-screen");
const appShell = document.getElementById("app-shell");
const passInput = document.getElementById("passInput");
const errorMsg = document.getElementById("error-msg");
const sidebar = document.getElementById("sidebar");
const viewport = document.getElementById("viewportArea");
const objControls = document.getElementById("objControls");
const selectionType = document.getElementById("selectionType");
const fontGroup = document.getElementById("fontGroup");
const fontFamily = document.getElementById("fontFamily");
const opacitySlider = document.getElementById("opacitySlider");
const opacityValue = document.getElementById("opacityValue");
const customColor = document.getElementById("customColor");

const canvas = new fabric.Canvas("mainCanvas", {
    preserveObjectStacking: true,
    backgroundColor: "#ffffff",
    selectionColor: "rgba(95, 212, 255, 0.16)",
    selectionLineWidth: 1
});

document.addEventListener("DOMContentLoaded", () => {
    document.addEventListener("click", (event) => {
        if (window.innerWidth > 920) {
            return;
        }

        if (!sidebar.classList.contains("is-open")) {
            return;
        }

        const clickedInsideSidebar = sidebar.contains(event.target);
        const clickedMenuButton = event.target.closest(".menu-toggle");
        if (!clickedInsideSidebar && !clickedMenuButton) {
            closeSidebar();
        }
    });

    passInput.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
            checkAuth();
        }
    });

    if (sessionStorage.getItem("fascm-auth") === "ok") {
        showApp();
        return;
    }

    passInput.focus();
});

function checkAuth() {
    if (passInput.value === ACCESS_CODE) {
        sessionStorage.setItem("fascm-auth", "ok");
        showApp();
        return;
    }

    errorMsg.textContent = "Incorrect access code.";
    passInput.select();
}

function showApp() {
    loginScreen.classList.add("hidden");
    appShell.classList.remove("hidden");
    errorMsg.textContent = "";

    if (!editorReady) {
        initializeEditor();
    } else {
        canvas.requestRenderAll();
    }
}

function initializeEditor() {
    editorReady = true;
    setTemplate(DEFAULT_TEMPLATE);
    updateActiveTemplateCard(DEFAULT_TEMPLATE);
}

function toggleSidebar() {
    sidebar.classList.toggle("is-open");
}

function closeSidebar() {
    sidebar.classList.remove("is-open");
}

function setTemplate(url, triggerButton) {
    currentTemplate = url;

    fabric.Image.fromURL(url, (img) => {
        const width = img.width;
        const height = img.height;
        const maxWidth = Math.max(viewport.clientWidth - 80, 260);
        const maxHeight = Math.max(window.innerHeight - 240, 360);
        const scale = Math.min(maxWidth / width, maxHeight / height, 1);

        canvas.setDimensions({
            width: Math.round(width * scale),
            height: Math.round(height * scale)
        });

        canvas.setBackgroundImage(img, () => canvas.renderAll(), {
            originX: "left",
            originY: "top",
            scaleX: canvas.getWidth() / width,
            scaleY: canvas.getHeight() / height,
            crossOrigin: "anonymous"
        });

        updateObjectHandleScale();
        extractColors(url);
        updateActiveTemplateCard(url, triggerButton);
        closeSidebar();
        saveHistory();
    }, { crossOrigin: "anonymous" });
}

function updateActiveTemplateCard(url, triggerButton) {
    document.querySelectorAll(".template-card").forEach((card) => {
        const isActive = triggerButton
            ? card === triggerButton
            : card.getAttribute("onclick").includes(url);
        card.classList.toggle("is-active", isActive);
    });
}

document.getElementById("upload").addEventListener("change", (event) => {
    const file = event.target.files[0];
    if (!file) {
        return;
    }

    const reader = new FileReader();
    reader.onload = (loadEvent) => {
        fabric.Image.fromURL(loadEvent.target.result, (img) => {
            img.scaleToWidth(Math.min(canvas.getWidth() * 0.34, 260));
            img.set({
                cornerColor: "#5fd4ff",
                cornerStyle: "circle",
                transparentCorners: false,
                borderColor: "#5fd4ff",
                cornerSize: 12
            });

            canvas.add(img);
            canvas.centerObject(img);
            canvas.setActiveObject(img);
            canvas.requestRenderAll();
            syncControlsWithSelection(img);
            saveHistory();
        });
    };

    reader.readAsDataURL(file);
    event.target.value = "";
});

function addText() {
    const text = new fabric.Textbox("Double tap to edit", {
        left: canvas.getWidth() / 2,
        top: canvas.getHeight() / 2,
        width: Math.min(canvas.getWidth() * 0.42, 320),
        fontSize: 36,
        fill: "#111111",
        fontFamily: "Manrope",
        textAlign: "center",
        originX: "center",
        cornerColor: "#5fd4ff",
        cornerStyle: "circle",
        cornerSize: 12
    });

    canvas.add(text);
    canvas.setActiveObject(text);
    canvas.requestRenderAll();
    syncControlsWithSelection(text);
    saveHistory();
    closeSidebar();
}

function changeFont(fontName) {
    const activeObject = canvas.getActiveObject();
    if (activeObject && activeObject.type === "textbox") {
        activeObject.set("fontFamily", fontName);
        canvas.requestRenderAll();
        saveHistory();
    }
}

canvas.on("selection:created", (event) => syncControlsWithSelection(event.selected[0]));
canvas.on("selection:updated", (event) => syncControlsWithSelection(event.selected[0]));
canvas.on("selection:cleared", () => {
    objControls.classList.add("hidden-panel");
});
canvas.on("object:modified", saveHistory);

function syncControlsWithSelection(activeObject) {
    if (!activeObject) {
        objControls.classList.add("hidden-panel");
        return;
    }

    objControls.classList.remove("hidden-panel");
    selectionType.textContent = activeObject.type === "textbox" ? "Text selected" : "Photo selected";
    fontGroup.style.display = activeObject.type === "textbox" ? "block" : "none";
    opacitySlider.value = activeObject.opacity ?? 1;
    opacityValue.textContent = `${Math.round((activeObject.opacity ?? 1) * 100)}%`;

    if (activeObject.type === "textbox") {
        fontFamily.value = activeObject.fontFamily || "Manrope";
        customColor.value = tinycolor(activeObject.fill || "#111111").toHexString();
    } else {
        customColor.value = "#ffffff";
    }
}

function saveHistory() {
    if (canvas.isUndoAction) {
        return;
    }

    undoStack.push(JSON.stringify(canvas));
    redoStack = [];
}

function undo() {
    if (undoStack.length <= 1) {
        return;
    }

    redoStack.push(undoStack.pop());
    canvas.isUndoAction = true;
    canvas.loadFromJSON(undoStack[undoStack.length - 1], () => {
        canvas.renderAll();
        canvas.isUndoAction = false;
        syncControlsWithSelection(canvas.getActiveObject());
    });
}

function redo() {
    if (!redoStack.length) {
        return;
    }

    const snapshot = redoStack.pop();
    undoStack.push(snapshot);
    canvas.isUndoAction = true;
    canvas.loadFromJSON(snapshot, () => {
        canvas.renderAll();
        canvas.isUndoAction = false;
        syncControlsWithSelection(canvas.getActiveObject());
    });
}

function deleteObj() {
    const activeObject = canvas.getActiveObject();
    if (!activeObject) {
        return;
    }

    canvas.remove(activeObject);
    canvas.discardActiveObject();
    canvas.renderAll();
    saveHistory();
    objControls.classList.add("hidden-panel");
}

function bringForward() {
    const activeObject = canvas.getActiveObject();
    if (!activeObject) {
        return;
    }

    canvas.bringForward(activeObject);
    canvas.renderAll();
    saveHistory();
}

function sendBackward() {
    const activeObject = canvas.getActiveObject();
    if (!activeObject) {
        return;
    }

    canvas.sendBackwards(activeObject);
    canvas.renderAll();
    saveHistory();
}

function changeOpacity(value) {
    const activeObject = canvas.getActiveObject();
    if (!activeObject) {
        return;
    }

    const nextOpacity = parseFloat(value);
    activeObject.set("opacity", nextOpacity);
    opacityValue.textContent = `${Math.round(nextOpacity * 100)}%`;
    canvas.renderAll();
}

opacitySlider.addEventListener("change", saveHistory);

customColor.addEventListener("input", (event) => {
    const activeObject = canvas.getActiveObject();
    if (!activeObject || activeObject.type !== "textbox") {
        return;
    }

    activeObject.set("fill", event.target.value);
    canvas.renderAll();
    saveHistory();
});

function extractColors(url) {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.src = url;

    image.onload = () => {
        const tempCanvas = document.createElement("canvas");
        const context = tempCanvas.getContext("2d");
        tempCanvas.width = 6;
        tempCanvas.height = 6;
        context.drawImage(image, 0, 0, 6, 6);
        const data = context.getImageData(0, 0, 6, 6).data;

        const colors = new Set(["#ffffff", "#111111", "#f4f7fb"]);
        for (let index = 0; index < data.length; index += 4) {
            colors.add(
                tinycolor({
                    r: data[index],
                    g: data[index + 1],
                    b: data[index + 2]
                }).toHexString()
            );
        }

        const palette = document.getElementById("palette");
        palette.innerHTML = "";
        Array.from(colors).slice(0, 12).forEach((color) => {
            const swatch = document.createElement("button");
            swatch.type = "button";
            swatch.className = "swatch";
            swatch.style.background = color;
            swatch.setAttribute("aria-label", `Use color ${color}`);
            swatch.onclick = () => {
                const activeObject = canvas.getActiveObject();
                if (activeObject && activeObject.type === "textbox") {
                    activeObject.set("fill", color);
                    customColor.value = tinycolor(color).toHexString();
                    canvas.renderAll();
                    saveHistory();
                }
            };
            palette.appendChild(swatch);
        });
    };
}

function downloadDesign() {
    canvas.discardActiveObject();
    canvas.renderAll();

    const link = document.createElement("a");
    link.href = canvas.toDataURL({ format: "png", quality: 1, multiplier: 2 });
    link.download = "FASCM-Studio.png";
    link.click();
}

async function shareDesign() {
    canvas.discardActiveObject();
    canvas.renderAll();

    try {
        const response = await fetch(canvas.toDataURL());
        const blob = await response.blob();
        const file = new File([blob], "design.png", { type: "image/png" });

        if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({ files: [file], title: "FASCM Studio Design" });
        }
    } catch (error) {
        console.error(error);
    }
}

function updateObjectHandleScale() {
    canvas.getObjects().forEach((object) => {
        object.set({
            cornerSize: 12,
            cornerColor: "#5fd4ff",
            cornerStyle: "circle",
            transparentCorners: false,
            borderColor: "#5fd4ff"
        });
    });
    canvas.renderAll();
}

window.addEventListener("resize", () => {
    closeSidebar();
});
