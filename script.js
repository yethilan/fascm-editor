const ACCESS_CODE = "FASCM@2026"; 
const canvas = new fabric.Canvas('mainCanvas', { 
    preserveObjectStacking: true,
    backgroundColor: '#fff',
    selectionColor: 'rgba(139, 61, 255, 0.1)'
});

document.addEventListener('DOMContentLoaded', () => {
    let userInput = prompt("Access Code:");
    if (userInput === ACCESS_CODE) setTemplate('images/1.png');
    else document.body.innerHTML = "Access Denied";
});

// 1. Template Settings
function setTemplate(url) {
    fabric.Image.fromURL(url, (img) => {
        const viewport = document.getElementById('viewportArea');
        const padding = 80;
        const scale = Math.min((viewport.clientWidth - padding) / img.width, (viewport.clientHeight - padding) / img.height, 1);
        canvas.setWidth(img.width * scale);
        canvas.setHeight(img.height * scale);
        canvas.setZoom(scale);
        canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas), { selectable: false, evented: false });
        saveHistory();
    }, { crossOrigin: 'anonymous' });
}

// 2. Floating Toolbar Positioning
function updateToolbarPosition() {
    const activeObj = canvas.getActiveObject();
    const toolbar = document.getElementById('floating-toolbar');
    
    if (activeObj) {
        const rect = activeObj.getBoundingRect();
        const canvasOffset = document.getElementById('mainCanvas').getBoundingClientRect();
        
        // Toolbar-ai object-ku mela center panni vaikkum
        toolbar.style.display = 'flex';
        toolbar.style.left = (canvasOffset.left + rect.left + (rect.width / 2) - (toolbar.offsetWidth / 2)) + 'px';
        toolbar.style.top = (canvasOffset.top + rect.top - 55) + 'px';
        
        // Font dropdown update
        if(activeObj.type === 'textbox') {
            document.getElementById('fontFamily').style.display = 'block';
            document.getElementById('fontFamily').value = activeObj.fontFamily;
        } else {
            document.getElementById('fontFamily').style.display = 'none';
        }
    } else {
        toolbar.style.display = 'none';
    }
}

// Events for Floating Toolbar
canvas.on('selection:created', updateToolbarPosition);
canvas.on('selection:updated', updateToolbarPosition);
canvas.on('selection:cleared', () => document.getElementById('floating-toolbar').style.display = 'none');
canvas.on('object:moving', updateToolbarPosition);
canvas.on('object:scaling', updateToolbarPosition);

// 3. Color Sync
document.getElementById('floatColor').oninput = (e) => {
    const a = canvas.getActiveObject();
    if(a) { 
        a.set(a.type==='textbox'?'fill':'backgroundColor', e.target.value); 
        canvas.renderAll(); 
        saveHistory(); 
    }
};

// Add Element Functions
function addText() {
    const z = canvas.getZoom();
    const text = new fabric.Textbox('Edit Me', {
        left: (canvas.width/2)/z, top: (canvas.height/2)/z, width: 150/z, 
        fontSize: 30/z, fill: '#000', fontFamily: 'Hind Madurai', textAlign: 'center',
        originX: 'center', cornerColor: '#8b3dff', cornerStyle: 'circle'
    });
    canvas.add(text).setActiveObject(text);
}

document.getElementById('upload').addEventListener('change', function(e) {
    const reader = new FileReader();
    reader.onload = (f) => {
        fabric.Image.fromURL(f.target.result, (img) => {
            const z = canvas.getZoom();
            img.scaleToWidth(150 / z);
            canvas.add(img).centerObject(img).setActiveObject(img);
        });
    };
    reader.readAsDataURL(e.target.files[0]);
});

// Common Tools
function deleteObj() { canvas.remove(canvas.getActiveObject()); canvas.discardActiveObject().renderAll(); }
function changeFont(f) { const a = canvas.getActiveObject(); if(a && a.type==='textbox') { a.set('fontFamily', f); canvas.renderAll(); } }
function bringForward() { canvas.bringForward(canvas.getActiveObject()); canvas.renderAll(); }
function sendBackward() { canvas.sendBackwards(canvas.getActiveObject()); canvas.renderAll(); }

// Basic Utilities (Undo/Redo/Download)
let undoStack = [];
function saveHistory() { undoStack.push(JSON.stringify(canvas)); }
function undo() { if(undoStack.length > 1) { undoStack.pop(); canvas.loadFromJSON(undoStack[undoStack.length-1], () => canvas.renderAll()); } }
function downloadDesign() { 
    canvas.discardActiveObject().renderAll();
    const link = document.createElement('a');
    link.href = canvas.toDataURL({ format: 'png', multiplier: 2 });
    link.download = 'FASCM-Studio.png';
    link.click();
}