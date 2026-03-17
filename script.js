const ACCESS_CODE = "FASCM@2026"; 
let undoStack = [];
let redoStack = [];

const canvas = new fabric.Canvas('mainCanvas', { 
    preserveObjectStacking: true,
    backgroundColor: '#fff'
});

document.addEventListener('DOMContentLoaded', () => {
    let userInput = prompt("Access Code:");
    if (userInput === ACCESS_CODE) setTemplate('images/1.png');
    else document.body.innerHTML = "Access Denied";
});

// Smart Fit Logic - படத்தைப் பொறுத்து கேன்வாஸ் அளவை மாற்றும்
function setTemplate(url) {
    fabric.Image.fromURL(url, (img) => {
        const viewport = document.querySelector('.viewport');
        const vW = viewport.clientWidth - 40;
        const vH = viewport.clientHeight - 40;

        const scale = Math.min(vW / img.width, vH / img.height, 1);

        canvas.setWidth(img.width * scale);
        canvas.setHeight(img.height * scale);
        canvas.setZoom(scale);

        canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas), {
            originX: 'left', originY: 'top', crossOrigin: 'anonymous'
        });
        saveHistory();
    }, { crossOrigin: 'anonymous' });
}

// Image Add Fix - எப்போதுமே நடுவில் வரும்படி
document.getElementById('upload').addEventListener('change', function(e) {
    const reader = new FileReader();
    reader.onload = (f) => {
        document.getElementById('cropBox').style.display = 'block';
        const cropImg = document.getElementById('cropImg');
        cropImg.src = f.target.result;
        if(window.cropper) window.cropper.destroy();
        window.cropper = new Cropper(cropImg, { viewMode: 1 });
    };
    reader.readAsDataURL(e.target.files[0]);
});

function confirmCrop() {
    const data = window.cropper.getCroppedCanvas().toDataURL('image/png');
    fabric.Image.fromURL(data, (img) => {
        const z = canvas.getZoom();
        img.scaleToWidth(200 / z);
        img.set({ cornerSize: 10/z, cornerColor: '#8b3dff', cornerStyle: 'circle' });
        canvas.add(img).centerObject(img).setActiveObject(img);
        canvas.renderAll();
        document.getElementById('cropBox').style.display = 'none';
        saveHistory();
    });
}

function addText() {
    const z = canvas.getZoom();
    const text = new fabric.Textbox('Double Tap', {
        left: (canvas.width/2)/z, top: (canvas.height/2)/z,
        width: 200/z, fontSize: 40/z, originX: 'center',
        cornerSize: 10/z, cornerColor: '#8b3dff', cornerStyle: 'circle'
    });
    canvas.add(text).setActiveObject(text);
    saveHistory();
}

// History
function saveHistory() {
    if (canvas.isUndoAction) return;
    undoStack.push(JSON.stringify(canvas));
    redoStack = [];
}

function undo() {
    if (undoStack.length <= 1) return;
    redoStack.push(undoStack.pop());
    canvas.isUndoAction = true;
    canvas.loadFromJSON(undoStack[undoStack.length-1], () => {
        canvas.renderAll();
        canvas.isUndoAction = false;
    });
}

function redo() {
    if (redoStack.length === 0) return;
    const s = redoStack.pop();
    undoStack.push(s);
    canvas.isUndoAction = true;
    canvas.loadFromJSON(s, () => {
        canvas.renderAll();
        canvas.isUndoAction = false;
    });
}

// Object Editing
function deleteObj() {
    const a = canvas.getActiveObject();
    if(a) { canvas.remove(a); canvas.requestRenderAll(); saveHistory(); }
}
function bringForward() { const a = canvas.getActiveObject(); if(a) { canvas.bringForward(a); canvas.renderAll(); } }
function sendBackward() { const a = canvas.getActiveObject(); if(a) { canvas.sendBackwards(a); canvas.renderAll(); } }
function changeOpacity(v) { const a = canvas.getActiveObject(); if(a) { a.set('opacity', parseFloat(v)); canvas.renderAll(); } }

canvas.on('selection:created', () => document.getElementById('objControls').style.display = 'block');
canvas.on('selection:cleared', () => document.getElementById('objControls').style.display = 'none');

document.getElementById('customColor').oninput = (e) => {
    const a = canvas.getActiveObject();
    if(a) { a.set('fill', e.target.value); canvas.renderAll(); }
};

function downloadDesign() {
    canvas.discardActiveObject().renderAll();
    const link = document.createElement('a');
    link.href = canvas.toDataURL({ format: 'png', quality: 1 });
    link.download = 'FASCM_Design.png';
    link.click();
}

async function shareDesign() {
    canvas.discardActiveObject().renderAll();
    const b = await (await fetch(canvas.toDataURL())).blob();
    const f = new File([b], 'design.png', { type: 'image/png' });
    if (navigator.share) navigator.share({ files: [f] });
}

// Window Resize Fit
window.addEventListener('resize', () => {
    if(canvas.backgroundImage) setTemplate(canvas.backgroundImage._element.src);
});