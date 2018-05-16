var volume;
var slicer;
var gradientEditor;
var info, colourmaps;
var state = {};
var reset;
var filename;
var mobile;

function initPage() {
    window.onresize = autoResize;
    colourmaps = new Popup("colourmap", 400, 200);

    try {
        if (!window.WebGLRenderingContext)
            throw "No browser WebGL support";
        var canvas = document.createElement('canvas');
        var ctx = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    } catch (e) {
        console.log(e);
        return;
    }

    gradientEditor = new GradientEditor(document.getElementById('palette'), updateColourmap);
    var json = getSearchVariable("data");
    if (!json) json = "default.json";
    readFile(decodeURI(json), loadData, true);


    var file = 'data.jpg';
    readFile(decodeURI(file), extractData, true);
}

function loadStoredData(key) {
    if (localStorage[key]) {
        try {
            var parsed = JSON.parse(localStorage[key]);
            state = parsed;
        } catch (e) {
            console.log("parse error: " + e.message);
            localStorage[key] = null;
        }
    }
}

function loadData(src, fn) {
    var parsed = JSON.parse(src);
    if (parsed.volume) {
        state = {}
        state.properties = {};
        state.colourmaps = [{}];
        object = {};
        view = {};
        state.views = [view];
        state.objects = [object];
        object.name = "volume";
        object.samples = parsed.volume.properties.samples;
        object.isovalue = parsed.volume.properties.isovalue;
        object.isowalls = parsed.volume.properties.drawWalls;
        object.isoalpha = parsed.volume.properties.isoalpha;
        object.isosmooth = parsed.volume.properties.isosmooth;
        object.colour = parsed.volume.properties.isocolour;
        object.density = parsed.volume.properties.density;
        object.power = parsed.volume.properties.power;
        if (parsed.volume.properties.usecolourmap) object.colourmap = 0;
        object.tricubicfilter = parsed.volume.properties.tricubicFilter;
        object.zmin = parsed.volume.properties.Zmin;
        object.zmax = parsed.volume.properties.Zmax;
        object.ymin = parsed.volume.properties.Ymin;
        object.ymax = parsed.volume.properties.Ymax;
        object.xmin = parsed.volume.properties.Xmin;
        object.xmax = parsed.volume.properties.Xmax;
        object.brightness = parsed.volume.properties.brightness;
        object.contrast = parsed.volume.properties.contrast;

        object.volume = {};
        object.volume.url = parsed.url;
        object.volume.res = parsed.res;
        object.volume.scale = parsed.scale;

        object.slices = parsed.slicer;

        state.properties.nogui = parsed.nogui;

        view.axes = parsed.volume.properties.axes;
        view.border = parsed.volume.properties.border;
        view.translate = parsed.volume.translate;
        view.rotate = parsed.volume.rotate;
        view.focus = parsed.volume.focus;

        colours.read(parsed.volume.colourmap);
        colours.update();
        state.colourmaps = [colours.palette.get()];
        delete state.colourmaps[0].background;
        state.properties.background = colours.palette.background.html();
    } else {
        state = parsed;
    }

    reset = state; 

    if (getSearchVariable("reset")) {localStorage.removeItem(fn); console.log("Storage cleared");}
    if (!state.objects[0].volume.res) state.objects[0].volume.res = [256, 256, 256];
    if (!state.objects[0].volume.scale) state.objects[0].volume.scale = [1.0, 1.0, 1.0];

    loadTexture();
}

function getData(compact, matrix) {
    if (volume) {
        var vdat = volume.get(matrix);
        console.log(vdat);
        var object = state.objects[0];
        object.saturation = vdat.properties.saturation;
        object.brightness = vdat.properties.brightness;
        object.contrast = vdat.properties.contrast;
        object.zmin = vdat.properties.zmin;
        object.zmax = vdat.properties.zmax;
        object.ymin = vdat.properties.ymin;
        object.ymax = vdat.properties.ymax;
        object.xmin = vdat.properties.xmin;
        object.xmax = vdat.properties.xmax;
        //object.volume.res = parsed.res;
        //object.volume.scale = parsed.scale;
        object.samples = vdat.properties.samples;
        object.isovalue = vdat.properties.isovalue;
        object.isowalls = vdat.properties.isowalls
        object.isoalpha = vdat.properties.isoalpha;
        object.isosmooth = vdat.properties.isosmooth;
        object.colour = vdat.properties.colour;
        object.density = vdat.properties.density;
        object.power = vdat.properties.power;
        object.tricubicfilter = vdat.properties.tricubicFilter;
        if (vdat.properties.usecolourmap)
            object.colourmap = 0;
        else
            delete object.colourmap;

        //Views - single only in old data
        state.views[0].axes = vdat.properties.axes;
        state.views[0].border = vdat.properties.border;
        state.views[0].translate = vdat.translate;
        state.views[0].rotate = vdat.rotate;

        if (slicer)
            state.objects[0].slices = slicer.get();

        state.colourmaps = [colours.palette.get()];
        delete state.colourmaps[0].background;
        state.properties.background = colours.palette.background.html();
    }

    if (compact) return JSON.stringify(state);
    return JSON.stringify(state, null, 2);
}

function loadTexture() {
    var image;

    loadImage(state.objects[0].volume.url, function () {
        image = new Image();

        var headers = request.getAllResponseHeaders();
        var match = headers.match( /^Content-Type\:\s*(.*?)$/mi );
        var mimeType = match[1] || 'image/png';
        var blob = new Blob([request.response], {type: mimeType} );
        image.src =  window.URL.createObjectURL(blob);
        var imageElement = document.createElement("img");

        var reader = new FileReader();
        image.onload = function () {
            console.log("Loaded image: " + image.width + " x " + image.height);
            imageLoaded(image);
        }
    });
}


function imageLoaded(image) {
    if (state.objects[0].slices) {
        slicer = new Slicer(state.objects[0], image, "linear");
    }

    if (state.objects[0].volume) {
        interactive = true;
        volume = new Volume(state.objects[0], image, interactive);
        volume.slicer = slicer; //For axis position
    }

    
    gradientEditor.read(state.colourmaps[0].colours);
    gradientEditor.palette.background = new Color(state.properties.background);
    gradientEditor.update(updateColourmap);

    if (!state.properties.nogui) {
        var gui = new dat.GUI();
        gui.add({"ColorMaps" : function() {window.colourmaps.toggle();}}, 'ColorMaps');
        if (volume) volume.addGUI(gui);
        if (slicer) slicer.addGUI(gui);
    }
//    window.onbeforeunload = saveData;
}

function extractData(src){
    // var binaryImg = atob(blob);
    // var length = binaryImg.length;
    // var ab = new ArrayBuffer(length);
    // var ua = new Uint8Array(ab);
    // for(var i=0; i < length; i++){
    //     ua[i] = binaryImg.charCodeAt(i);
    // }
    // console.log(ua);
}

function autoResize() {
    if (volume) {
        volume.width = 0; 
        volume.height = 0;
        volume.draw();
    }
}

function updateColourmap() {
    if (!gradientEditor) return;
    var gradient = $('gradient');
    gradientEditor.palette.draw(gradient, false);

    if (volume && volume.webgl) {
        volume.webgl.updateTexture(volume.webgl.gradientTexture, gradient, volume.gl.TEXTURE1);
        volume.applyBackground(colours.palette.background.html());
        volume.draw();
    }

    if (slicer) {
        slicer.updateColourmap();
        slicer.draw();
    }
}

var request, progressBar;

function loadImage(imageURI, callback)
{
    request = new XMLHttpRequest();
    request.onloadstart = showProgressBar;
    request.onprogress = updateProgressBar;
    request.onload = callback;
    request.onloadend = hideProgressBar;
    request.open("GET", imageURI, true);
    request.responseType = 'arraybuffer';
    request.send(null);
}

function showProgressBar()
{
    progressBar = document.createElement("progress");
    progressBar.value = 0;
    progressBar.max = 100;
    progressBar.removeAttribute("value");
    document.getElementById('status').appendChild(progressBar);
}

function updateProgressBar(e)
{
    if (e.lengthComputable)
        progressBar.value = e.loaded / e.total * 100;
    else
        progressBar.removeAttribute("value");
}

function hideProgressBar()
{
    document.getElementById('status').removeChild(progressBar);
}

/**
 * @constructor
 */
function Popup(id, x, y) {
    this.el = document.getElementById(id);
    this.style = this.el.style;
    if (x && y) {
        this.style.left = x + 'px';
        this.style.top = y + 'px';
    } else {
        this.style.left = ((window.innerWidth - this.el.offsetWidth) * 0.5) + 'px';
        this.style.top = ((window.innerHeight - this.el.offsetHeight) * 0.5) + 'px';
    }
    this.drag = false;
}

Popup.prototype.toggle = function() {
    if (this.style.visibility == 'visible')
        this.hide();
    else
        this.show();
}

Popup.prototype.show = function() {
    this.style.visibility = 'visible';
}

Popup.prototype.hide = function() {
    this.style.visibility = 'hidden';
}

