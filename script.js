// இமேஜ் ஆட் செய்யும் பங்க்ஷன் - முழுமையாகச் சரிசெய்யப்பட்டது
function confirmCrop() {
    const data = window.cropper.getCroppedCanvas().toDataURL('image/png');
    
    fabric.Image.fromURL(data, (img) => {
        // தற்போதுள்ள கேன்வாஸ் ஜூம் அளவைக் கணக்கிடுதல்
        const currentZoom = canvas.getZoom();
        
        // இமேஜின் அளவை கேன்வாஸிற்கு ஏற்றவாறு அட்ஜஸ்ட் செய்தல்
        img.scaleToWidth(200 / currentZoom); 
        
        img.set({
            cornerSize: 10 / currentZoom, // ஜூமிற்கு ஏற்றவாறு கார்னர் புள்ளிகள்
            transparentCorners: false,
            cornerColor: '#8b3dff',
            cornerStyle: 'circle',
            borderScaleFactor: 2 / currentZoom
        });

        // இமேஜை கேன்வாஸின் நடுவில் சேர்த்தல்
        canvas.add(img);
        canvas.centerObject(img); 
        canvas.setActiveObject(img);
        
        document.getElementById('cropBox').style.display = 'none';
        canvas.renderAll();
        saveHistory(); // ஹிஸ்டரியில் சேமிக்க
    });
}

// டெக்ஸ்ட் ஆட் செய்யும் பங்க்ஷன்
function addText() {
    const currentZoom = canvas.getZoom();
    const text = new fabric.Textbox('இங்கே டைப் செய்யவும்', {
        left: (canvas.width / 2) / currentZoom,
        top: (canvas.height / 2) / currentZoom,
        width: 250 / currentZoom,
        fontSize: 40 / currentZoom,
        fill: '#000000',
        fontFamily: 'Arial',
        originX: 'center',
        originY: 'center',
        cornerSize: 10 / currentZoom,
        cornerColor: '#8b3dff',
        cornerStyle: 'circle'
    });
    
    canvas.add(text).setActiveObject(text);
    canvas.renderAll();
    saveHistory();
}