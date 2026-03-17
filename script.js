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
    else document.body.innerHTML = "<h2 style='color:white; text-align:center; margin-top:50px;'>Access Denied</h2>";
});

// Auto-Fit Functionality - Seri panna patta scaling
function setTemplate(url) {
    fabric.Image.fromURL(url, (img) => {
        const viewport = document.querySelector('.viewport');
        const padding = window.innerWidth < 768 ? 30 : 80;
        const vW = viewport.clientWidth - padding;
        const vH = viewport.clientHeight - padding;

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

// Photo Upload & Crop Integration
document.getElementById('upload').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = (f) => {
        document.getElementById('cropBox').style.display = 'flex';
        const cropImg = document.getElementById('cropImg');
        cropImg.src = f.target.result;
        if(window.cropper) window.cropper.destroy();
        window.cropper = new Cropper(cropImg, { viewMode: 1, aspectRatio: NaN });
    };
    reader.readAsDataURL(file);
});

function confirmCrop() {
    const data = window.cropper.getCroppedCanvas().toDataURL('image/png');
    fabric.Image.fromURL(data, (img) => {
        const z = canvas.getZoom();
        img.scaleToWidth(250 / z);
        img.set({ 
            cornerSize: 12/z, 
            cornerColor: '#8b3dff', 
            cornerStyle: 'circle',
            transparentCorners: false
        });
        canvas.add(img).centerObject(img).setActiveObject(img);
        canvas.renderAll();
        document.getElementById('cropBox').style.display = 'none';
        saveHistory();
    });
}

// Smart Text Positioning
function addText() {
    const z = canvas.getZoom();
    const text = new fabric.Textbox('Double Tap to Edit', {
        left: (canvas.width/2)/z,
        top: (canvas.height/2)/z,
        width: 250/z,
        fontSize: 32/z,
        fill: '#18181b',
        fontFamily: 'Inter',
        textAlign: 'center',
        originX: 'center',
        originY: 'center',
        cornerSize: 12/z,
        cornerColor: '#8b3dff',
        cornerStyle: 'circle'
    });
    canvas.add(text).setActiveObject(text);
    saveHistory();
}

// History & Object Controls
function saveHistory() {
    if (canvas.isUndoAction) return;
    undoStack.push(JSON.stringify(canvas));
    if (undoStack.length > 20) undoStack.shift(); // Limit memory
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

function deleteObj() {
    const active = canvas.getActiveObject();
    if(active) { canvas.remove(active); canvas.discardActiveObject().renderAll(); saveHistory(); }
}

function bringForward() { const a = canvas.getActiveObject(); if(a) { canvas.bringForward(a); canvas.renderAll(); saveHistory(); } }
function sendBackward() { const a = canvas.getActiveObject(); if(a) { canvas.sendBackwards(a); canvas.renderAll(); saveHistory(); } }
function changeOpacity(v) { 
    const a = canvas.getActiveObject(); 
    if(a) { a.set('opacity', parseFloat(v)); canvas.renderAll(); } 
}

// Color and Selection Logic
canvas.on('selection:created', (e) => {
    document.getElementById('objControls').style.display = 'block';
    document.getElementById('opacitySlider').value = e.selected[0].opacity;
});
canvas.on('selection:cleared', () => document.getElementById('objControls').style.display = 'none');

document.getElementById('customColor').oninput = (e) => {
    const a = canvas.getActiveObject();
    if(a) { 
        if(a.type === 'textbox') a.set('fill', e.target.value);
        else a.set('backgroundColor', e.target.value);
        canvas.renderAll(); 
    }
};

function downloadDesign() {
    canvas.discardActiveObject().renderAll();
    const link = document.createElement('a');
    link.href = canvas.toDataURL({ format: 'png', quality: 1, multiplier: 2 }); // High res
    link.download = 'FASCM-Design.png';
    link.click();
}

async function shareDesign() {
    canvas.discardActiveObject().renderAll();
    const b = await (await fetch(canvas.toDataURL())).blob();
    const f = new File([b], 'design.png', { type: 'image/png' });
    if (navigator.share) navigator.share({ files: [f] });
}

window.addEventListener('resize', () => {
    if(canvas.backgroundImage) setTemplate(canvas.backgroundImage._element.src);
});