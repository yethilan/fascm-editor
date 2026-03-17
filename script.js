const ACCESS_CODE = "FASCM@2026"; 
let undoStack = [];

const canvas = new fabric.Canvas('mainCanvas', { 
    preserveObjectStacking: true,
    enableRetinaScaling: true, // Pixels-ai sharp-aa vaikkum
    backgroundColor: '#fff'
});

// Login Check
function checkAuth() {
    const input = document.getElementById('passInput').value;
    if(input === ACCESS_CODE) {
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('app-screen').style.display = 'block';
        setTemplate('images/1.png');
    } else {
        document.getElementById('error-msg').innerText = "Wrong Code!";
    }
}

// Template Management
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

// Delete Logic (Fixed)
function deleteObj() {
    const activeObjects = canvas.getActiveObjects();
    if(activeObjects.length > 0) {
        activeObjects.forEach(obj => canvas.remove(obj));
        canvas.discardActiveObject().renderAll();
        saveHistory();
    }
}

// Floating Toolbar Positioning
function updateToolbar() {
    const active = canvas.getActiveObject();
    const toolbar = document.getElementById('floating-toolbar');
    if (active) {
        const rect = active.getBoundingRect();
        const offset = document.getElementById('mainCanvas').getBoundingClientRect();
        toolbar.style.display = 'flex';
        toolbar.style.left = (offset.left + rect.left + (rect.width/2) - (toolbar.offsetWidth/2)) + 'px';
        toolbar.style.top = (offset.top + rect.top - 70) + 'px';
        document.getElementById('fontFamily').style.display = active.type === 'textbox' ? 'block' : 'none';
    } else {
        toolbar.style.display = 'none';
    }
}

// Color extraction & Apply (Text Color Fix)
function extractSmartPalette(url) {
    const img = new Image(); img.crossOrigin = "Anonymous"; img.src = url;
    img.onload = () => {
        const c = document.createElement('canvas'); const ctx = c.getContext('2d');
        c.width = 5; c.height = 5; ctx.drawImage(img, 0, 0, 5, 5);
        const data = ctx.getImageData(0,0,5,5).data;
        const colors = new Set(['#ffffff', '#000000', '#FFD700', '#FF0000']);
        for(let i=0; i<data.length; i+=4) {
            colors.add(tinycolor({r:data[i], g:data[i+1], b:data[i+2]}).toHexString());
        }
        const container = document.getElementById('palette-container');
        container.innerHTML = '';
        Array.from(colors).slice(0, 10).forEach(col => {
            const s = document.createElement('div'); s.className = 'mini-swatch'; s.style.background = col;
            s.onclick = () => { 
                const a = canvas.getActiveObject();
                if(a) { a.set('fill', col); canvas.renderAll(); saveHistory(); }
            };
            container.appendChild(s);
        });
    };
}

// Manual Color Picker
document.getElementById('floatColor').addEventListener('input', (e) => {
    const a = canvas.getActiveObject();
    if(a) { a.set('fill', e.target.value); canvas.renderAll(); }
});

// Event Listeners
canvas.on({
    'selection:created': updateToolbar,
    'selection:updated': updateToolbar,
    'selection:cleared': () => document.getElementById('floating-toolbar').style.display = 'none',
    'object:moving': updateToolbar,
    'object:scaling': updateToolbar
});

function addText() {
    const z = canvas.getZoom();
    const t = new fabric.Textbox('Edit Text', {
        left: (canvas.width/2)/z, top: (canvas.height/2)/z, width: 200/z, 
        fontSize: 35/z, fill: '#000', fontFamily: 'Montserrat', textAlign: 'center', originX: 'center'
    });
    canvas.add(t).setActiveObject(t);
    saveHistory();
}

document.getElementById('upload').addEventListener('change', (e) => {
    const reader = new FileReader();
    reader.onload = (f) => {
        fabric.Image.fromURL(f.target.result, (img) => {
            img.scaleToWidth(150 / canvas.getZoom());
            canvas.add(img).centerObject(img).setActiveObject(img);
            saveHistory();
        });
    };
    reader.readAsDataURL(e.target.files[0]);
});

function changeFont(f) { 
    const a = canvas.getActiveObject(); 
    if(a && a.type==='textbox') { a.set('fontFamily', f); canvas.renderAll(); saveHistory(); } 
}

function saveHistory() { undoStack.push(JSON.stringify(canvas)); }
function undo() { if(undoStack.length > 1) { undoStack.pop(); canvas.loadFromJSON(undoStack[undoStack.length-1], () => canvas.renderAll()); } }

function downloadDesign() {
    canvas.discardActiveObject().renderAll();
    const link = document.createElement('a');
    link.href = canvas.toDataURL({ format: 'png', multiplier: 3 }); // High Res
    link.download = `FASCM_Design_${Date.now()}.png`;
    link.click();
}