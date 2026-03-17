const ACCESS_CODE = "FASCM@2026"; 
let undoStack = [];
let redoStack = [];

const canvas = new fabric.Canvas('mainCanvas', { 
    preserveObjectStacking: true,
    backgroundColor: '#fff',
    selectionColor: 'rgba(139, 61, 255, 0.1)'
});

// AUTH LOGIC
function checkAuth() {
    const input = document.getElementById('passInput').value;
    const error = document.getElementById('error-msg');
    
    if(input === ACCESS_CODE) {
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('app-screen').style.display = 'block';
        setTemplate('images/1.png');
    } else {
        error.innerText = "Invalid access code. Please try again.";
        document.getElementById('passInput').value = "";
    }
}

document.getElementById('passInput')?.addEventListener('keypress', (e) => {
    if(e.key === 'Enter') checkAuth();
});

// CANVAS & TEMPLATE LOGIC
function setTemplate(url) {
    fabric.Image.fromURL(url, (img) => {
        const viewport = document.getElementById('viewportArea');
        const padding = 80;
        const scale = Math.min((viewport.clientWidth - padding) / img.width, (viewport.clientHeight - padding) / img.height, 1);
        canvas.setWidth(img.width * scale);
        canvas.setHeight(img.height * scale);
        canvas.setZoom(scale);
        canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas), { selectable: false, evented: false });
        extractSmartPalette(url);
        saveHistory();
    }, { crossOrigin: 'anonymous' });
}

function updateToolbar() {
    const active = canvas.getActiveObject();
    const toolbar = document.getElementById('floating-toolbar');
    if (active) {
        const rect = active.getBoundingRect();
        const offset = document.getElementById('mainCanvas').getBoundingClientRect();
        toolbar.style.display = 'flex';
        toolbar.style.left = (offset.left + rect.left + (rect.width/2) - (toolbar.offsetWidth/2)) + 'px';
        toolbar.style.top = (offset.top + rect.top - 60) + 'px';
        
        document.getElementById('fontFamily').style.display = active.type === 'textbox' ? 'block' : 'none';
    } else {
        toolbar.style.display = 'none';
    }
}

function extractSmartPalette(url) {
    const img = new Image(); img.crossOrigin = "Anonymous"; img.src = url;
    img.onload = () => {
        const c = document.createElement('canvas'); const ctx = c.getContext('2d');
        c.width = 5; c.height = 5; ctx.drawImage(img, 0, 0, 5, 5);
        const data = ctx.getImageData(0,0,5,5).data;
        const colors = new Set(['#ffffff', '#000000']);
        for(let i=0; i<data.length; i+=4) {
            const hex = tinycolor({r:data[i], g:data[i+1], b:data[i+2]}).toHexString();
            colors.add(hex);
            colors.add(tinycolor(hex).isDark() ? '#ffffff' : '#111827');
        }
        const container = document.getElementById('palette-container');
        container.innerHTML = '';
        Array.from(colors).slice(0, 8).forEach(col => {
            const s = document.createElement('div'); s.className = 'mini-swatch'; s.style.background = col;
            s.onclick = () => { 
                const a = canvas.getActiveObject();
                if(a) { a.set(a.type==='textbox'?'fill':'backgroundColor', col); canvas.renderAll(); saveHistory(); }
            };
            container.appendChild(s);
        });
    };
}

// EVENTS
canvas.on('selection:created', updateToolbar);
canvas.on('selection:updated', updateToolbar);
canvas.on('selection:cleared', () => document.getElementById('floating-toolbar').style.display = 'none');
canvas.on('object:moving', updateToolbar);
canvas.on('object:scaling', updateToolbar);

function addText() {
    const z = canvas.getZoom();
    const t = new fabric.Textbox('Edit Text', {
        left: (canvas.width/2)/z, top: (canvas.height/2)/z, width: 200/z, fontSize: 30/z,
        fill: '#000', fontFamily: 'Inter', textAlign: 'center', originX: 'center'
    });
    canvas.add(t).setActiveObject(t);
    saveHistory();
}

document.getElementById('upload').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = (f) => {
        fabric.Image.fromURL(f.target.result, (img) => {
            const z = canvas.getZoom();
            img.scaleToWidth(150/z);
            canvas.add(img).centerObject(img).setActiveObject(img);
            saveHistory();
        });
    };
    reader.readAsDataURL(file);
});

// TOOLS
function deleteObj() { canvas.remove(canvas.getActiveObject()); canvas.discardActiveObject().renderAll(); saveHistory(); }
function changeFont(f) { const a = canvas.getActiveObject(); if(a && a.type==='textbox') { a.set('fontFamily', f); canvas.renderAll(); saveHistory(); } }

function saveHistory() { undoStack.push(JSON.stringify(canvas)); redoStack = []; }
function undo() { if(undoStack.length > 1) { redoStack.push(undoStack.pop()); canvas.loadFromJSON(undoStack[undoStack.length-1], () => canvas.renderAll()); } }
function redo() { if(redoStack.length > 0) { const s = redoStack.pop(); undoStack.push(s); canvas.loadFromJSON(s, () => canvas.renderAll()); } }

function downloadDesign() {
    canvas.discardActiveObject().renderAll();
    const link = document.createElement('a');
    link.href = canvas.toDataURL({ format: 'png', multiplier: 2 });
    link.download = 'FASCM-Studio.png';
    link.click();
}