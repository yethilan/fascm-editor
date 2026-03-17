const ACCESS_CODE = "FASCM@2026"; 
let undoStack = [];
let redoStack = [];

const canvas = new fabric.Canvas('mainCanvas', { 
    preserveObjectStacking: true,
    backgroundColor: '#fff',
    selectionColor: 'rgba(139, 61, 255, 0.1)'
});

// Login check
function checkAuth() {
    const input = document.getElementById('passInput').value;
    if(input === ACCESS_CODE) {
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('app-screen').style.display = 'block';
        setTemplate('images/1.png');
    } else {
        document.getElementById('error-msg').innerText = "Invalid access code.";
    }
}

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

// SMART PALETTE LOGIC - FIXED FOR TEXT COLOR
function extractSmartPalette(url) {
    const img = new Image(); img.crossOrigin = "Anonymous"; img.src = url;
    img.onload = () => {
        const c = document.createElement('canvas'); const ctx = c.getContext('2d');
        c.width = 5; c.height = 5; ctx.drawImage(img, 0, 0, 5, 5);
        const data = ctx.getImageData(0,0,5,5).data;
        const colors = new Set(['#ffffff', '#000000', '#FFD700', '#FF0000']); // Added some default vibrant colors
        
        for(let i=0; i<data.length; i+=4) {
            const hex = tinycolor({r:data[i], g:data[i+1], b:data[i+2]}).toHexString();
            colors.add(hex);
            colors.add(tinycolor(hex).isDark() ? '#ffffff' : '#111827');
        }
        
        const container = document.getElementById('palette-container');
        container.innerHTML = '';
        Array.from(colors).slice(0, 10).forEach(col => {
            const s = document.createElement('div'); 
            s.className = 'mini-swatch'; 
            s.style.background = col;
            s.onclick = () => { 
                const activeObj = canvas.getActiveObject();
                if(activeObj) { 
                    // TEXT COLOR FIX: Proper way to set text color in Fabric.js
                    activeObj.set('fill', col); 
                    canvas.renderAll(); 
                    saveHistory(); 
                }
            };
            container.appendChild(s);
        });
    };
}

// Color Input fix (for the manual color picker)
document.getElementById('floatColor').oninput = (e) => {
    const a = canvas.getActiveObject();
    if(a) { 
        a.set('fill', e.target.value); 
        canvas.renderAll(); 
    }
};

function updateToolbar() {
    const active = canvas.getActiveObject();
    const toolbar = document.getElementById('floating-toolbar');
    if (active) {
        const rect = active.getBoundingRect();
        const offset = document.getElementById('mainCanvas').getBoundingClientRect();
        toolbar.style.display = 'flex';
        toolbar.style.left = (offset.left + rect.left + (rect.width/2) - (toolbar.offsetWidth/2)) + 'px';
        toolbar.style.top = (offset.top + rect.top - 65) + 'px';
        document.getElementById('fontFamily').style.display = active.type === 'textbox' ? 'block' : 'none';
    } else {
        toolbar.style.display = 'none';
    }
}

canvas.on('selection:created', updateToolbar);
canvas.on('selection:updated', updateToolbar);
canvas.on('selection:cleared', () => document.getElementById('floating-toolbar').style.display = 'none');
canvas.on('object:moving', updateToolbar);
canvas.on('object:scaling', updateToolbar);

function addText() {
    const z = canvas.getZoom();
    const t = new fabric.Textbox('NANDHAKUMAR', {
        left: (canvas.width/2)/z, top: (canvas.height/2)/z, width: 250/z, 
        fontSize: 40/z, fill: '#000000', fontFamily: 'Montserrat', 
        textAlign: 'center', originX: 'center', fontWeight: 'bold'
    });
    canvas.add(t).setActiveObject(t);
    saveHistory();
}
