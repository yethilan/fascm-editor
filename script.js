const canvas = new fabric.Canvas('canvas');

// Base size (design resolution)
const BASE_WIDTH = 900;
const BASE_HEIGHT = 600;


// ================= RESPONSIVE CANVAS =================
function resizeCanvas() {
    const container = document.querySelector(".canvas-area");
    const box = document.querySelector(".canvas-box");

    const maxWidth = container.clientWidth - 20;
    const maxHeight = container.clientHeight - 20;

    const scale = Math.min(maxWidth / BASE_WIDTH, maxHeight / BASE_HEIGHT);

    canvas.setWidth(BASE_WIDTH * scale);
    canvas.setHeight(BASE_HEIGHT * scale);
    canvas.setZoom(scale);

    box.style.width = canvas.getWidth() + "px";
    box.style.height = canvas.getHeight() + "px";

    canvas.renderAll();
}

window.addEventListener("resize", resizeCanvas);


// ================= INIT =================
resizeCanvas();


// ================= UNDO / REDO =================
let history = [];
let redoStack = [];

canvas.on("object:added", saveState);
canvas.on("object:modified", saveState);

function saveState() {
    redoStack = [];
    history.push(JSON.stringify(canvas));
}

function undo() {
    if (history.length > 0) {
        redoStack.push(history.pop());
        canvas.loadFromJSON(history[history.length - 1], canvas.renderAll.bind(canvas));
    }
}

function redo() {
    if (redoStack.length > 0) {
        const state = redoStack.pop();
        history.push(state);
        canvas.loadFromJSON(state, canvas.renderAll.bind(canvas));
    }
}


// ================= ADD TEXT =================
function addText() {
    const zoom = canvas.getZoom();

    const text = new fabric.IText("Edit Text", {
        left: (canvas.getWidth() / 2) / zoom,
        top: (canvas.getHeight() / 2) / zoom,
        fontSize: 40 / zoom,
        fill: "#000",
        originX: "center",
        originY: "center"
    });

    canvas.add(text).setActiveObject(text);
}


// ================= SHAPES =================
function addRect() {
    const zoom = canvas.getZoom();

    const rect = new fabric.Rect({
        width: 150 / zoom,
        height: 100 / zoom,
        fill: "blue",
        left: (canvas.getWidth() / 2) / zoom,
        top: (canvas.getHeight() / 2) / zoom,
        originX: "center",
        originY: "center"
    });

    canvas.add(rect);
}


// ================= PROPERTIES =================
function changeColor(color) {
    const obj = canvas.getActiveObject();
    if (obj) {
        obj.set("fill", color);
        canvas.renderAll();
    }
}

function changeOpacity(val) {
    const obj = canvas.getActiveObject();
    if (obj) {
        obj.set("opacity", val);
        canvas.renderAll();
    }
}

function deleteObj() {
    const obj = canvas.getActiveObject();
    if (obj) canvas.remove(obj);
}


// ================= EXPORT =================
function exportPNG() {
    const data = canvas.toDataURL({
        format: "png",
        quality: 1
    });

    const link = document.createElement("a");
    link.href = data;
    link.download = "design.png";
    link.click();
}


// ================= MOUSE ZOOM =================
canvas.on('mouse:wheel', function(opt) {
    let zoom = canvas.getZoom();
    zoom *= 0.999 ** opt.e.deltaY;

    zoom = Math.min(Math.max(zoom, 0.5), 3);

    canvas.setZoom(zoom);

    opt.e.preventDefault();
    opt.e.stopPropagation();
});