const ACCESS_CODE = "FASCM@2026";
const IS_FILE_PROTOCOL = window.location.protocol === "file:";
const STORAGE_KEYS = {
    auth: "fascm-auth",
    latestDesign: "fascm-latest-design",
    recentDesigns: "fascm-recent-designs"
};

const TEMPLATE_MANIFEST_PATH = "templates.json";
const BUILTIN_TEMPLATES = [
    { id: "tpl-1", name: "Royal Blue", src: "images/1.png", builtIn: true, category: "poster", presetId: "poster-square" },
    { id: "tpl-2", name: "Crystal Aqua", src: "images/2.png", builtIn: true, category: "poster", presetId: "poster-square" },
    { id: "tpl-3", name: "Black Gold", src: "images/3.png", builtIn: true, category: "poster", presetId: "poster-square" },
    { id: "tpl-4", name: "Classic Maroon", src: "images/4.png", builtIn: true, category: "poster", presetId: "poster-square" }
];
const DOCUMENT_PRESETS = [
    { id: "poster-square", label: "Poster", width: 1080, height: 1080, category: "poster" },
    { id: "certificate-landscape", label: "Certificate", width: 1600, height: 1130, category: "certificate" },
    { id: "invitation-portrait", label: "Invitation", width: 1080, height: 1350, category: "invitation" },
    { id: "ppt-widescreen", label: "PPT", width: 1600, height: 900, category: "ppt" },
    { id: "word-a4", label: "Word", width: 1240, height: 1754, category: "word" }
];
const MAX_TEMPLATE_SIDE = 1200;

let undoStack = [];
let redoStack = [];
let editorReady = false;
let canvas = null;
let currentTemplateId = BUILTIN_TEMPLATES[0].id;
let currentTemplateName = BUILTIN_TEMPLATES[0].name;
let templateCatalog = [];
let activePresetId = "poster-square";
let selectedTemplateCategory = "all";
let baseCanvasWidth = 1200;
let baseCanvasHeight = 1600;
let zoomLevel = 1;
let guidesVisible = true;
let guideObjects = [];
let cropState = null;
let autoSaveTimer = null;
let currentDesignId = `design-${Date.now()}`;
let uploadMode = "add";

patchCanvasBaselineValue();

const loginScreen = document.getElementById("login-screen");
const appShell = document.getElementById("app-shell");
const passInput = document.getElementById("passInput");
const loginBtn = document.getElementById("loginBtn");
const errorMsg = document.getElementById("error-msg");
const sidebar = document.getElementById("sidebar");
const viewport = document.getElementById("viewportArea");
const objControls = document.getElementById("objControls");
const selectionType = document.getElementById("selectionType");
const fontGroup = document.getElementById("fontGroup");
const textSizeGroup = document.getElementById("textSizeGroup");
const textStyleGroup = document.getElementById("textStyleGroup");
const alignGroup = document.getElementById("alignGroup");
const strokeGroup = document.getElementById("strokeGroup");
const shadowGroup = document.getElementById("shadowGroup");
const imageTools = document.getElementById("imageTools");
const cropActions = document.getElementById("cropActions");
const fontFamily = document.getElementById("fontFamily");
const fontSizeSlider = document.getElementById("fontSizeSlider");
const fontSizeNumber = document.getElementById("fontSizeNumber");
const boldBtn = document.getElementById("boldBtn");
const italicBtn = document.getElementById("italicBtn");
const alignButtons = Array.from(document.querySelectorAll(".align-btn"));
const strokeColor = document.getElementById("strokeColor");
const strokeWidth = document.getElementById("strokeWidth");
const shadowColor = document.getElementById("shadowColor");
const shadowBlur = document.getElementById("shadowBlur");
const opacitySlider = document.getElementById("opacitySlider");
const opacityValue = document.getElementById("opacityValue");
const customColor = document.getElementById("customColor");
const uploadInput = document.getElementById("upload");
const zoomSlider = document.getElementById("zoomSlider");
const zoomValue = document.getElementById("zoomValue");
const canvasWrapper = document.getElementById("canvas-wrapper");
const canvasStage = document.querySelector(".canvas-stage");
const topNav = document.querySelector(".top-nav");
const stageHeader = document.querySelector(".stage-header");
const stageTitle = document.getElementById("stageTitle");
const stageNote = document.querySelector(".stage-note");
const canvasStageMeta = document.querySelector(".canvas-stage-meta");
const templateGrid = document.getElementById("templateGrid");
const templateSection = document.getElementById("templateSection");
const templateFilterBar = document.getElementById("templateFilterBar");
const templateSectionNote = document.getElementById("templateSectionNote");
const layersList = document.getElementById("layersList");
const recentDesigns = document.getElementById("recentDesigns");
const activeTemplateName = document.getElementById("activeTemplateName");
const autosaveStatus = document.getElementById("autosaveStatus");
const lockBtn = document.getElementById("lockBtn");
const presetButtons = Array.from(document.querySelectorAll(".preset-card"));
const templateFilterButtons = Array.from(document.querySelectorAll(".filter-chip"));

document.addEventListener("DOMContentLoaded", () => {
    bindUiEvents();

    if (!hasRequiredLibraries()) {
        errorMsg.textContent = "Editor files failed to load. Refresh the page and check your internet connection.";
        return;
    }

    passInput.focus();
});

function bindUiEvents() {
    document.addEventListener("click", (event) => {
        if (window.innerWidth > 920 || !sidebar.classList.contains("is-open")) {
            return;
        }

        const clickedInsideSidebar = sidebar.contains(event.target);
        const clickedMenuButton = event.target.closest(".menu-toggle");
        if (!clickedInsideSidebar && !clickedMenuButton) {
            closeSidebar();
        }
    });

    document.addEventListener("keydown", handleGlobalShortcuts);

    passInput.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
            checkAuth();
        }
    });

    loginBtn.addEventListener("click", checkAuth);
    uploadInput.addEventListener("change", handleImageUpload);
    presetButtons.forEach((button) => {
        button.addEventListener("click", () => applyDocumentPreset(button.dataset.presetId));
    });
    templateFilterButtons.forEach((button) => {
        button.addEventListener("click", () => {
            selectedTemplateCategory = button.dataset.category;
            updateActiveTemplateFilter();
            renderTemplateGallery();
        });
    });

    fontFamily.addEventListener("change", () => updateTextStyles());
    fontSizeSlider.addEventListener("input", () => {
        fontSizeNumber.value = fontSizeSlider.value;
        updateTextStyles();
    });
    fontSizeNumber.addEventListener("input", () => {
        fontSizeSlider.value = fontSizeNumber.value;
        updateTextStyles();
    });
    boldBtn.addEventListener("click", toggleBold);
    italicBtn.addEventListener("click", toggleItalic);
    alignButtons.forEach((button) => {
        button.addEventListener("click", () => setTextAlign(button.dataset.align));
    });
    strokeColor.addEventListener("input", updateTextStyles);
    strokeWidth.addEventListener("input", updateTextStyles);
    shadowColor.addEventListener("input", updateTextStyles);
    shadowBlur.addEventListener("input", updateTextStyles);
    opacitySlider.addEventListener("input", () => changeOpacity(opacitySlider.value));
    opacitySlider.addEventListener("change", () => saveHistory());
    customColor.addEventListener("input", applyCustomColor);
    zoomSlider.addEventListener("input", () => setZoom(parseFloat(zoomSlider.value)));
}

function handleGlobalShortcuts(event) {
    const activeTag = document.activeElement?.tagName;
    const isTypingContext = activeTag === "INPUT" || activeTag === "TEXTAREA" || document.activeElement?.isContentEditable;
    const activeObject = canvas?.getActiveObject();

    if (event.key === "Escape" && cropState) {
        event.preventDefault();
        cancelCrop();
        return;
    }

    if (isTypingContext) {
        return;
    }

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "d") {
        event.preventDefault();
        duplicateObj();
        return;
    }

    if ((event.ctrlKey || event.metaKey) && event.key === "0") {
        event.preventDefault();
        fitCanvasToStage();
        return;
    }

    if ((event.key === "Delete" || event.key === "Backspace") && activeObject && activeObject.type !== "textbox") {
        event.preventDefault();
        deleteObj();
    }
}

function hasRequiredLibraries() {
    return Boolean(window.fabric && window.tinycolor);
}

function patchCanvasBaselineValue() {
    try {
        const descriptor = Object.getOwnPropertyDescriptor(CanvasRenderingContext2D.prototype, "textBaseline");
        if (!descriptor?.set || descriptor.set.__fascmPatched) {
            return;
        }

        const originalSetter = descriptor.set;
        const patchedSetter = function patchedTextBaseline(value) {
            originalSetter.call(this, value === "alphabetical" ? "alphabetic" : value);
        };
        patchedSetter.__fascmPatched = true;

        Object.defineProperty(CanvasRenderingContext2D.prototype, "textBaseline", {
            configurable: true,
            enumerable: descriptor.enumerable,
            get: descriptor.get,
            set: patchedSetter
        });
    } catch (error) {
        console.warn(error);
    }
}

function checkAuth() {
    errorMsg.textContent = "Checking access...";

    if (passInput.value.trim() === ACCESS_CODE) {
        showApp();
        return;
    }

    errorMsg.textContent = "Incorrect access code.";
    passInput.select();
}

function showApp() {
    if (!hasRequiredLibraries()) {
        errorMsg.textContent = "Editor libraries are missing. Refresh and make sure internet is available.";
        return;
    }

    loginScreen.classList.add("hidden");
    appShell.classList.remove("hidden");
    errorMsg.textContent = "";

    initializeCanvas();

    if (!editorReady) {
        initializeEditor();
    } else {
        canvas.requestRenderAll();
    }
}

function initializeCanvas() {
    if (canvas || !hasRequiredLibraries()) {
        return;
    }

    canvas = new fabric.Canvas("mainCanvas", {
        preserveObjectStacking: true,
        backgroundColor: "#ffffff",
        selectionColor: "rgba(42, 169, 214, 0.16)",
        selectionLineWidth: 1,
        enableRetinaScaling: true,
        imageSmoothingEnabled: true
    });

    canvas.on("selection:created", (event) => syncControlsWithSelection(event.selected?.[0]));
    canvas.on("selection:updated", (event) => syncControlsWithSelection(event.selected?.[0]));
    canvas.on("selection:cleared", () => {
        if (!cropState) {
            objControls.classList.add("hidden-panel");
        }
    });
    canvas.on("object:modified", () => {
        if (cropState) {
            constrainCropFrame();
        }
        updateLayersList();
        saveHistory();
    });
    canvas.on("object:added", (event) => {
        if (!event.target || event.target.studioRole === "guide" || event.target.studioRole === "crop-frame") {
            return;
        }
        ensureObjectAppearance(event.target);
        updateLayersList();
    });
    canvas.on("object:removed", () => updateLayersList());
    canvas.on("object:moving", (event) => {
        if (!event.target) {
            return;
        }
        if (event.target.studioRole === "crop-frame") {
            constrainCropFrame();
            return;
        }
        snapObject(event.target);
    });
    canvas.on("object:scaling", (event) => {
        if (event.target?.studioRole === "crop-frame") {
            constrainCropFrame(true);
        }
    });
}

async function initializeEditor() {
    editorReady = true;
    templateCatalog = await loadTemplateCatalog();
    if (!templateCatalog.length) {
        templateCatalog = [...BUILTIN_TEMPLATES];
    }
    renderTemplateGallery();
    renderRecentDesigns();
    updateActivePresetUi();
    updateActiveTemplateFilter();
    renderPalette(getDefaultPaletteColors());

    const restored = loadLatestDesign();
    if (!restored) {
        setTemplate(BUILTIN_TEMPLATES[0].id);
    }
}

async function loadTemplateCatalog() {
    if (IS_FILE_PROTOCOL) {
        return [...BUILTIN_TEMPLATES];
    }

    try {
        const response = await fetch(TEMPLATE_MANIFEST_PATH, { cache: "no-store" });
        if (!response.ok) {
            throw new Error(`Template manifest load failed: ${response.status}`);
        }

        const manifest = await response.json();
        if (!Array.isArray(manifest)) {
            throw new Error("Template manifest is not an array.");
        }

        return manifest.map((template, index) => normalizeTemplateEntry(template, index));
    } catch (error) {
        console.warn(error);
        return [...BUILTIN_TEMPLATES];
    }
}

function normalizeTemplateEntry(template, index) {
    return {
        id: template.id || `manifest-template-${index + 1}`,
        name: template.name || `Template ${index + 1}`,
        src: template.src,
        builtIn: template.builtIn ?? true,
        category: template.category || "poster",
        presetId: template.presetId || "poster-square"
    };
}

function renderTemplateGallery() {
    templateGrid.innerHTML = "";

    const posterMode = activePresetId === "poster-square";
    templateSectionNote.classList.toggle("hidden", posterMode);
    templateGrid.classList.toggle("hidden", !posterMode);
    templateFilterBar.classList.toggle("hidden", !posterMode);

    if (!posterMode) {
        templateGrid.innerHTML = "";
        return;
    }

    const visibleTemplates = templateCatalog.filter((template) => {
        return (selectedTemplateCategory === "all" || template.category === selectedTemplateCategory) && template.category === "poster";
    });

    if (!visibleTemplates.length) {
        templateGrid.innerHTML = '<p class="empty-copy">No templates for this format yet. Add it in <code>templates.json</code> and refresh.</p>';
        return;
    }

    visibleTemplates.forEach((template) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "template-card";
        button.dataset.templateId = template.id;
        button.innerHTML = `
            <img src="${template.src}" class="thumb" alt="${template.name}">
            <span>${template.name}</span>
        `;
        button.addEventListener("click", () => setTemplate(template.id, button));
        templateGrid.appendChild(button);
    });

    updateActiveTemplateCard(currentTemplateId);
}

function updateActivePresetUi() {
    presetButtons.forEach((button) => {
        button.classList.toggle("is-active", button.dataset.presetId === activePresetId);
    });
}

function updateActiveTemplateFilter() {
    templateFilterButtons.forEach((button) => {
        button.classList.toggle("is-active", button.dataset.category === selectedTemplateCategory);
    });
}

function updateActiveTemplateCard(templateId, triggerButton) {
    document.querySelectorAll(".template-card").forEach((card) => {
        const isActive = triggerButton ? card === triggerButton : card.dataset.templateId === templateId;
        card.classList.toggle("is-active", isActive);
    });
}

function setTemplate(templateId, triggerButton) {
    if (!canvas) {
        return;
    }

    const template = templateCatalog.find((item) => item.id === templateId);
    if (!template) {
        return;
    }

    cancelCrop(true);
    currentTemplateId = template.id;
    currentTemplateName = template.name;
    activePresetId = template.presetId || activePresetId;
    selectedTemplateCategory = template.category || selectedTemplateCategory;
    activeTemplateName.textContent = template.name;
    updateStageCopy();
    setAutosaveStatus("Loading template...");
    updateActivePresetUi();
    updateActiveTemplateFilter();

    const imageOptions = IS_FILE_PROTOCOL ? {} : { crossOrigin: "anonymous" };
    fabric.Image.fromURL(template.src, (img) => {
        if (!img) {
            errorMsg.textContent = "Template image could not be loaded.";
            setAutosaveStatus("Template load failed");
            return;
        }

        canvas.clear();
        guideObjects = [];
        canvas.backgroundColor = "#ffffff";

        const preset = getPresetById(activePresetId);
        const normalizedSize = preset
            ? getNormalizedCanvasSize(preset.width, preset.height)
            : getNormalizedCanvasSize(img.width, img.height);
        baseCanvasWidth = normalizedSize.width;
        baseCanvasHeight = normalizedSize.height;
        canvas.setDimensions({
            width: baseCanvasWidth,
            height: baseCanvasHeight
        });

        const backgroundScale = Math.max(baseCanvasWidth / img.width, baseCanvasHeight / img.height);
        canvas.setBackgroundImage(img, () => {
            canvas.requestRenderAll();
        }, {
            left: 0,
            top: 0,
            originX: "left",
            originY: "top",
            scaleX: backgroundScale,
            scaleY: backgroundScale,
            selectable: false,
            evented: false
        });

        refreshGuides();
        if (IS_FILE_PROTOCOL) {
            renderPalette(getDefaultPaletteColors(template.category));
        } else {
            extractColors(template.src);
        }
        updateActiveTemplateCard(template.id, triggerButton);
        fitCanvasToStage();
        resetStagePosition();
        closeSidebar();
        resetHistory();
        saveHistory();
    }, imageOptions);
}

function prepareReplaceUpload() {
    uploadMode = "replace";
    uploadInput.click();
}

function handleImageUpload(event) {
    if (!canvas) {
        return;
    }

    const file = event.target.files?.[0];
    if (!file) {
        uploadMode = "add";
        return;
    }

    const reader = new FileReader();
    reader.onload = (loadEvent) => {
        fabric.Image.fromURL(loadEvent.target.result, (img) => {
            if (!img) {
                return;
            }

            if (uploadMode === "replace") {
                replaceSelectedImage(img);
            } else {
                addImageToCanvas(img, file.name);
            }

            uploadMode = "add";
            event.target.value = "";
        });
    };

    reader.readAsDataURL(file);
}

function addImageToCanvas(img, name = "Photo") {
    const targetWidth = Math.min(baseCanvasWidth * 0.34, 460);
    img.scaleToWidth(targetWidth);
    ensureObjectAppearance(img);
    ensureObjectMeta(img, name);
    img.set({
        left: (baseCanvasWidth - img.getScaledWidth()) / 2,
        top: (baseCanvasHeight - img.getScaledHeight()) / 2
    });

    canvas.add(img);
    canvas.setActiveObject(img);
    canvas.requestRenderAll();
    syncControlsWithSelection(img);
    saveHistory();
    closeSidebar();
}

function replaceSelectedImage(newImage) {
    const activeObject = canvas.getActiveObject();
    if (!activeObject || activeObject.type !== "image") {
        addImageToCanvas(newImage, "Photo");
        return;
    }

    const originalName = activeObject.studioName || "Photo";
    const width = activeObject.getScaledWidth();
    const left = activeObject.left;
    const top = activeObject.top;
    const angle = activeObject.angle;
    const opacity = activeObject.opacity;

    canvas.remove(activeObject);
    newImage.scaleToWidth(width);
    ensureObjectAppearance(newImage);
    ensureObjectMeta(newImage, originalName);
    newImage.set({ left, top, angle, opacity });
    canvas.add(newImage);
    canvas.setActiveObject(newImage);
    canvas.requestRenderAll();
    syncControlsWithSelection(newImage);
    saveHistory();
}

function addText() {
    if (!canvas) {
        return;
    }

    const text = createTextbox("Double tap to edit", {
        left: baseCanvasWidth / 2,
        top: baseCanvasHeight / 2,
        width: Math.min(baseCanvasWidth * 0.42, 420),
        fontSize: 40
    });

    addCanvasObject(text, "Text");
}

function addCanvasObject(object, name = "Layer", options = {}) {
    if (!canvas || !object) {
        return null;
    }

    const {
        activate = true,
        persist = true,
        closeTools = true
    } = options;

    ensureObjectAppearance(object);
    ensureObjectMeta(object, name);
    canvas.add(object);

    if (activate) {
        canvas.setActiveObject(object);
        syncControlsWithSelection(object);
    }

    canvas.requestRenderAll();

    if (persist) {
        saveHistory();
    }

    if (closeTools) {
        closeSidebar();
    }

    return object;
}

function createTextbox(text, config = {}) {
    const textStyle = getDefaultTextStyle();
    return new fabric.Textbox(text, {
        left: baseCanvasWidth / 2,
        top: baseCanvasHeight / 2,
        width: Math.min(baseCanvasWidth * 0.42, 420),
        fontSize: 40,
        fill: textStyle.fill,
        fontFamily: "Manrope",
        textAlign: "center",
        fontWeight: "700",
        originX: "center",
        stroke: textStyle.stroke,
        strokeWidth: textStyle.strokeWidth,
        shadow: textStyle.shadow,
        ...config
    });
}

function addShape(type) {
    if (!canvas) {
        return;
    }

    const hasArtworkBackground = Boolean(canvas.backgroundImage);
    const centerLeft = baseCanvasWidth / 2;
    const centerTop = baseCanvasHeight / 2;
    const panelFill = hasArtworkBackground ? "rgba(255, 255, 255, 0.16)" : "rgba(42, 169, 214, 0.12)";
    const panelStroke = hasArtworkBackground ? "rgba(255, 255, 255, 0.58)" : "rgba(42, 169, 214, 0.42)";
    const shapeShadow = new fabric.Shadow({
        color: hasArtworkBackground ? "rgba(15, 23, 42, 0.22)" : "rgba(79, 125, 245, 0.12)",
        blur: 14,
        offsetX: 0,
        offsetY: 6
    });

    let shape = null;
    let label = "Shape";

    if (type === "rect") {
        label = "Rectangle";
        shape = new fabric.Rect({
            left: centerLeft,
            top: centerTop,
            originX: "center",
            originY: "center",
            width: Math.min(baseCanvasWidth * 0.34, 420),
            height: Math.min(baseCanvasHeight * 0.14, 150),
            rx: 18,
            ry: 18,
            fill: panelFill,
            stroke: panelStroke,
            strokeWidth: 2,
            shadow: shapeShadow
        });
    } else if (type === "circle") {
        label = "Circle";
        shape = new fabric.Circle({
            left: centerLeft,
            top: centerTop,
            originX: "center",
            originY: "center",
            radius: Math.min(baseCanvasWidth, baseCanvasHeight) * 0.09,
            fill: panelFill,
            stroke: panelStroke,
            strokeWidth: 2,
            shadow: shapeShadow
        });
    } else if (type === "line") {
        label = "Line";
        shape = new fabric.Line([-180, 0, 180, 0], {
            left: centerLeft,
            top: centerTop,
            originX: "center",
            originY: "center",
            stroke: panelStroke,
            strokeWidth: 6
        });
    } else if (type === "panel") {
        label = "Panel";
        shape = new fabric.Rect({
            left: centerLeft,
            top: centerTop,
            originX: "center",
            originY: "center",
            width: Math.min(baseCanvasWidth * 0.72, 780),
            height: Math.min(baseCanvasHeight * 0.28, 320),
            rx: 26,
            ry: 26,
            fill: hasArtworkBackground ? "rgba(255, 255, 255, 0.12)" : "#ffffff",
            stroke: panelStroke,
            strokeWidth: 2,
            shadow: shapeShadow
        });
    }

    if (!shape) {
        return;
    }

    addCanvasObject(shape, label);
}

function addTitleBlock(options = {}) {
    if (!canvas) {
        return;
    }

    const preset = getPresetById(activePresetId);
    const config = getTitleBlockConfig(preset, options);
    const text = createTextbox(config.text, config.props);
    addCanvasObject(text, config.name || "Title", config.options);
}

function addDetailsBlock(options = {}) {
    if (!canvas) {
        return;
    }

    const preset = getPresetById(activePresetId);
    const config = getDetailsBlockConfig(preset, options);
    const text = createTextbox(config.text, config.props);
    addCanvasObject(text, config.name || "Details", config.options);
}

function addContentPanel(options = {}) {
    if (!canvas) {
        return;
    }

    const preset = getPresetById(activePresetId);
    const hasArtworkBackground = Boolean(canvas.backgroundImage);
    const width = options.width || Math.min(baseCanvasWidth * (preset.id === "poster-square" ? 0.72 : 0.82), 860);
    const height = options.height || Math.min(baseCanvasHeight * (preset.id === "poster-square" ? 0.2 : 0.26), 340);
    const panel = new fabric.Rect({
        left: options.left || baseCanvasWidth / 2,
        top: options.top || (preset.id === "poster-square" ? baseCanvasHeight * 0.62 : baseCanvasHeight * 0.54),
        originX: options.originX || "center",
        originY: options.originY || "center",
        width,
        height,
        rx: 28,
        ry: 28,
        fill: options.fill || (hasArtworkBackground ? "rgba(255, 255, 255, 0.12)" : "#ffffff"),
        stroke: options.stroke || (hasArtworkBackground ? "rgba(255, 255, 255, 0.52)" : "rgba(24, 35, 54, 0.12)"),
        strokeWidth: options.strokeWidth ?? 2,
        shadow: options.shadow ?? new fabric.Shadow({
            color: hasArtworkBackground ? "rgba(15, 23, 42, 0.22)" : "rgba(79, 125, 245, 0.1)",
            blur: 16,
            offsetX: 0,
            offsetY: 8
        })
    });

    addCanvasObject(panel, options.name || "Content Panel", options.options);
}

function insertSmartStarter() {
    if (!canvas) {
        return;
    }

    if (activePresetId === "certificate-landscape") {
        addCertificateFields();
        return;
    }

    if (activePresetId === "poster-square") {
        addTitleBlock({
            text: "Annual Tech Symposium 2026",
            top: baseCanvasHeight * 0.34,
            width: baseCanvasWidth * 0.7,
            fontSize: Math.round(baseCanvasWidth * 0.06),
            persist: false,
            activate: false,
            closeTools: false
        });
        addContentPanel({
            top: baseCanvasHeight * 0.64,
            width: baseCanvasWidth * 0.72,
            height: baseCanvasHeight * 0.2,
            persist: false,
            activate: false,
            closeTools: false
        });
        addDetailsBlock({
            text: "Date: 25 March 2026\nTime: 10:00 AM\nVenue: Main Hall, Coimbatore",
            top: baseCanvasHeight * 0.64,
            width: baseCanvasWidth * 0.58,
            fontSize: Math.round(baseCanvasWidth * 0.03),
            persist: true,
            activate: true,
            closeTools: true
        });
        return;
    }

    if (activePresetId === "invitation-portrait") {
        addTitleBlock({
            text: "You're Invited",
            persist: false,
            activate: false,
            closeTools: false
        });
        addDetailsBlock({
            text: "Join us for a special celebration\nFriday, 28 March 2026\n6:30 PM\nGrand Hall, Coimbatore\nRSVP: 98765 43210",
            persist: true,
            activate: true,
            closeTools: true
        });
        return;
    }

    if (activePresetId === "ppt-widescreen") {
        addTitleBlock({
            text: "Quarterly Review",
            persist: false,
            activate: false,
            closeTools: false
        });
        addDetailsBlock({
            text: "Key updates\n• Growth highlights\n• Team progress\n• Next quarter priorities",
            persist: true,
            activate: true,
            closeTools: true
        });
        return;
    }

    addTitleBlock({
        text: "Document Heading",
        persist: false,
        activate: false,
        closeTools: false
    });
    addDetailsBlock({
        text: "This blank editable board is ready for long-form content, notices, reports, and formatted writeups.",
        persist: true,
        activate: true,
        closeTools: true
    });
}

function addCertificateFields() {
    if (!canvas) {
        return;
    }

    addTitleBlock({
        text: "Certificate of Achievement",
        persist: false,
        activate: false,
        closeTools: false
    });
    addDetailsBlock({
        text: "This certificate is proudly presented to",
        top: baseCanvasHeight * 0.34,
        fontSize: 26,
        persist: false,
        activate: false,
        closeTools: false
    });

    const recipientName = createTextbox("Recipient Name", {
        left: baseCanvasWidth / 2,
        top: baseCanvasHeight * 0.46,
        width: Math.min(baseCanvasWidth * 0.62, 780),
        fontSize: 58,
        fontFamily: "Times New Roman",
        fontWeight: "700",
        textAlign: "center",
        originX: "center",
        fill: "#182336",
        stroke: null,
        strokeWidth: 0,
        shadow: null
    });
    addCanvasObject(recipientName, "Recipient Name", {
        persist: false,
        activate: false,
        closeTools: false
    });

    addDetailsBlock({
        text: "for outstanding performance and contribution.\nAwarded on 25 March 2026.",
        top: baseCanvasHeight * 0.58,
        fontSize: 24,
        persist: false,
        activate: false,
        closeTools: false
    });

    addSignatureField(baseCanvasWidth * 0.28, baseCanvasHeight * 0.82, "Coordinator");
    addSignatureField(baseCanvasWidth * 0.72, baseCanvasHeight * 0.82, "Principal", true);
    closeSidebar();
}

function addSignatureField(left, top, label, persist = false) {
    const line = new fabric.Line([-120, 0, 120, 0], {
        left,
        top,
        originX: "center",
        originY: "center",
        stroke: "rgba(24, 35, 54, 0.5)",
        strokeWidth: 2
    });
    const title = createTextbox(label, {
        left,
        top: top + 34,
        width: 220,
        fontSize: 20,
        fontWeight: "600",
        fill: "#182336",
        stroke: null,
        strokeWidth: 0,
        shadow: null,
        originX: "center",
        textAlign: "center"
    });

    addCanvasObject(line, `${label} Line`, {
        persist: false,
        activate: false,
        closeTools: false
    });
    addCanvasObject(title, label, {
        persist,
        activate: persist,
        closeTools: false
    });
}

function getTitleBlockConfig(preset, options = {}) {
    const defaults = {
        "poster-square": {
            text: "Event Title",
            name: "Title",
            props: {
                left: baseCanvasWidth / 2,
                top: baseCanvasHeight * 0.34,
                width: Math.min(baseCanvasWidth * 0.72, 760),
                fontSize: Math.round(baseCanvasWidth * 0.06),
                fontFamily: "Montserrat",
                textAlign: "center",
                originX: "center"
            }
        },
        "certificate-landscape": {
            text: "Certificate of Achievement",
            name: "Certificate Title",
            props: {
                left: baseCanvasWidth / 2,
                top: baseCanvasHeight * 0.2,
                width: Math.min(baseCanvasWidth * 0.74, 900),
                fontSize: 68,
                fontFamily: "Times New Roman",
                textAlign: "center",
                originX: "center",
                fill: "#182336",
                stroke: null,
                strokeWidth: 0,
                shadow: null
            }
        },
        "invitation-portrait": {
            text: "You're Invited",
            name: "Invitation Title",
            props: {
                left: baseCanvasWidth / 2,
                top: baseCanvasHeight * 0.18,
                width: Math.min(baseCanvasWidth * 0.74, 720),
                fontSize: 62,
                fontFamily: "Playfair Display",
                textAlign: "center",
                originX: "center",
                fill: "#182336",
                stroke: null,
                strokeWidth: 0,
                shadow: null
            }
        },
        "ppt-widescreen": {
            text: "Presentation Title",
            name: "Slide Title",
            props: {
                left: 96,
                top: 110,
                width: baseCanvasWidth - 192,
                fontSize: 60,
                fontFamily: "Manrope",
                textAlign: "left",
                originX: "left",
                fill: "#182336",
                stroke: null,
                strokeWidth: 0,
                shadow: null
            }
        },
        "word-a4": {
            text: "Document Heading",
            name: "Heading",
            props: {
                left: 86,
                top: 120,
                width: baseCanvasWidth - 172,
                fontSize: 42,
                fontFamily: "Times New Roman",
                textAlign: "left",
                originX: "left",
                fill: "#182336",
                stroke: null,
                strokeWidth: 0,
                shadow: null
            }
        }
    };

    const config = defaults[preset.id] || defaults["poster-square"];
    return {
        text: options.text || config.text,
        name: config.name,
        props: {
            ...config.props,
            ...(typeof options.left === "number" ? { left: options.left } : {}),
            ...(typeof options.top === "number" ? { top: options.top } : {}),
            ...(typeof options.width === "number" ? { width: options.width } : {}),
            ...(typeof options.fontSize === "number" ? { fontSize: options.fontSize } : {})
        },
        options: {
            activate: options.activate ?? true,
            persist: options.persist ?? true,
            closeTools: options.closeTools ?? true
        }
    };
}

function getDetailsBlockConfig(preset, options = {}) {
    const defaults = {
        "poster-square": {
            text: "Date: 25 March 2026\nTime: 10:00 AM\nVenue: Main Hall",
            name: "Details",
            props: {
                left: baseCanvasWidth / 2,
                top: baseCanvasHeight * 0.64,
                width: Math.min(baseCanvasWidth * 0.56, 620),
                fontSize: 32,
                fontFamily: "Poppins",
                textAlign: "center",
                originX: "center"
            }
        },
        "certificate-landscape": {
            text: "Presented in recognition of dedication, excellence, and achievement.",
            name: "Certificate Body",
            props: {
                left: baseCanvasWidth / 2,
                top: baseCanvasHeight * 0.6,
                width: Math.min(baseCanvasWidth * 0.6, 760),
                fontSize: 24,
                fontFamily: "Lora",
                textAlign: "center",
                originX: "center",
                fill: "#182336",
                stroke: null,
                strokeWidth: 0,
                shadow: null
            }
        },
        "invitation-portrait": {
            text: "Date\nTime\nVenue\nRSVP",
            name: "Invitation Details",
            props: {
                left: baseCanvasWidth / 2,
                top: baseCanvasHeight * 0.46,
                width: Math.min(baseCanvasWidth * 0.7, 700),
                fontSize: 30,
                fontFamily: "Poppins",
                textAlign: "center",
                originX: "center",
                fill: "#182336",
                stroke: null,
                strokeWidth: 0,
                shadow: null
            }
        },
        "ppt-widescreen": {
            text: "• Key point one\n• Key point two\n• Key point three",
            name: "Slide Details",
            props: {
                left: 100,
                top: 250,
                width: baseCanvasWidth - 200,
                fontSize: 32,
                fontFamily: "Plus Jakarta Sans",
                textAlign: "left",
                originX: "left",
                fill: "#304056",
                stroke: null,
                strokeWidth: 0,
                shadow: null
            }
        },
        "word-a4": {
            text: "Start typing your paragraph here. Use this board for notices, reports, writeups, and formatted text layouts.",
            name: "Paragraph",
            props: {
                left: 90,
                top: 220,
                width: baseCanvasWidth - 180,
                fontSize: 24,
                fontFamily: "Times New Roman",
                textAlign: "left",
                originX: "left",
                fill: "#304056",
                stroke: null,
                strokeWidth: 0,
                shadow: null
            }
        }
    };

    const config = defaults[preset.id] || defaults["poster-square"];
    return {
        text: options.text || config.text,
        name: config.name,
        props: {
            ...config.props,
            ...(typeof options.left === "number" ? { left: options.left } : {}),
            ...(typeof options.top === "number" ? { top: options.top } : {}),
            ...(typeof options.width === "number" ? { width: options.width } : {}),
            ...(typeof options.fontSize === "number" ? { fontSize: options.fontSize } : {})
        },
        options: {
            activate: options.activate ?? true,
            persist: options.persist ?? true,
            closeTools: options.closeTools ?? true
        }
    };
}

function ensureObjectAppearance(object) {
    object.set({
        cornerColor: "#2aa9d6",
        cornerStyle: "circle",
        transparentCorners: false,
        borderColor: "#2aa9d6",
        cornerSize: 12
    });
}

function ensureObjectMeta(object, fallbackName = "Layer") {
    if (!object.studioId) {
        object.studioId = `obj-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    }
    if (!object.studioName) {
        object.studioName = fallbackName;
    }
}

function getDefaultTextStyle() {
    const hasArtworkBackground = Boolean(canvas?.backgroundImage);
    if (!hasArtworkBackground) {
        return {
            fill: "#182336",
            stroke: null,
            strokeWidth: 0,
            shadow: null
        };
    }

    return {
        fill: "#fffdf7",
        stroke: "rgba(24, 35, 54, 0.85)",
        strokeWidth: 1.2,
        shadow: new fabric.Shadow({
            color: "rgba(24, 35, 54, 0.35)",
            blur: 10,
            offsetX: 0,
            offsetY: 4
        })
    };
}

function getPresetById(presetId) {
    return DOCUMENT_PRESETS.find((preset) => preset.id === presetId) || DOCUMENT_PRESETS[0];
}

function applyDocumentPreset(presetId) {
    const preset = getPresetById(presetId);
    if (!preset || !canvas) {
        activePresetId = presetId;
        updateActivePresetUi();
        return;
    }

    cancelCrop(true);
    activePresetId = preset.id;
    selectedTemplateCategory = preset.category;
    updateActivePresetUi();
    updateActiveTemplateFilter();
    renderTemplateGallery();

    const normalizedSize = getNormalizedCanvasSize(preset.width, preset.height);
    resizeCanvasWorkspace(normalizedSize.width, normalizedSize.height);
    currentTemplateId = "";
    currentTemplateName = preset.label;
    activeTemplateName.textContent = `${preset.label} Layout`;
    canvas.setBackgroundImage(null, canvas.requestRenderAll.bind(canvas));
    canvas.backgroundColor = "#ffffff";
    renderPalette(getDefaultPaletteColors(preset.category));
    updateStageCopy();
    fitCanvasToStage();
    resetStagePosition();
    saveHistory();
}

function getNormalizedCanvasSize(width, height) {
    const longestSide = Math.max(width, height);
    if (!longestSide || longestSide <= MAX_TEMPLATE_SIDE) {
        return { width, height };
    }

    const scale = MAX_TEMPLATE_SIDE / longestSide;
    return {
        width: Math.round(width * scale),
        height: Math.round(height * scale)
    };
}

function updateStageCopy() {
    const preset = getPresetById(activePresetId);
    if (stageTitle) {
        stageTitle.textContent = `${preset.label} Stage`;
    }

    if (!stageNote) {
        return;
    }

    const copyByPreset = {
        "poster-square": "Use poster templates, shapes, photo crop, and starter blocks to design event posters quickly.",
        "certificate-landscape": "Build editable certificates with title, recipient, body copy, and signature fields from one board.",
        "invitation-portrait": "Create invitation layouts with elegant headings, details, RSVP blocks, and editable photos.",
        "ppt-widescreen": "Design slide-style boards for presentations with titles, bullet points, panels, and images.",
        "word-a4": "Use this long-form board for notices, reports, content pages, and document-style layouts."
    };

    stageNote.textContent = copyByPreset[preset.id] || copyByPreset["poster-square"];
}

function resizeCanvasWorkspace(nextWidth, nextHeight) {
    if (!canvas) {
        return;
    }

    const currentWidth = baseCanvasWidth || canvas.getWidth();
    const currentHeight = baseCanvasHeight || canvas.getHeight();
    const scaleX = nextWidth / currentWidth;
    const scaleY = nextHeight / currentHeight;

    getEditableObjects().forEach((object) => {
        object.set({
            left: (object.left || 0) * scaleX,
            top: (object.top || 0) * scaleY,
            scaleX: (object.scaleX || 1) * scaleX,
            scaleY: (object.scaleY || 1) * scaleY
        });

        if (object.type === "textbox") {
            object.set({
                width: (object.width || 0) * scaleX,
                fontSize: (object.fontSize || 40) * Math.min(scaleX, scaleY),
                strokeWidth: (object.strokeWidth || 0) * Math.min(scaleX, scaleY)
            });
            if (object.shadow) {
                object.shadow.blur *= Math.min(scaleX, scaleY);
                object.shadow.offsetX *= scaleX;
                object.shadow.offsetY *= scaleY;
            }
        }

        object.setCoords();
    });

    if (canvas.backgroundImage) {
        const bg = canvas.backgroundImage;
        const bgScale = Math.max(nextWidth / bg.width, nextHeight / bg.height);
        bg.set({
            left: 0,
            top: 0,
            originX: "left",
            originY: "top",
            scaleX: bgScale,
            scaleY: bgScale
        });
        bg.setCoords();
    }

    baseCanvasWidth = nextWidth;
    baseCanvasHeight = nextHeight;
    canvas.setDimensions({ width: nextWidth, height: nextHeight });
    refreshGuides();
    canvas.requestRenderAll();
}

function normalizeLoadedCanvasState() {
    if (!canvas) {
        return;
    }

    const currentWidth = canvas.getWidth();
    const currentHeight = canvas.getHeight();
    const normalizedSize = getNormalizedCanvasSize(currentWidth, currentHeight);
    if (normalizedSize.width === currentWidth && normalizedSize.height === currentHeight) {
        return;
    }

    const scaleX = normalizedSize.width / currentWidth;
    const scaleY = normalizedSize.height / currentHeight;

    canvas.getObjects().forEach((object) => {
        object.set({
            left: (object.left || 0) * scaleX,
            top: (object.top || 0) * scaleY,
            scaleX: (object.scaleX || 1) * scaleX,
            scaleY: (object.scaleY || 1) * scaleY
        });

        if (object.type === "textbox") {
            object.set({
                width: (object.width || 0) * scaleX,
                fontSize: (object.fontSize || 40) * scaleY,
                strokeWidth: (object.strokeWidth || 0) * Math.min(scaleX, scaleY)
            });
            if (object.shadow) {
                object.shadow.blur *= Math.min(scaleX, scaleY);
                object.shadow.offsetX *= scaleX;
                object.shadow.offsetY *= scaleY;
            }
        }

        object.setCoords();
    });

    if (canvas.backgroundImage) {
        canvas.backgroundImage.scaleX *= scaleX;
        canvas.backgroundImage.scaleY *= scaleY;
        canvas.backgroundImage.set({
            left: 0,
            top: 0,
            originX: "left",
            originY: "top"
        });
        canvas.backgroundImage.setCoords();
    }

    canvas.setDimensions({
        width: normalizedSize.width,
        height: normalizedSize.height
    });
}

function updateTextStyles() {
    const activeObject = canvas?.getActiveObject();
    if (!activeObject || activeObject.type !== "textbox") {
        return;
    }

    const nextFontSize = clampNumber(parseInt(fontSizeSlider.value, 10) || 40, 14, 140);
    fontSizeSlider.value = nextFontSize;
    fontSizeNumber.value = nextFontSize;
    activeObject.set({
        fontFamily: fontFamily.value,
        fontSize: nextFontSize,
        stroke: strokeWidth.value > 0 ? strokeColor.value : null,
        strokeWidth: parseFloat(strokeWidth.value),
        shadow: parseFloat(shadowBlur.value) > 0 ? new fabric.Shadow({
            color: shadowColor.value,
            blur: parseFloat(shadowBlur.value),
            offsetX: 2,
            offsetY: 4
        }) : null
    });
    canvas.requestRenderAll();
    saveHistory();
}

function toggleBold() {
    const activeObject = canvas?.getActiveObject();
    if (!activeObject || activeObject.type !== "textbox") {
        return;
    }

    activeObject.set("fontWeight", activeObject.fontWeight === "700" ? "400" : "700");
    syncControlsWithSelection(activeObject);
    canvas.requestRenderAll();
    saveHistory();
}

function toggleItalic() {
    const activeObject = canvas?.getActiveObject();
    if (!activeObject || activeObject.type !== "textbox") {
        return;
    }

    activeObject.set("fontStyle", activeObject.fontStyle === "italic" ? "normal" : "italic");
    syncControlsWithSelection(activeObject);
    canvas.requestRenderAll();
    saveHistory();
}

function setTextAlign(alignment) {
    const activeObject = canvas?.getActiveObject();
    if (!activeObject || activeObject.type !== "textbox") {
        return;
    }

    activeObject.set("textAlign", alignment);
    syncAlignButtons(alignment);
    canvas.requestRenderAll();
    saveHistory();
}

function applyCustomColor(event) {
    const activeObject = canvas?.getActiveObject();
    if (!activeObject || activeObject.studioRole === "guide" || activeObject.studioRole === "crop-frame" || activeObject.type === "image") {
        return;
    }

    setActiveObjectColor(event.target.value);
    canvas.requestRenderAll();
    saveHistory();
}

function setActiveObjectColor(color) {
    const activeObject = canvas?.getActiveObject();
    if (!activeObject || activeObject.type === "image") {
        return;
    }

    if (activeObject.type === "line") {
        activeObject.set("stroke", color);
        return;
    }

    activeObject.set("fill", color);
}

function syncControlsWithSelection(activeObject) {
    if (!activeObject || activeObject.studioRole === "guide") {
        objControls.classList.add("hidden-panel");
        return;
    }

    objControls.classList.remove("hidden-panel");
    selectionType.textContent = activeObject.type === "textbox"
        ? "Text selected"
        : activeObject.studioRole === "crop-frame"
            ? "Crop selected"
            : activeObject.type === "image"
                ? "Photo selected"
                : "Shape selected";

    const isText = activeObject.type === "textbox";
    const isImage = activeObject.type === "image";

    fontGroup.style.display = isText ? "block" : "none";
    textSizeGroup.style.display = isText ? "block" : "none";
    textStyleGroup.style.display = isText ? "block" : "none";
    alignGroup.style.display = isText ? "block" : "none";
    strokeGroup.style.display = isText ? "block" : "none";
    shadowGroup.style.display = isText ? "block" : "none";
    imageTools.classList.toggle("hidden-panel", !isImage);
    cropActions.classList.toggle("hidden-panel", !cropState);

    opacitySlider.value = activeObject.opacity ?? 1;
    opacityValue.textContent = `${Math.round((activeObject.opacity ?? 1) * 100)}%`;
    lockBtn.textContent = activeObject.isLocked ? "Unlock" : "Lock";

    if (isText) {
        fontFamily.value = activeObject.fontFamily || "Manrope";
        fontSizeSlider.value = activeObject.fontSize || 40;
        fontSizeNumber.value = activeObject.fontSize || 40;
        strokeColor.value = tinycolor(activeObject.stroke || "#ffffff").toHexString();
        strokeWidth.value = activeObject.strokeWidth || 0;
        shadowColor.value = activeObject.shadow ? tinycolor(activeObject.shadow.color || "#000000").toHexString() : "#000000";
        shadowBlur.value = activeObject.shadow ? activeObject.shadow.blur || 0 : 0;
        customColor.value = tinycolor(activeObject.fill || "#182336").toHexString();
        boldBtn.classList.toggle("is-active", activeObject.fontWeight === "700");
        italicBtn.classList.toggle("is-active", activeObject.fontStyle === "italic");
        syncAlignButtons(activeObject.textAlign || "center");
    } else {
        customColor.value = tinycolor(activeObject.fill || activeObject.stroke || "#2aa9d6").toHexString();
        boldBtn.classList.remove("is-active");
        italicBtn.classList.remove("is-active");
        syncAlignButtons("");
    }
}

function syncAlignButtons(alignment) {
    alignButtons.forEach((button) => {
        button.classList.toggle("is-active", button.dataset.align === alignment);
    });
}

function duplicateObj() {
    if (!canvas) {
        return;
    }

    const activeObject = canvas.getActiveObject();
    if (!activeObject || activeObject.studioRole === "crop-frame") {
        return;
    }

    activeObject.clone((cloned) => {
        ensureObjectAppearance(cloned);
        ensureObjectMeta(cloned, activeObject.studioName || "Copy");
        cloned.set({
            left: (activeObject.left || 0) + 30,
            top: (activeObject.top || 0) + 30
        });
        canvas.add(cloned);
        canvas.setActiveObject(cloned);
        canvas.requestRenderAll();
        syncControlsWithSelection(cloned);
        saveHistory();
    });
}

function duplicatePage() {
    if (!canvas) {
        return;
    }

    const snapshot = serializeCanvas();
    if (!snapshot) {
        return;
    }

    const baseName = currentTemplateName || getPresetById(activePresetId).label;
    currentDesignId = `design-${Date.now()}`;
    currentTemplateName = `${baseName} Copy`;
    activeTemplateName.textContent = currentTemplateName;
    updateStageCopy();
    persistDesign();
    setAutosaveStatus("Duplicated as new page");
}

function toggleLock() {
    const activeObject = canvas?.getActiveObject();
    if (!activeObject || activeObject.studioRole === "crop-frame") {
        return;
    }

    const nextState = !activeObject.isLocked;
    activeObject.isLocked = nextState;
    activeObject.set({
        lockMovementX: nextState,
        lockMovementY: nextState,
        lockScalingX: nextState,
        lockScalingY: nextState,
        lockRotation: nextState,
        hasControls: !nextState,
        selectable: true,
        editable: activeObject.type === "textbox" ? !nextState : activeObject.editable
    });
    canvas.requestRenderAll();
    syncControlsWithSelection(activeObject);
    updateLayersList();
    saveHistory();
}

function deleteObj() {
    const activeObject = canvas?.getActiveObject();
    if (!activeObject || activeObject.studioRole === "guide") {
        return;
    }

    if (cropState && (activeObject === cropState.frame || activeObject === cropState.image)) {
        cancelCrop(true);
    }

    canvas.remove(activeObject);
    canvas.discardActiveObject();
    canvas.requestRenderAll();
    objControls.classList.add("hidden-panel");
    saveHistory();
}

function bringForward() {
    const activeObject = canvas?.getActiveObject();
    if (!activeObject || activeObject.studioRole === "guide") {
        return;
    }

    canvas.bringForward(activeObject);
    syncGuideOrder();
    canvas.requestRenderAll();
    updateLayersList();
    saveHistory();
}

function sendBackward() {
    const activeObject = canvas?.getActiveObject();
    if (!activeObject || activeObject.studioRole === "guide") {
        return;
    }

    canvas.sendBackwards(activeObject);
    syncGuideOrder();
    canvas.requestRenderAll();
    updateLayersList();
    saveHistory();
}

function changeOpacity(value) {
    const activeObject = canvas?.getActiveObject();
    if (!activeObject || activeObject.studioRole === "guide") {
        return;
    }

    const nextOpacity = parseFloat(value);
    activeObject.set("opacity", nextOpacity);
    opacityValue.textContent = `${Math.round(nextOpacity * 100)}%`;
    canvas.requestRenderAll();
}

function startCropMode() {
    const activeObject = canvas?.getActiveObject();
    if (!activeObject || activeObject.type !== "image") {
        return;
    }

    cancelCrop(true);
    activeObject.set({
        selectable: false,
        evented: false,
        opacity: 0.45
    });

    const frame = new fabric.Rect({
        left: activeObject.left + activeObject.getScaledWidth() * 0.12,
        top: activeObject.top + activeObject.getScaledHeight() * 0.12,
        width: activeObject.getScaledWidth() * 0.76,
        height: activeObject.getScaledHeight() * 0.76,
        originX: "left",
        originY: "top",
        fill: "rgba(42, 169, 214, 0.12)",
        stroke: "#2aa9d6",
        strokeDashArray: [10, 8],
        cornerColor: "#2aa9d6",
        cornerStyle: "circle",
        transparentCorners: false,
        borderColor: "#2aa9d6",
        cornerSize: 12,
        studioRole: "crop-frame"
    });

    cropState = { image: activeObject, frame };
    canvas.add(frame);
    canvas.setActiveObject(frame);
    syncGuideOrder();
    syncControlsWithSelection(frame);
    setAutosaveStatus("Crop mode active");
}

function constrainCropFrame(isScaling = false) {
    if (!cropState) {
        return;
    }

    const { image, frame } = cropState;
    const minSize = 40;
    const maxLeft = image.left;
    const maxTop = image.top;
    const maxRight = image.left + image.getScaledWidth();
    const maxBottom = image.top + image.getScaledHeight();

    if (frame.getScaledWidth() < minSize) {
        frame.scaleX = minSize / frame.width;
    }
    if (frame.getScaledHeight() < minSize) {
        frame.scaleY = minSize / frame.height;
    }

    if (frame.left < maxLeft) {
        frame.left = maxLeft;
    }
    if (frame.top < maxTop) {
        frame.top = maxTop;
    }

    if (frame.left + frame.getScaledWidth() > maxRight) {
        if (isScaling) {
            frame.scaleX = (maxRight - frame.left) / frame.width;
        } else {
            frame.left = maxRight - frame.getScaledWidth();
        }
    }

    if (frame.top + frame.getScaledHeight() > maxBottom) {
        if (isScaling) {
            frame.scaleY = (maxBottom - frame.top) / frame.height;
        } else {
            frame.top = maxBottom - frame.getScaledHeight();
        }
    }

    frame.setCoords();
    canvas.requestRenderAll();
}

function applyCrop() {
    if (!cropState) {
        return;
    }

    const { image, frame } = cropState;
    const nextCropX = Math.max(0, (image.cropX || 0) + ((frame.left - image.left) / image.scaleX));
    const nextCropY = Math.max(0, (image.cropY || 0) + ((frame.top - image.top) / image.scaleY));
    const nextWidth = Math.max(20, (frame.width * frame.scaleX) / image.scaleX);
    const nextHeight = Math.max(20, (frame.height * frame.scaleY) / image.scaleY);

    image.set({
        cropX: nextCropX,
        cropY: nextCropY,
        width: nextWidth,
        height: nextHeight,
        left: frame.left,
        top: frame.top,
        opacity: 1,
        selectable: !image.isLocked,
        evented: !image.isLocked
    });

    canvas.remove(frame);
    cropState = null;
    ensureObjectAppearance(image);
    canvas.setActiveObject(image);
    syncControlsWithSelection(image);
    canvas.requestRenderAll();
    updateLayersList();
    saveHistory();
    setAutosaveStatus("Crop applied");
}

function cancelCrop(silent = false) {
    if (!cropState) {
        return;
    }

    const { image, frame } = cropState;
    if (frame && canvas.getObjects().includes(frame)) {
        canvas.remove(frame);
    }

    image.set({
        opacity: 1,
        selectable: !image.isLocked,
        evented: !image.isLocked
    });

    cropState = null;
    canvas.setActiveObject(image);
    syncControlsWithSelection(image);
    canvas.requestRenderAll();
    if (!silent) {
        setAutosaveStatus("Crop cancelled");
    }
}

function toggleSidebar() {
    sidebar.classList.toggle("is-open");
}

function closeSidebar() {
    sidebar.classList.remove("is-open");
}

function toggleGuides() {
    guidesVisible = !guidesVisible;
    refreshGuides();
    setAutosaveStatus(guidesVisible ? "Guides on" : "Guides off");
}

function refreshGuides() {
    if (!canvas) {
        return;
    }

    guideObjects.forEach((guide) => {
        if (canvas.getObjects().includes(guide)) {
            canvas.remove(guide);
        }
    });
    guideObjects = [];

    if (!guidesVisible) {
        canvas.requestRenderAll();
        return;
    }

    const safeX = Math.round(baseCanvasWidth * 0.08);
    const safeY = Math.round(baseCanvasHeight * 0.08);
    const right = baseCanvasWidth - safeX;
    const bottom = baseCanvasHeight - safeY;

    const guideConfig = {
        evented: false,
        selectable: false,
        excludeFromExport: true,
        studioRole: "guide"
    };

    const safeRect = new fabric.Rect({
        left: safeX,
        top: safeY,
        width: right - safeX,
        height: bottom - safeY,
        fill: "transparent",
        stroke: "rgba(42, 169, 214, 0.45)",
        strokeDashArray: [18, 10],
        ...guideConfig
    });
    const vertical = new fabric.Line([baseCanvasWidth / 2, 0, baseCanvasWidth / 2, baseCanvasHeight], {
        stroke: "rgba(79, 125, 245, 0.28)",
        strokeDashArray: [10, 10],
        ...guideConfig
    });
    const horizontal = new fabric.Line([0, baseCanvasHeight / 2, baseCanvasWidth, baseCanvasHeight / 2], {
        stroke: "rgba(79, 125, 245, 0.28)",
        strokeDashArray: [10, 10],
        ...guideConfig
    });

    guideObjects = [safeRect, vertical, horizontal];
    guideObjects.forEach((guide) => canvas.add(guide));
    syncGuideOrder();
    canvas.requestRenderAll();
}

function syncGuideOrder() {
    if (!canvas) {
        return;
    }

    guideObjects.forEach((guide) => {
        if (canvas.getObjects().includes(guide)) {
            canvas.bringToFront(guide);
        }
    });

    if (cropState?.frame && canvas.getObjects().includes(cropState.frame)) {
        canvas.bringToFront(cropState.frame);
    }
}

function snapObject(target) {
    if (!canvas || target.isLocked) {
        return;
    }

    const threshold = Math.max(12, baseCanvasWidth * 0.01);
    const safeX = baseCanvasWidth * 0.08;
    const safeY = baseCanvasHeight * 0.08;
    const bounds = target.getBoundingRect(true, true);
    const centerX = bounds.left + bounds.width / 2;
    const centerY = bounds.top + bounds.height / 2;
    const safeRight = baseCanvasWidth - safeX;
    const safeBottom = baseCanvasHeight - safeY;

    if (Math.abs(centerX - baseCanvasWidth / 2) < threshold) {
        target.left += (baseCanvasWidth / 2) - centerX;
    }
    if (Math.abs(centerY - baseCanvasHeight / 2) < threshold) {
        target.top += (baseCanvasHeight / 2) - centerY;
    }
    if (Math.abs(bounds.left - safeX) < threshold) {
        target.left += safeX - bounds.left;
    }
    if (Math.abs(bounds.top - safeY) < threshold) {
        target.top += safeY - bounds.top;
    }
    if (Math.abs(bounds.left + bounds.width - safeRight) < threshold) {
        target.left += safeRight - (bounds.left + bounds.width);
    }
    if (Math.abs(bounds.top + bounds.height - safeBottom) < threshold) {
        target.top += safeBottom - (bounds.top + bounds.height);
    }
}

function updateLayersList() {
    if (!canvas) {
        return;
    }

    const objects = getEditableObjects().slice().reverse();
    if (!objects.length) {
        layersList.innerHTML = '<p class="empty-copy">No layers yet.</p>';
        return;
    }

    layersList.innerHTML = objects.map((object) => {
        ensureObjectMeta(object, object.type === "textbox" ? "Text" : "Photo");
        const title = object.type === "textbox" ? object.studioName || "Text" : object.studioName || "Photo";
        const activeClass = canvas.getActiveObject() === object ? " active" : "";
        const state = object.isLocked ? "Locked" : object.type === "textbox" ? "Text" : "Photo";
        return `
            <button type="button" class="layer-item${activeClass}" data-layer-id="${object.studioId}">
                <span>${title}</span>
                <small>${state}</small>
            </button>
        `;
    }).join("");

    layersList.querySelectorAll(".layer-item").forEach((button) => {
        button.addEventListener("click", () => selectLayer(button.dataset.layerId));
    });
}

function getEditableObjects() {
    return canvas.getObjects().filter((object) => object.studioRole !== "guide" && object.studioRole !== "crop-frame");
}

function selectLayer(layerId) {
    const target = getEditableObjects().find((object) => object.studioId === layerId);
    if (!target) {
        return;
    }

    canvas.setActiveObject(target);
    canvas.requestRenderAll();
    syncControlsWithSelection(target);
}

function adjustZoom(delta) {
    setZoom(zoomLevel + delta);
}

function setZoom(value) {
    zoomLevel = clampNumber(value, 0.1, 2);
    zoomSlider.value = zoomLevel;
    zoomValue.textContent = `${Math.round(zoomLevel * 100)}%`;
    applyDisplayZoom();
}

function fitCanvasToStage() {
    if (!canvas) {
        return;
    }

    const horizontalPadding = window.innerWidth <= 920 ? 48 : 88;
    const maxWidth = Math.max(viewport.clientWidth - horizontalPadding, 260);

    const topNavHeight = topNav?.offsetHeight || 0;
    const chromeAllowance = window.innerWidth <= 920 ? 78 : 92;
    const availableHeight = window.innerHeight - topNavHeight - chromeAllowance;
    const maxHeight = Math.max(availableHeight, 320);

    const fitZoom = Math.min(maxWidth / baseCanvasWidth, maxHeight / baseCanvasHeight, 1) * 0.995;
    setZoom(fitZoom);
}

function resetStagePosition() {
    requestAnimationFrame(() => {
        viewport.scrollTop = 0;
        viewport.scrollLeft = 0;
        if (canvasStage) {
            canvasStage.scrollTop = 0;
            canvasStage.scrollLeft = 0;
        }
    });
}

function normalizeBackgroundImage() {
    if (!canvas?.backgroundImage) {
        return;
    }

    canvas.backgroundImage.set({
        left: 0,
        top: 0,
        originX: "left",
        originY: "top",
        selectable: false,
        evented: false
    });
    canvas.backgroundImage.setCoords();
}

function applyDisplayZoom() {
    if (!canvas) {
        return;
    }

    const displayWidth = baseCanvasWidth * zoomLevel;
    const displayHeight = baseCanvasHeight * zoomLevel;

    canvasWrapper.style.width = `${displayWidth}px`;
    canvasWrapper.style.height = `${displayHeight}px`;

    if (canvas.wrapperEl) {
        canvas.wrapperEl.style.width = `${displayWidth}px`;
        canvas.wrapperEl.style.height = `${displayHeight}px`;
    }
    if (canvas.lowerCanvasEl) {
        canvas.lowerCanvasEl.style.width = `${displayWidth}px`;
        canvas.lowerCanvasEl.style.height = `${displayHeight}px`;
    }
    if (canvas.upperCanvasEl) {
        canvas.upperCanvasEl.style.width = `${displayWidth}px`;
        canvas.upperCanvasEl.style.height = `${displayHeight}px`;
    }

    canvas.calcOffset();
    canvas.requestRenderAll();
}

function saveHistory() {
    if (!canvas || canvas.isUndoAction || cropState) {
        return;
    }

    const snapshot = serializeCanvas();
    if (!snapshot || undoStack[undoStack.length - 1] === snapshot) {
        return;
    }

    undoStack.push(snapshot);
    redoStack = [];
    scheduleAutosave();
}

function resetHistory() {
    undoStack = [];
    redoStack = [];
}

function serializeCanvas() {
    if (!canvas) {
        return "";
    }

    const temporarilyRemoved = [];
    [...guideObjects, cropState?.frame].filter(Boolean).forEach((object) => {
        if (canvas.getObjects().includes(object)) {
            temporarilyRemoved.push(object);
            canvas.remove(object);
        }
    });

    const snapshot = JSON.stringify(canvas.toDatalessJSON(["studioRole", "studioName", "studioId", "isLocked"]));

    temporarilyRemoved.forEach((object) => canvas.add(object));
    syncGuideOrder();
    canvas.requestRenderAll();

    return snapshot;
}

function undo() {
    if (!canvas || undoStack.length <= 1 || cropState) {
        return;
    }

    redoStack.push(undoStack.pop());
    loadHistorySnapshot(undoStack[undoStack.length - 1]);
}

function redo() {
    if (!canvas || !redoStack.length || cropState) {
        return;
    }

    const snapshot = redoStack.pop();
    undoStack.push(snapshot);
    loadHistorySnapshot(snapshot);
}

function loadHistorySnapshot(snapshot) {
    canvas.isUndoAction = true;
    loadDesignSnapshot(snapshot, { templateId: currentTemplateId, templateName: currentTemplateName }, () => {
        canvas.isUndoAction = false;
    }, false);
}

function scheduleAutosave() {
    clearTimeout(autoSaveTimer);
    setAutosaveStatus("Saving...");
    autoSaveTimer = setTimeout(() => persistDesign(), 500);
}

function persistDesign() {
    if (!canvas || cropState) {
        return;
    }

    const snapshot = serializeCanvas();
    if (!snapshot) {
        return;
    }

    let preview = "";
    try {
        preview = canvas.toDataURL({
            format: "png",
            quality: 1,
            multiplier: 0.2
        });
    } catch (error) {
        preview = "";
    }

    const entry = {
        id: currentDesignId,
        updatedAt: Date.now(),
        templateId: currentTemplateId,
        templateName: currentTemplateName,
        presetId: activePresetId,
        templateCategory: selectedTemplateCategory,
        snapshot,
        preview
    };

    writeJsonStorage(STORAGE_KEYS.latestDesign, entry);

    const recents = readJsonStorage(STORAGE_KEYS.recentDesigns, []);
    const nextRecents = [entry, ...recents.filter((item) => item.id !== entry.id)].slice(0, 8);
    writeJsonStorage(STORAGE_KEYS.recentDesigns, nextRecents);
    renderRecentDesigns();
    setAutosaveStatus(preview ? "Autosaved" : "Autosaved (preview off)");
}

function renderRecentDesigns() {
    const recents = readJsonStorage(STORAGE_KEYS.recentDesigns, []);

    if (!recents.length) {
        recentDesigns.innerHTML = '<p class="empty-copy">Autosaved designs will appear here.</p>';
        return;
    }

    recentDesigns.innerHTML = recents.map((item) => `
        <div class="recent-card">
            ${item.preview
                ? `<img class="recent-thumb" src="${item.preview}" alt="${item.templateName}">`
                : `<div class="recent-thumb recent-thumb-fallback">${(item.templateName || "Design").slice(0, 1)}</div>`}
            <div class="recent-body">
                <strong>${item.templateName || "Untitled design"}</strong>
                <small>${formatTime(item.updatedAt)}</small>
                <div class="recent-actions">
                    <button type="button" class="link-btn" onclick="loadRecentDesign('${item.id}')">Open</button>
                    <button type="button" class="link-btn danger-link" onclick="deleteRecentDesign('${item.id}')">Delete</button>
                </div>
            </div>
        </div>
    `).join("");
}

function loadLatestDesign() {
    const latest = readJsonStorage(STORAGE_KEYS.latestDesign, null);
    if (!latest?.snapshot) {
        return false;
    }

    currentDesignId = latest.id || currentDesignId;
    currentTemplateId = latest.templateId || currentTemplateId;
    currentTemplateName = latest.templateName || currentTemplateName;
    activePresetId = latest.presetId || activePresetId;
    selectedTemplateCategory = latest.templateCategory || selectedTemplateCategory;
    activeTemplateName.textContent = currentTemplateName;
    loadDesignSnapshot(latest.snapshot, latest, null, true);
    return true;
}

function loadRecentDesign(designId) {
    const recents = readJsonStorage(STORAGE_KEYS.recentDesigns, []);
    const target = recents.find((item) => item.id === designId);
    if (!target) {
        return;
    }

    currentDesignId = target.id;
    currentTemplateId = target.templateId || currentTemplateId;
    currentTemplateName = target.templateName || currentTemplateName;
    activePresetId = target.presetId || activePresetId;
    selectedTemplateCategory = target.templateCategory || selectedTemplateCategory;
    activeTemplateName.textContent = currentTemplateName;
    loadDesignSnapshot(target.snapshot, target, null, true);
}

function deleteRecentDesign(designId) {
    const recents = readJsonStorage(STORAGE_KEYS.recentDesigns, []);
    const nextRecents = recents.filter((item) => item.id !== designId);
    writeJsonStorage(STORAGE_KEYS.recentDesigns, nextRecents);

    const latest = readJsonStorage(STORAGE_KEYS.latestDesign, null);
    if (latest?.id === designId) {
        writeJsonStorage(STORAGE_KEYS.latestDesign, null);
    }

    renderRecentDesigns();
}

function loadDesignSnapshot(snapshot, meta = {}, done = null, resetUndo = true) {
    cancelCrop(true);
    canvas.loadFromJSON(snapshot, () => {
        normalizeLoadedCanvasState();
        baseCanvasWidth = canvas.getWidth();
        baseCanvasHeight = canvas.getHeight();
        currentTemplateId = meta.templateId || currentTemplateId;
        currentTemplateName = meta.templateName || currentTemplateName;
        activePresetId = meta.presetId || activePresetId;
        selectedTemplateCategory = meta.templateCategory || selectedTemplateCategory;
        activeTemplateName.textContent = currentTemplateName;
        updateStageCopy();
        updateActivePresetUi();
        updateActiveTemplateFilter();
        updateActiveTemplateCard(currentTemplateId);
        normalizeBackgroundImage();
        refreshGuides();
        updateObjectHandleScale();
        updateLayersList();
        fitCanvasToStage();
        resetStagePosition();
        canvas.requestRenderAll();
        syncControlsWithSelection(canvas.getActiveObject());

        if (resetUndo) {
            resetHistory();
            const currentSnapshot = serializeCanvas();
            if (currentSnapshot) {
                undoStack.push(currentSnapshot);
            }
        }

        setAutosaveStatus("Loaded");
        if (done) {
            done();
        }
    });
}

function extractColors(url) {
    if (!window.tinycolor) {
        return;
    }

    if (IS_FILE_PROTOCOL) {
        renderPalette(getDefaultPaletteColors());
        return;
    }

    const image = new Image();
    if (!IS_FILE_PROTOCOL) {
        image.crossOrigin = "anonymous";
    }
    image.src = url;

    image.onload = () => {
        const tempCanvas = document.createElement("canvas");
        const context = tempCanvas.getContext("2d");
        tempCanvas.width = 6;
        tempCanvas.height = 6;
        context.drawImage(image, 0, 0, 6, 6);
        const data = context.getImageData(0, 0, 6, 6).data;

        const colors = new Set(["#ffffff", "#182336", "#2aa9d6"]);
        for (let index = 0; index < data.length; index += 4) {
            colors.add(
                tinycolor({
                    r: data[index],
                    g: data[index + 1],
                    b: data[index + 2]
                }).toHexString()
            );
        }

        renderPalette(Array.from(colors).slice(0, 12));
    };

    image.onerror = () => {
        renderPalette(getDefaultPaletteColors());
    };
}

function getDefaultPaletteColors(category = getPresetById(activePresetId).category) {
    const baseColors = ["#182336", "#2aa9d6", "#4f7df5", "#ffffff", "#ffd36e", "#cfd9e6"];
    const categoryColors = {
        poster: ["#1a153f", "#ffc857", "#1c3faa", "#fff4d9", "#145374", "#fefefe"],
        certificate: ["#182336", "#8f6f31", "#d8bf76", "#ffffff", "#6a7b91", "#f5f0e1"],
        invitation: ["#7a274b", "#f2c5d5", "#f7ede2", "#385170", "#ffffff", "#d49a89"],
        ppt: ["#182336", "#2aa9d6", "#4f7df5", "#ffffff", "#dbeafe", "#62718a"],
        word: ["#182336", "#304056", "#62718a", "#ffffff", "#dfe7ef", "#8aa4bf"]
    };

    return Array.from(new Set([...(categoryColors[category] || []), ...baseColors]));
}

function renderPalette(colors) {
    const palette = document.getElementById("palette");
    if (!palette) {
        return;
    }

    palette.innerHTML = "";
    colors.forEach((color) => {
        const swatch = document.createElement("button");
        swatch.type = "button";
        swatch.className = "swatch";
        swatch.style.background = color;
        swatch.setAttribute("aria-label", `Use color ${color}`);
        swatch.addEventListener("click", () => {
            const activeObject = canvas?.getActiveObject();
            if (!activeObject || activeObject.type === "image") {
                return;
            }

            setActiveObjectColor(color);
            customColor.value = tinycolor(color).toHexString();
            canvas.requestRenderAll();
            saveHistory();
        });
        palette.appendChild(swatch);
    });
}

function downloadDesign(format = "png") {
    if (!canvas) {
        return;
    }

    if (format === "json") {
        downloadBlob(new Blob([serializeCanvas()], { type: "application/json" }), "FASCM-Studio.json");
        return;
    }

    const normalizedFormat = format === "jpg" ? "jpeg" : "png";
    try {
        const dataUrl = exportCanvasDataUrl({
            format: normalizedFormat,
            quality: 1,
            multiplier: 3,
            backgroundColor: "#ffffff"
        });
        downloadDataUrl(dataUrl, `FASCM-Studio.${format === "jpg" ? "jpg" : "png"}`);
    } catch (error) {
        if (!IS_FILE_PROTOCOL) {
            console.error(error);
        }
        const message = IS_FILE_PROTOCOL
            ? "Template export is blocked in file mode. Open the editor with http://localhost:8000 to download PNG or JPG."
            : "Export failed. Refresh the page and try again.";
        setAutosaveStatus("Export blocked");
        errorMsg.textContent = message;
    }
}

async function shareDesign() {
    if (!canvas) {
        return;
    }

    try {
        const response = await fetch(exportCanvasDataUrl({ format: "png", quality: 1, multiplier: 2 }));
        const blob = await response.blob();
        const file = new File([blob], "design.png", { type: "image/png" });

        if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({ files: [file], title: "FASCM Studio Design" });
        } else {
            downloadBlob(blob, "FASCM-Studio.png");
        }
    } catch (error) {
        if (!IS_FILE_PROTOCOL) {
            console.error(error);
        }
        errorMsg.textContent = IS_FILE_PROTOCOL
            ? "Share/export is blocked in file mode. Run the editor with http://localhost:8000."
            : "Share failed. Try again.";
    }
}

function downloadDataUrl(dataUrl, filename) {
    downloadBlob(dataUrlToBlob(dataUrl), filename);
}

function downloadBlob(blob, filename) {
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

function dataUrlToBlob(dataUrl) {
    const [header, data] = dataUrl.split(",");
    const mimeMatch = header.match(/data:(.*?);base64/);
    const mime = mimeMatch ? mimeMatch[1] : "application/octet-stream";
    const binary = atob(data);
    const bytes = new Uint8Array(binary.length);

    for (let index = 0; index < binary.length; index += 1) {
        bytes[index] = binary.charCodeAt(index);
    }

    return new Blob([bytes], { type: mime });
}

function exportCanvasDataUrl(options) {
    const activeObject = canvas.getActiveObject();
    const hiddenObjects = [];

    canvas.discardActiveObject();
    [...guideObjects, cropState?.frame].filter(Boolean).forEach((object) => {
        if (canvas.getObjects().includes(object) && object.visible !== false) {
            hiddenObjects.push(object);
            object.visible = false;
        }
    });

    canvas.requestRenderAll();
    const dataUrl = canvas.toDataURL(options);

    hiddenObjects.forEach((object) => {
        object.visible = true;
    });
    if (activeObject && canvas.getObjects().includes(activeObject)) {
        canvas.setActiveObject(activeObject);
    }
    canvas.requestRenderAll();

    return dataUrl;
}

function updateObjectHandleScale() {
    getEditableObjects().forEach((object) => ensureObjectAppearance(object));
    canvas.requestRenderAll();
}

function setAutosaveStatus(message) {
    autosaveStatus.textContent = message;
}

function formatTime(timestamp) {
    try {
        return new Intl.DateTimeFormat("en-IN", {
            day: "2-digit",
            month: "short",
            hour: "numeric",
            minute: "2-digit"
        }).format(new Date(timestamp));
    } catch (error) {
        return "Saved";
    }
}

function safeSessionGet(key) {
    try {
        return sessionStorage.getItem(key);
    } catch (error) {
        return null;
    }
}

function safeSessionSet(key, value) {
    try {
        sessionStorage.setItem(key, value);
    } catch (error) {
        console.warn(error);
    }
}

function readJsonStorage(key, fallbackValue) {
    try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallbackValue;
    } catch (error) {
        return fallbackValue;
    }
}

function writeJsonStorage(key, value) {
    try {
        if (value === null) {
            localStorage.removeItem(key);
            return;
        }
        localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
        console.warn(error);
    }
}

function clampNumber(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

window.addEventListener("resize", () => {
    closeSidebar();
    if (canvas) {
        fitCanvasToStage();
    }
});
