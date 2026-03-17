const ACCESS_CODE = "FASCM@2026"; 

document.addEventListener('DOMContentLoaded', function() {
    let userInput = prompt("FASCM எடிட்டரைப் பயன்படுத்த Access Code-ஐ உள்ளிடவும்:");
    if (userInput === ACCESS_CODE) {
        setTemplate('images/1.png');
    } else {
        document.body.innerHTML = `<h1 style="text-align:center; margin-top:50px;">Access Denied</h1>`;
    }
});

const canvas = new fabric.Canvas('mainCanvas', { 
    preserveObjectStacking: true, 
    allowTouchScrolling: true,
    stopContextMenu: true 
});

let originalSize = { w: 0, h: 0 };
const touchSettings = {
    cornerSize: 35, touchCornerSize: 45,
    cornerStyle: 'circle', cornerColor: '#0078d4',
    transparentCorners: false, borderColor: '#0078d4',
    objectCaching: false
};

function setTemplate(url) {
    fabric.Image.fromURL(url, function(img) {
        if(!img) return;
        originalSize.w = img.width;
        originalSize.h = img.height;

        // ஸ்டேபிளான அளவு (1000px என்பது போர்டின் நிலையான அளவு)
        const boardWidth = 1000;
        const scale = boardWidth / img.width;

        canvas.setWidth(img.width * scale);
        canvas.setHeight(img.height * scale);
        canvas.setZoom(scale);

        canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas));
        extractColors(url);
    }, { crossOrigin: 'anonymous' });
}

// 1. ஃபான்ட் மாற்றும் வசதி
function changeFont(fontName) {
    const active = canvas.getActiveObject();
    if (active && active.type === 'textbox') {
        active.set('fontFamily', fontName);
        canvas.renderAll();
    }
}

function addText() {
    const text = new fabric.Textbox('Double Tap', {
        left: canvas.width / (2 * canvas.getZoom()),
        top: canvas.height / (2 * canvas.getZoom()),
        fontSize: 80, 
        fill: '#000000', 
        fontFamily: 'Arial',
        originX: 'center',
        width: 300,
        ...touchSettings
    });
    canvas.add(text).setActiveObject(text);
    canvas.renderAll();
}

// 2. ஸ்டேபிளான எடிட்டிங் (ஜூம் தடுத்தல்)
canvas.on('text:editing:entered', function() {
    // டெக்ஸ்ட் எடிட் செய்யும்போது கேன்வாஸ் போர்டு அப்படியே இருக்கும், ஜூம் ஆகாது
    if(window.innerWidth < 768) {
        document.querySelector('.canvas-viewport').style.paddingBottom = "300px";
    }
});

canvas.on('text:editing:exited', function() {
    document.querySelector('.canvas-viewport').style.paddingBottom = "50px";
});

// 3. கலர் பேலட்டில் வெள்ளை சேர்த்தல்
function extractColors(url) {
    const img = new Image(); img.crossOrigin = "Anonymous"; img.src = url;
    img.onload = () => {
        const c = document.createElement('canvas'); const ctx = c.getContext('2d');
        c.width = 10; c.height = 10; ctx.drawImage(img, 0, 0, 10, 10);
        const data = ctx.getImageData(0,0,10,10).data;
        const set = new Set();
        set.add('#ffffff'); // வெள்ளை
        set.add('#000000'); // கருப்பு
        for(let i=0; i<data.length; i+=16) {
            const hex = tinycolor({r:data[i], g:data[i+1], b:data[i+2]}).toHexString();
            if(tinycolor(hex).getBrightness() < 240) set.add(hex);
        }
        const div = document.getElementById('palette'); div.innerHTML = '';
        Array.from(set).slice(0, 10).forEach(col => {
            const s = document.createElement('div'); s.className = 'swatch'; s.style.background = col;
            s.onclick = () => { const a = canvas.getActiveObject(); if(a) { a.set('fill', col); canvas.renderAll(); } };
            div.appendChild(s);
        });
    };
}

// 4. டவுன்லோட் & டெலீட்
function downloadDesign() {
    const bg = canvas.backgroundImage._element.src;
    canvas.setZoom(1);
    canvas.setWidth(originalSize.w);
    canvas.setHeight(originalSize.h);
    const link = document.createElement('a');
    link.href = canvas.toDataURL({ format: 'png', quality: 1.0 });
    link.download = 'FASCM_Design.png';
    link.click();
    setTemplate(bg);
}

function deleteObj() { 
    const a = canvas.getActiveObject(); if(a) { canvas.remove(a); canvas.renderAll(); }
}

canvas.on('selection:created', () => document.getElementById('objControls').style.display = 'block');
canvas.on('selection:cleared', () => document.getElementById('objControls').style.display = 'none');