const ACCESS_CODE = "FASCM@2026"; 
let undoStack = [];
let redoStack = [];

document.addEventListener('DOMContentLoaded', function() {
    let userInput = prompt("Access Code:");
    if (userInput === ACCESS_CODE) setTemplate('images/1.png');
    else document.body.innerHTML = "Access Denied";
});

const canvas = new fabric.Canvas('mainCanvas', { preserveObjectStacking: true });

// Undo/Redo Logic
canvas.on('object:added', saveHistory);
canvas.on('object:modified', saveHistory);
canvas.on('object:removed', saveHistory);

function saveHistory() {
    if (this.isUndoAction) return;
    undoStack.push(JSON.stringify(canvas));
    redoStack = [];
}

function undo() {
    if (undoStack.length <= 1) return;
    redoStack.push(undoStack.pop());
    const state = undoStack[undoStack.length - 1];
    canvas.isUndoAction = true;
    canvas.loadFromJSON(state, () => {
        canvas.renderAll();
        canvas.isUndoAction = false;
    });
}

function redo() {
    if (redoStack.length === 0) return;
    const state = redoStack.pop();
    undoStack.push(state);
    canvas.isUndoAction = true;
    canvas.loadFromJSON(state, () => {
        canvas.renderAll();
        canvas.isUndoAction = false;
    });
}

// Layer Management
function bringForward() {
    const active = canvas.getActiveObject();
    if(active) { canvas.bringForward(active); canvas.renderAll(); }
}

function sendBackward() {
    const active = canvas.getActiveObject();
    if(active) { canvas.sendToBack(active); canvas.renderAll(); }
}

function changeOpacity(val) {
    const active = canvas.getActiveObject();
    if(active) { active.set('opacity', parseFloat(val)); canvas.renderAll(); }
}

// Basic Setup
function setTemplate(url) {
    fabric.Image.fromURL(url, (img) => {
        const scale = (window.innerWidth < 768 ? 800 : 1200) / img.width;
        canvas.setWidth(img.width * scale);
        canvas.setHeight(img.height * scale);
        canvas.setZoom(scale);
        canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas));
        undoStack = [JSON.stringify(canvas)];
    }, { crossOrigin: 'anonymous' });
}

function addText() {
    const text = new fabric.Textbox('Double Tap', {
        left: 100, top: 100, width: 200, fontSize: 50,
        cornerSize: 35, touchCornerSize: 45, cornerStyle: 'circle'
    });
    canvas.add(text).setActiveObject(text);
}

// Image Upload & Crop (Simplified)
document.getElementById('upload').addEventListener('change', function(e) {
    const reader = new FileReader();
    reader.onload = (f) => {
        document.getElementById('cropBox').style.display = 'block';
        const cropImg = document.getElementById('cropImg');
        cropImg.src = f.target.result;
        if(window.cropper) window.cropper.destroy();
        window.cropper = new Cropper(cropImg, { aspectRatio: NaN });
    };
    reader.readAsDataURL(e.target.files[0]);
});

function confirmCrop() {
    const data = window.cropper.getCroppedCanvas().toDataURL();
    fabric.Image.fromURL(data, (img) => {
        img.scaleToWidth(200);
        canvas.add(img).setActiveObject(img);
        document.getElementById('cropBox').style.display = 'none';
    });
}

function deleteObj() {
    const active = canvas.getActiveObject();
    if(active) canvas.remove(active);
}

function downloadDesign() {
    const link = document.createElement('a');
    link.href = canvas.toDataURL({ format: 'png', quality: 1 });
    link.download = 'Design.png';
    link.click();
}

async function shareDesign() {
    const blob = await (await fetch(canvas.toDataURL())).blob();
    const file = new File([blob], 'design.png', { type: 'image/png' });
    if (navigator.share) navigator.share({ files: [file] });
}

canvas.on('selection:created', () => {
    const active = canvas.getActiveObject();
    document.getElementById('objControls').style.display = 'block';
    document.getElementById('opacitySlider').value = active.opacity;
});
canvas.on('selection:cleared', () => document.getElementById('objControls').style.display = 'none');