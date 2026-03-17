const ACCESS_CODE = "FASCM@2026"; 
let undoStack = [];
let redoStack = [];

const canvas = new fabric.Canvas('mainCanvas', { 
    preserveObjectStacking: true,
    enableRetinaScaling: true, 
    backgroundColor: '#fff'
});

function checkAuth() {
    if(document.getElementById('passInput').value === ACCESS_CODE) {
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('app-screen').style.display = 'block';
        setTemplate('images/1.png');
    } else {
        document.getElementById('error-msg').innerText = "Access Denied!";
    }
}

function setTemplate(url) {
    fabric.Image.fromURL(url, (img) => {
        const viewport = document.getElementById('viewportArea');
        const scale = Math.min((viewport.clientWidth - 100) / img.width, (viewport.clientHeight - 100) / img.height, 1);
        canvas.setWidth(img.width * scale);
        canvas.setHeight(img.height * scale);
        canvas.setZoom(scale);
        canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas), { selectable: false });
        extractSmartPalette(url);
        saveHistory();
    }, { crossOrigin: 'anonymous' });
}

// DELETE LOGIC
function deleteObj() {
    const active = canvas.getActiveObjects();
    if(active.length > 0) {
        active.forEach(obj => canvas.remove(obj));
        canvas.discardActiveObject().renderAll();
        saveHistory();
    }
}

function updateToolbar() {
    const active = canvas.getActiveObject();
    const toolbar = document.getElementById('floating-toolbar');
    if (active) {
        const rect = active.getBoundingRect();
        const offset = document.getElementById('mainCanvas').getBoundingClientRect();
        toolbar.style.display = 'flex';
        toolbar.style.left = (offset.left + rect.left + (rect.width/2) - (toolbar.offsetWidth/2)) + 'px';
        toolbar.style.top = (offset.top + rect.top - 75) + 'px';
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
        const colors = new Set(['#ffffff', '#000000', '#FFD700']);
        for(let i=0; i<data.length; i+=4) {
            colors.add(tinycolor({r:data[i], g:data[i+1], b:data[i+2]}).toHexString());
        }
        const container = document.getElementById('palette-container');
        container.innerHTML = '';
        Array.from(colors).slice(0, 8).forEach(col => {
            const s = document.createElement('div'); s.className = 'mini-swatch'; s.style.background = col;
            s.onclick = () => { 
                const a = canvas.getActiveObject();
                if(a) { a.set('fill', col); canvas.renderAll(); saveHistory(); }
            };
            container.appendChild(s);
        });
    };
}

canvas.on({'selection:created': updateToolbar, 'selection:updated': updateToolbar, 'selection:cleared': () => document.getElementById('floating-toolbar').style.display = 'none'});

function addText() {
    const t = new fabric.Textbox('NANDHAKUMAR', { left: 50, top: 50, fontSize: 32, fill: '#000', fontFamily: 'Montserrat', fontWeight: 'bold' });
    canvas.add(t).setActiveObject(t);
    saveHistory();
}

function saveHistory() { undoStack.push(JSON.stringify(canvas)); redoStack = []; }
function undo() { if(undoStack.length > 1) { redoStack.push(undoStack.pop()); canvas.loadFromJSON(undoStack[undoStack.length-1], () => canvas.renderAll()); } }
function redo() { if(redoStack.length > 0) { const s = redoStack.pop(); undoStack.push(s); canvas.loadFromJSON(s, () => canvas.renderAll()); } }

function downloadDesign() {
    canvas.discardActiveObject().renderAll();
    const link = document.createElement('a');
    link.href = canvas.toDataURL({ format: 'png', multiplier: 3 }); // High Res
    link.download = `FASCM_Studio_${Date.now()}.png`;
    link.click();
}