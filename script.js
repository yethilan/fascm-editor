// 1. Password Lock
const ACCESS_CODE = "FASCM@2026"; 

document.addEventListener('DOMContentLoaded', function() {
    let userInput = prompt("FASCM எடிட்டரைப் பயன்படுத்த Access Code-ஐ உள்ளிடவும்:");
    if (userInput === ACCESS_CODE) {
        setTemplate('images/1.png');
    } else {
        alert("தவறான கோடு!");
        document.body.innerHTML = `<div style="text-align:center; margin-top:100px; padding:20px;"><h1>Access Denied</h1><p>சரியான Access Code பெற அட்மினை அணுகவும்.</p><button onclick="location.reload()" style="padding:10px 20px; background:#0078d4; color:white; border:none; border-radius:5px;">Retry</button></div>`;
    }
});

// 2. Canvas Engine Setup
const canvas = new fabric.Canvas('mainCanvas', { 
    preserveObjectStacking: true, 
    statefullCache: false,
    allowTouchScrolling: true
});

let activeCropper;
let originalSize = { w: 0, h: 0 };

const touchSettings = {
    cornerSize: 38, touchCornerSize: 48,
    cornerStyle: 'circle', cornerColor: '#0078d4',
    transparentCorners: false, borderColor: '#0078d4',
    borderScaleFactor: 2.5, objectCaching: false
};

// 3. Template & Zoom Management
function setTemplate(url) {
    fabric.Image.fromURL(url, function(img) {
        if(!img) return;
        originalSize.w = img.width;
        originalSize.h = img.height;

        const maxEdit = window.innerWidth < 768 ? 1000 : 1500;
        const scale = (img.width > maxEdit) ? maxEdit / img.width : 1;

        canvas.setWidth(img.width * scale);
        canvas.setHeight(img.height * scale);
        canvas.setZoom(scale);

        img.set({ objectCaching: false });
        canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas));
        updateUIZoom();
        extractColors(url);
    }, { crossOrigin: 'anonymous' });
}

function updateUIZoom() {
    const view = document.querySelector('.canvas-viewport');
    const zoom = Math.min((view.clientWidth - 20) / canvas.width, (view.clientHeight - 20) / canvas.height);
    document.querySelector('.canvas-shadow-box').style.transform = `scale(${zoom})`;
}

// 4. Keyboard & Focus Fix
canvas.on('text:editing:entered', function(e) {
    if (window.innerWidth < 768) {
        const viewport = document.querySelector('.canvas-viewport');
        viewport.style.paddingBottom = "350px"; 
        setTimeout(() => {
            const el = document.querySelector('.canvas-shadow-box');
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 300);
    }
});

canvas.on('text:editing:exited', function() {
    document.querySelector('.canvas-viewport').style.paddingBottom = "20px";
});

// 5. Tools (Text & Photo)
function addText() {
    const text = new fabric.Textbox('Double Tap to Edit', {
        left: canvas.width / (2 * canvas.getZoom()),
        top: canvas.height / (2 * canvas.getZoom()),
        fontSize: 80, 
        fill: '#000000', // டீஃபால்ட் கருப்பு
        fontFamily: 'Arial',
        originX: 'center',
        width: 400,
        splitByGrapheme: true,
        ...touchSettings
    });
    canvas.add(text).setActiveObject(text);
    canvas.renderAll();
}

document.getElementById('upload').addEventListener('change', function(e) {
    const reader = new FileReader();
    reader.onload = (f) => {
        document.getElementById('cropBox').style.display = 'block';
        const cropImg = document.getElementById('cropImg');
        cropImg.src = f.target.result;
        if(activeCropper) activeCropper.destroy();
        activeCropper = new Cropper(cropImg, { aspectRatio: NaN, viewMode: 1, dragMode: 'move' });
    };
    reader.readAsDataURL(e.target.files[0]);
});

function confirmCrop() {
    const data = activeCropper.getCroppedCanvas({ maxWidth: 800 }).toDataURL('image/jpeg', 0.8);
    fabric.Image.fromURL(data, (img) => {
        img.set({ ...touchSettings });
        img.scaleToWidth(canvas.width / (3 * canvas.getZoom()));
        canvas.add(img).centerObject(img).setActiveObject(img);
        canvas.renderAll();
        document.getElementById('cropBox').style.display = 'none';
    });
}

// 6. Colors & Export
function extractColors(url) {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = url;
    img.onload = () => {
        const c = document.createElement('canvas');
        const ctx = c.getContext('2d');
        c.width = 10; c.height = 10;
        ctx.drawImage(img, 0, 0, 10, 10);
        const data = ctx.getImageData(0,0,10,10).data;
        const set = new Set();
        
        // எப்போதும் வெள்ளை கலரை முதலில் சேர்க்கவும்
        set.add('#ffffff'); 
        
        for(let i=0; i<data.length; i+=16) {
            const hex = tinycolor({r:data[i], g:data[i+1], b:data[i+2]}).toHexString();
            // ரொம்ப பளபளப்பான கலர்களைத் தவிர்க்க (வெள்ளை தவிர)
            if(tinycolor(hex).getBrightness() < 240) set.add(hex);
        }
        
        const div = document.getElementById('palette');
        div.innerHTML = '';
        
        Array.from(set).slice(0, 9).forEach(col => {
            const s = document.createElement('div');
            s.className = 'swatch';
            s.style.background = col;
            
            // கலர் மாற்றுவதற்கான லாஜிக்
            s.onclick = () => { 
                const a = canvas.getActiveObject(); 
                if(a) { 
                    a.set('fill', col); 
                    canvas.renderAll(); 
                } 
            };
            div.appendChild(s);
        });
    };
}

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

async function shareDesign() {
    try {
        const blob = await (await fetch(canvas.toDataURL())).blob();
        const file = new File([blob], 'design.png', { type: 'image/png' });
        if (navigator.share) navigator.share({ files: [file] });
        else alert("Download button using.");
    } catch(e) { console.log(e); }
}

function deleteObj() { 
    const a = canvas.getActiveObject();
    if(a) { canvas.remove(a); canvas.renderAll(); }
}

// UI Triggers
canvas.on('selection:created', () => document.getElementById('objControls').style.display = 'block');
canvas.on('selection:cleared', () => document.getElementById('objControls').style.display = 'none');
document.getElementById('customColor').oninput = (e) => {
    const o = canvas.getActiveObject();
    if(o) { o.set('fill', e.target.value); canvas.renderAll(); }
};
window.addEventListener('resize', updateUIZoom);