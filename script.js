const ACCESS_CODE = "FASCM@2026"; 
let history = [];

const canvas = new fabric.Canvas('mainCanvas', { 
    preserveObjectStacking: true,
    enableRetinaScaling: true, // Idhu pixel breakage-ai fix pannum
    backgroundColor: '#ffffff'
});

function checkAuth() {
    const input = document.getElementById('passInput').value;
    if(input === ACCESS_CODE) {
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('app-screen').style.display = 'block';
        setTemplate('images/1.png');
    } else {
        document.getElementById('error-msg').innerText = "Incorrect Access Code";
    }
}

function setTemplate(url) {
    fabric.Image.fromURL(url, (img) => {
        const vp = document.getElementById('viewportArea');
        const scale = Math.min((vp.clientWidth - 80) / img.width, (vp.clientHeight - 80) / img.height, 1);
        canvas.setWidth(img.width * scale);
        canvas.setHeight(img.height * scale);
        canvas.setZoom(scale);
        canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas), { selectable: false, crossOrigin: 'anonymous' });
        saveState();
    }, { crossOrigin: 'anonymous' });
}

// DELETE FIX: Consistent plural removal
function deleteObj() {
    canvas.getActiveObjects().forEach(obj => canvas.remove(obj));
    canvas.discardActiveObject().renderAll();
    saveState();
}

function addText() {
    const t = new fabric.Textbox('Double Tap to Edit', {
        left: 50, top: 50, fontSize: 30, fill: '#1e293b', 
        fontFamily: 'Inter', fontWeight: 'bold', 
        cornerStyle: 'circle', cornerColor: '#7c3aed', transparentCorners: false
    });
    canvas.add(t).setActiveObject(t);
    saveState();
}

// Export Quality Fix: High Multiplier for Gallery
function downloadDesign() {
    canvas.discardActiveObject().renderAll();
    const link = document.createElement('a');
    link.href = canvas.toDataURL({ format: 'png', multiplier: 3 }); 
    link.download = `Design_${Date.now()}.png`;
    link.click();
}

function saveState() { history.push(JSON.stringify(canvas)); }
function undo() { if(history.length > 1) { history.pop(); canvas.loadFromJSON(history[history.length-1], () => canvas.renderAll()); } }

canvas.on({
    'selection:created': updateToolbar,
    'selection:updated': updateToolbar,
    'selection:cleared': () => document.getElementById('floating-toolbar').style.display = 'none'
});

function updateToolbar() {
    const active = canvas.getActiveObject();
    const toolbar = document.getElementById('floating-toolbar');
    if (active) {
        const rect = active.getBoundingRect();
        const offset = document.getElementById('mainCanvas').getBoundingClientRect();
        toolbar.style.display = 'flex';
        toolbar.style.left = (offset.left + rect.left + (rect.width/2) - (toolbar.offsetWidth/2)) + 'px';
        toolbar.style.top = (offset.top + rect.top - 80) + 'px';
    }
}