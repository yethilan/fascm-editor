let canvas;

// BASE SIZE
const BASE_WIDTH = 900;
const BASE_HEIGHT = 600;


// 🔐 PASSWORD
function checkPassword() {
  const pass = document.getElementById("passwordInput").value;

  if (pass === "1234") {
    document.getElementById("loginScreen").style.display = "none";
    document.getElementById("app").style.display = "block";

    initCanvas();
  } else {
    alert("Wrong Password");
  }
}


// 🎯 INIT CANVAS
function initCanvas() {
  canvas = new fabric.Canvas('canvas');

  resizeCanvas();

  window.addEventListener("resize", resizeCanvas);

  canvas.on("object:added", saveState);
  canvas.on("object:modified", saveState);
}


// 📱 RESPONSIVE
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


// ↩️ UNDO REDO
let history = [];
let redoStack = [];

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
    let state = redoStack.pop();
    history.push(state);
    canvas.loadFromJSON(state, canvas.renderAll.bind(canvas));
  }
}


// 🔤 TEXT
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

  canvas.add(text);
}


// 🔷 SHAPE
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


// 🎨 COLOR
function changeColor(color) {
  const obj = canvas.getActiveObject();
  if (obj) {
    obj.set("fill", color);
    canvas.renderAll();
  }
}


// 🌫️ OPACITY
function changeOpacity(val) {
  const obj = canvas.getActiveObject();
  if (obj) {
    obj.set("opacity", val);
    canvas.renderAll();
  }
}


// ❌ DELETE
function deleteObj() {
  const obj = canvas.getActiveObject();
  if (obj) canvas.remove(obj);
}


// 📥 EXPORT
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


// 🎨 TEMPLATE 1
function loadTemplate1() {
  canvas.clear();

  const bg = new fabric.Rect({
    width: BASE_WIDTH,
    height: BASE_HEIGHT,
    fill: "#222"
  });

  const title = new fabric.IText("Event Title", {
    left: BASE_WIDTH / 2,
    top: 200,
    fill: "#fff",
    fontSize: 50,
    originX: "center"
  });

  const sub = new fabric.IText("Subtitle here", {
    left: BASE_WIDTH / 2,
    top: 300,
    fill: "#ccc",
    fontSize: 25,
    originX: "center"
  });

  canvas.add(bg, title, sub);
}


// 🎨 TEMPLATE 2
function loadTemplate2() {
  canvas.clear();

  const bg = new fabric.Rect({
    width: BASE_WIDTH,
    height: BASE_HEIGHT,
    fill: "#fff"
  });

  const box = new fabric.Rect({
    width: 300,
    height: BASE_HEIGHT,
    fill: "#8b3dff",
    left: 0,
    top: 0
  });

  const text = new fabric.IText("College Fest", {
    left: BASE_WIDTH / 2,
    top: 250,
    fill: "#000",
    fontSize: 45,
    originX: "center"
  });

  canvas.add(bg, box, text);
}


// 🔍 ZOOM
canvas?.on?.('mouse:wheel', function(opt) {
  let zoom = canvas.getZoom();
  zoom *= 0.999 ** opt.e.deltaY;

  zoom = Math.min(Math.max(zoom, 0.5), 3);

  canvas.setZoom(zoom);

  opt.e.preventDefault();
  opt.e.stopPropagation();
});