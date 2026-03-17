const ACCESS_CODE = "FASCM@2026"; 
let undoStack = [];
let redoStack = [];

const canvas = new fabric.Canvas('mainCanvas', { 
    preserveObjectStacking: true,
    backgroundColor: '#fff',
    selectionColor: 'rgba(139, 61, 255, 0.1)',
    selectionLineWidth: 2
});

document.addEventListener('DOMContentLoaded', () => {
    let userInput = prompt("Access Code:");
    if (userInput === ACCESS_CODE) setTemplate('images/1.png');
    else document.body.innerHTML = "Access Denied";
});

// Canvas Auto-Fit Logic
function setTemplate(url) {
    fabric.Image.fromURL(url, (img) => {
        const viewportWidth = document.querySelector('.canvas-viewport').clientWidth - 60;
        const viewportHeight = document.querySelector('.canvas-viewport').clientHeight - 60;
        
        // இமேஜ் ஸ்கிரீனை விடப் பெருசாக இருந்தால் மட்டும் சிறிதாக்கும்
        let scale = Math.min(viewportWidth / img.width, viewportHeight / img.height, 1);
        
        // லேப்டாப்பில் ரொம்பச் சிறிதாகத் தெரிந்தால் ஒரு நிலையான அளவு
        if(window.innerWidth > 768 && scale < 0.5) scale = 0.5;

        canvas.setWidth(img.width * scale);
        canvas.setHeight(img.height * scale);
        canvas.setZoom(scale);

        canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas), {
            originX: 'left', originY: 'top', crossOrigin: 'anonymous'
        });
        
        saveHistory();
    }, { crossOrigin: 'anonymous' });
}

// Objects Touchable Fix
function addText() {
    const text = new fabric.Textbox('Type Here', {
        left: 50, top: 50, width: 250, fontSize: 50,
        fill: '#000000', fontFamily: 'Arial',
        cornerSize: 12, transparentCorners: false,
        cornerColor: '#8b3dff', cornerStyle: 'circle'
    });
    canvas.add(text).setActiveObject(text);
}

// Image Selection & Crop Fix
document.getElementById('upload').addEventListener('change', function(e) {
    const reader = new FileReader();
    reader.onload = (f) => {
        document.getElementById('cropBox').style.display = 'block';
        const cropImg = document.getElementById('cropImg');
        cropImg.src = f.target.result;
        if(window.cropper) window.cropper.destroy();
        window.cropper = new Cropper(cropImg, { viewMode: 1, dragMode: 'move' });
    };
    reader.readAsDataURL(e.target.files[0]);
});

function confirmCrop() {
    const data = window.cropper.getCroppedCanvas().toDataURL('image/png');
    fabric.Image.fromURL(data, (img) => {
        img.scaleToWidth(canvas.width / 2); // கேன்வாஸ் அளவில் பாதி
        img.set({ cornerSize: 12, cornerStyle: 'circle', cornerColor: '#8b3dff' });
        canvas.add(img).centerObject(img).setActiveObject(img);
        document.getElementById('cropBox').style.display = 'none';
    });
}

// History & Controls
function saveHistory() {
    if (canvas.isUndoAction) return;
    undoStack.push(JSON.stringify(canvas));
    redoStack = [];
}
canvas.on('object:modified', saveHistory);
canvas.on('object:added', saveHistory);

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
    const state = redoStack.pop();
    undoStack.push(state);
    canvas.isUndoAction = true;
    canvas.loadFromJSON(state, () => {
        canvas.renderAll();
        canvas.isUndoAction = false;
    });
}

function deleteObj() {
    const active = canvas.getActiveObject();
    if(active) { canvas.remove(active); canvas.requestRenderAll(); }
}

function bringForward() {
    const active = canvas.getActiveObject();
    if(active) { canvas.bringForward(active); canvas.renderAll(); }
}

function sendBackward() {
    const active = canvas.getActiveObject();
    if(active) { canvas.sendBackwards(active); canvas.renderAll(); }
}

function changeOpacity(val) {
    const active = canvas.getActiveObject();
    if(active) { active.set('opacity', parseFloat(val)); canvas.renderAll(); }
}

function downloadDesign() {
    canvas.discardActiveObject().renderAll();
    const link = document.createElement('a');
    link.href = canvas.toDataURL({ format: 'png', quality: 1 });
    link.download = 'FASCM_Studio.png';
    link.click();
}

async function shareDesign() {
    canvas.discardActiveObject().renderAll();
    const blob = await (await fetch(canvas.toDataURL())).blob();
    const file = new File([blob], 'design.png', { type: 'image/png' });
    if (navigator.share) navigator.share({ files: [file] });
}

canvas.on('selection:created', (e) => {
    document.getElementById('objControls').style.display = 'block';
});
canvas.on('selection:cleared', () => {
    document.getElementById('objControls').style.display = 'none';
});

window.addEventListener('resize', () => {
    // ஸ்கிரீன் மாறும்போது கேன்வாஸ் ரீ-பிட் செய்ய
    const url = canvas.backgroundImage ? canvas.backgroundImage._element.src : null;
    if(url) setTemplate(url);
});