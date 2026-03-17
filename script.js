const canvas = new fabric.Canvas('mainCanvas', { 
    preserveObjectStacking: true, 
    renderOnAddRemove: false,
    statefullCache: false
});

let activeCropper;
let originalSize = { w: 0, h: 0 };

function setTemplate(url) {
    fabric.Image.fromURL(url, function(img) {
        if(!img) return;
        originalSize.w = img.width;
        originalSize.h = img.height;

        const maxEdit = 1200;
        const scale = (img.width > maxEdit) ? maxEdit / img.width : 1;

        canvas.setWidth(img.width * scale);
        canvas.setHeight(img.height * scale);
        canvas.setZoom(scale);

        img.set({ objectCaching: false });
        canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas));

        const view = document.querySelector('.canvas-viewport');
        const uiScale = Math.min((view.clientWidth - 20) / canvas.width, (view.clientHeight - 20) / canvas.height);
        document.querySelector('.canvas-shadow-box').style.transform = `scale(${uiScale})`;
        
        extractColors(url);
    }, { crossOrigin: 'anonymous' });
}

function addText() {
    const text = new fabric.IText('Double Tap', {
        left: canvas.width / (2 * canvas.getZoom()),
        top: canvas.height / (2 * canvas.getZoom()),
        fontSize: 80,
        fill: '#000000',
        originX: 'center',
        objectCaching: false,
        cornerSize: 24,
        cornerStyle: 'circle',
        cornerColor: '#0078d4',
        transparentCorners: false
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
        activeCropper = new Cropper(cropImg, { aspectRatio: NaN });
    };
    reader.readAsDataURL(e.target.files[0]);
});

function confirmCrop() {
    const data = activeCropper.getCroppedCanvas({ maxWidth: 800 }).toDataURL('image/jpeg', 0.8);
    fabric.Image.fromURL(data, (img) => {
        img.set({ objectCaching: false });
        img.scaleToWidth(canvas.width / (3 * canvas.getZoom()));
        canvas.add(img).centerObject(img).setActiveObject(img);
        canvas.renderAll();
        document.getElementById('cropBox').style.display = 'none';
    });
}

function downloadDesign() {
    canvas.setZoom(1);
    canvas.setWidth(originalSize.w);
    canvas.setHeight(originalSize.h);
    const link = document.createElement('a');
    link.href = canvas.toDataURL({ format: 'png', quality: 1.0 });
    link.download = 'FASCM_Design.png';
    link.click();
    setTemplate(canvas.backgroundImage._element.src);
}

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
        for(let i=0; i<data.length; i+=16) {
            const hex = tinycolor({r:data[i], g:data[i+1], b:data[i+2]}).toHexString();
            if(tinycolor(hex).getBrightness() < 240) set.add(hex);
        }
        const div = document.getElementById('palette');
        div.innerHTML = '';
        Array.from(set).slice(0, 8).forEach(col => {
            const s = document.createElement('div');
            s.className = 'swatch';
            s.style.background = col;
            s.onclick = () => { const a = canvas.getActiveObject(); if(a) { a.set('fill', col); canvas.renderAll(); } };
            div.appendChild(s);
        });
    };
}

function deleteObj() { canvas.remove(canvas.getActiveObject()); canvas.renderAll(); }
canvas.on('selection:created', () => document.getElementById('objControls').style.display = 'block');
canvas.on('selection:cleared', () => document.getElementById('objControls').style.display = 'none');