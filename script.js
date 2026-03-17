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

// Auto-Fit Function
function setTemplate(url) {
    fabric.Image.fromURL(url, (img) => {
        const viewport = document.getElementById('viewportArea');
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
        
        // விடுபட்ட Color Extraction மீண்டும் சேர்க்கப்பட்டது
        extractColors(url);
        saveHistory();
    }, { crossOrigin: 'anonymous' });
}

// 1. விடுபட்ட Color Extraction & Palette Logic
function extractColors(url) {
    const img = new Image(); img.crossOrigin = "Anonymous"; img.src = url;
    img.onload = () => {
        const c = document.createElement('canvas'); const ctx = c.getContext('2d');
        c.width = 10; c.height = 10; ctx.drawImage(img, 0, 0, 10, 10);
        const data = ctx.getImageData(0,0,10,10).data;
        const set = new Set();
        
        set.add('#ffffff'); // நீங்கள் கேட்ட வெள்ளை நிறம்
        set.add('#000000'); // கருப்பு நிறம்
        
        for(let i=0; i<data.length; i+=16) {
            const hex = tinycolor({r:data[i], g:data[i+1], b:data[i+2]}).toHexString();
            if(tinycolor(hex).getBrightness() < 240) set.add(hex);
        }
        
        const div = document.getElementById('palette'); div.innerHTML = '';
        Array.from(set).slice(0, 10).forEach(col => {
            const s = document.createElement('div'); s.className = 'swatch'; s.style.background = col;
            s.onclick = () => { 
                const a = canvas.getActiveObject(); 
                if(a) { 
                    if(a.type === 'textbox') a.set('fill', col); 
                    else a.set('backgroundColor', col); 
                    canvas.renderAll(); saveHistory();
                } 
            };
            div.appendChild(s);
        });
    };
}

// 2. விடுபட்ட Mobile Keyboard Scroll Fix
canvas.on('text:editing:entered', function() {
    if (window.innerWidth < 768) {
        document.getElementById('viewportArea').style.paddingBottom = "350px";
        setTimeout(() => {
            document.querySelector('.canvas-wrapper').scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 300);
    }
});

canvas.on('text:editing:exited', function() {
    document.getElementById('viewportArea').style.paddingBottom = "40px";
});

// 3. விடுபட்ட Font Change Logic
function changeFont(fontName) {
    const active = canvas.getActiveObject();
    if (active && active.type === 'textbox') {
        active.set('fontFamily', fontName);
        canvas.renderAll();
        saveHistory();
    }
}

// Image Upload & Add
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
        img.set({ cornerSize: 12/z, cornerColor: '#8b3dff', cornerStyle: 'circle' });
        canvas.add(img).centerObject(img).setActiveObject(img);
        canvas.renderAll();
        document.getElementById('cropBox').style.display = 'none';
        saveHistory();
    });
}

function addText() {
    const z = canvas.getZoom();
    const text = new fabric.Textbox('Double Tap', {
        left: (canvas.width/2)/z, top: (canvas.height/2)/z, width: 250/z, fontSize: 35/z,
        fill: '#000000', fontFamily: 'Inter', textAlign: 'center', originX: 'center', originY: 'center',
        cornerSize: 12/z, cornerColor: '#8b3dff', cornerStyle: 'circle'
    });
    canvas.add(text).setActiveObject(text);
    saveHistory();
}

// History & Controls
function saveHistory() {
    if (canvas.isUndoAction) return;
    undoStack.push(JSON.stringify(canvas));
    if (undoStack.length > 20) undoStack.shift();
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
    const s = redoStack.pop();
    undoStack.push(s);
    canvas.isUndoAction = true;
    canvas.loadFromJSON(s, () => { canvas.renderAll(); canvas.isUndoAction = false; });
}

function deleteObj() { const a = canvas.getActiveObject(); if(a) { canvas.remove(a); canvas.discardActiveObject().renderAll(); saveHistory(); } }
function bringForward() { const a = canvas.getActiveObject(); if(a) { canvas.bringForward(a); canvas.renderAll(); saveHistory(); } }
function sendBackward() { const a = canvas.getActiveObject(); if(a) { canvas.sendBackwards(a); canvas.renderAll(); saveHistory(); } }
function changeOpacity(v) { const a = canvas.getActiveObject(); if(a) { a.set('opacity', parseFloat(v)); canvas.renderAll(); } }

canvas.on('selection:created', (e) => {
    document.getElementById('objControls').style.display = 'block';
    document.getElementById('opacitySlider').value = e.selected[0].opacity;
    if(e.selected[0].type === 'textbox') {
        document.getElementById('fontFamily').value = e.selected[0].fontFamily || 'Inter';
    }
});
canvas.on('selection:cleared', () => document.getElementById('objControls').style.display = 'none');

document.getElementById('customColor').oninput = (e) => {
    const a = canvas.getActiveObject();
    if(a) { 
        if(a.type === 'textbox') a.set('fill', e.target.value);
        else a.set('backgroundColor', e.target.value);
        canvas.renderAll(); saveHistory();
    }
};

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