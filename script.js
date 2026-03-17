const ACCESS_CODE = "FASCM@2026"; 
let undoStack = [];
let redoStack = [];

const canvas = new fabric.Canvas('mainCanvas', { 
    preserveObjectStacking: true,
    backgroundColor: '#fff',
    selectionColor: 'rgba(139, 61, 255, 0.2)',
    selectionLineWidth: 2
});

// Access Control
document.addEventListener('DOMContentLoaded', () => {
    let userInput = prompt("Access Code:");
    if (userInput === ACCESS_CODE) setTemplate('images/1.png');
    else document.body.innerHTML = "Access Denied";
});

// 1. Template Settings (Background is not selectable)
function setTemplate(url) {
    fabric.Image.fromURL(url, (img) => {
        const viewport = document.getElementById('viewportArea');
        const padding = 60;
        const vW = viewport.clientWidth - padding;
        const vH = viewport.clientHeight - padding;
        const scale = Math.min(vW / img.width, vH / img.height, 1);

        canvas.setWidth(img.width * scale);
        canvas.setHeight(img.height * scale);
        canvas.setZoom(scale);

        canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas), {
            originX: 'left', originY: 'top', crossOrigin: 'anonymous',
            selectable: false, evented: false
        });
        extractColors(url);
        saveHistory();
    }, { crossOrigin: 'anonymous' });
}

// 2. Canva Style: Direct Image Upload (No Modal)
document.getElementById('upload').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = (f) => {
        fabric.Image.fromURL(f.target.result, (img) => {
            const z = canvas.getZoom();
            img.scaleToWidth(200 / z);
            
            // Selection Styling
            img.set({
                cornerSize: 12/z,
                cornerColor: '#8b3dff',
                cornerStyle: 'circle',
                transparentCorners: false,
                borderColor: '#8b3dff'
            });

            canvas.add(img).centerObject(img).setActiveObject(img);
            canvas.renderAll();
            saveHistory();
        });
    };
    reader.readAsDataURL(file);
});

// 3. Selection & Visibility Fix
canvas.on('selection:created', (e) => {
    document.getElementById('objControls').style.display = 'block';
    if(e.selected[0].type === 'textbox') {
        document.getElementById('fontFamily').value = e.selected[0].fontFamily;
    }
});
canvas.on('selection:cleared', () => document.getElementById('objControls').style.display = 'none');

// Color Palette Extraction
function extractColors(url) {
    const img = new Image(); img.crossOrigin = "Anonymous"; img.src = url;
    img.onload = () => {
        const c = document.createElement('canvas'); const ctx = c.getContext('2d');
        c.width = 5; c.height = 5; ctx.drawImage(img, 0, 0, 5, 5);
        const data = ctx.getImageData(0,0,5,5).data;
        const colors = new Set(['#ffffff', '#000000']);
        for(let i=0; i<data.length; i+=4) {
            colors.add(tinycolor({r:data[i], g:data[i+1], b:data[i+2]}).toHexString());
        }
        const div = document.getElementById('palette'); div.innerHTML = '';
        Array.from(colors).slice(0, 8).forEach(col => {
            const s = document.createElement('div'); s.className = 'swatch'; s.style.background = col;
            s.onclick = () => { 
                const a = canvas.getActiveObject(); 
                if(a) { a.set(a.type==='textbox'?'fill':'backgroundColor', col); canvas.renderAll(); saveHistory(); } 
            };
            div.appendChild(s);
        });
    };
}

// Basic Tools
function addText() {
    const z = canvas.getZoom();
    const text = new fabric.Textbox('Double Tap', {
        left: (canvas.width/2)/z, top: (canvas.height/2)/z, width: 200/z, fontSize: 35/z,
        fill: '#000', fontFamily: 'Inter', textAlign: 'center', originX: 'center',
        cornerSize: 12/z, cornerColor: '#8b3dff', cornerStyle: 'circle'
    });
    canvas.add(text).setActiveObject(text);
    saveHistory();
}

function deleteObj() {
    const a = canvas.getActiveObject();
    if(a) { canvas.remove(a); canvas.discardActiveObject().renderAll(); saveHistory(); }
}

function changeFont(f) {
    const a = canvas.getActiveObject();
    if(a && a.type==='textbox') { a.set('fontFamily', f); canvas.renderAll(); saveHistory(); }
}

// Layers & Opacity
function bringForward() { const a = canvas.getActiveObject(); if(a) { canvas.bringForward(a); canvas.renderAll(); } }
function sendBackward() { const a = canvas.getActiveObject(); if(a) { canvas.sendBackwards(a); canvas.renderAll(); } }
function changeOpacity(v) { const a = canvas.getActiveObject(); if(a) { a.set('opacity', parseFloat(v)); canvas.renderAll(); } }

// History Logic
function saveHistory() {
    if (canvas.isUndoAction) return;
    undoStack.push(JSON.stringify(canvas));
    redoStack = [];
}
function undo() {
    if (undoStack.length <= 1) return;
    redoStack.push(undoStack.pop());
    canvas.isUndoAction = true;
    canvas.loadFromJSON(undoStack[undoStack.length-1], () => { canvas.renderAll(); canvas.isUndoAction = false; });
}
function redo() {
    if (redoStack.length === 0) return;
    const s = redoStack.pop(); undoStack.push(s);
    canvas.isUndoAction = true;
    canvas.loadFromJSON(s, () => { canvas.renderAll(); canvas.isUndoAction = false; });
}

// Export
function downloadDesign() {
    canvas.discardActiveObject().renderAll();
    const link = document.createElement('a');
    link.href = canvas.toDataURL({ format: 'png', quality: 1, multiplier: 2 });
    link.download = 'FASCM-Studio.png';
    link.click();
}

async function shareDesign() {
    canvas.discardActiveObject().renderAll();
    const b = await (await fetch(canvas.toDataURL())).blob();
    const f = new File([b], 'design.png', { type: 'image/png' });
    if (navigator.share) navigator.share({ files: [f] });
}

window.addEventListener('resize', () => { if(canvas.backgroundImage) setTemplate(canvas.backgroundImage._element.src); });