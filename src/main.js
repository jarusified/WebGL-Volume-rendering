function init(){
    var json = "default.json"
    readFile(decodeURI(json), loadData, true);
}


function loadData(src, fn){
    var parsed = JSON.parse(src);
    if (parsed.volume) {
        //Old data format
        state = {}
        state.properties = {};
        state.colourmaps = [{}];
        object = {};
        view = {};
        state.views = [view];
        state.objects = [object];
        //Copy fields to their new locations
        //Objects
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
        //The volume data sub-object
        object.volume = {};
        object.volume.url = parsed.url;
        object.volume.res = parsed.res;
        object.volume.scale = parsed.scale;
        //The slicer properties
        object.slices = parsed.slicer;
        //Properties - global rendering properties
        state.properties.nogui = parsed.nogui;
        //Views - single only in old data
        view.axes = parsed.volume.properties.axes;
        view.border = parsed.volume.properties.border;
        view.translate = parsed.volume.translate;
        view.rotate = parsed.volume.rotate;
        view.focus = parsed.volume.focus;

        //Colourmap
        colours.read(parsed.volume.colourmap);
        colours.update();
        state.colourmaps = [colours.palette.get()];
        delete state.colourmaps[0].background;
        state.properties.background = colours.palette.background.html();
    } else {
        //New format - LavaVu compatible
        state = parsed;
    }

    reset = state; //Store orig for reset
    //Storage reset?
    if (getSearchVariable("reset")) {localStorage.removeItem(fn); console.log("Storage cleared");}
    /* LOCALSTORAGE DISABLED
    //Load any stored presets for this file
    filename = fn;
    loadStoredData(fn);
    */

    //Setup default props from original data...
    //state.objects = reset.objects;
    if (!state.objects[0].volume.res) state.objects[0].volume.res = [256, 256, 256];
    if (!state.objects[0].volume.scale) state.objects[0].volume.scale = [1.0, 1.0, 1.0];
    
    loadTexture();
}

function loadTexture(src){
    loadImage(state.objects[0].volume.url, function (){
        let image = new Image();
        let headers = request.getAllResponseHeaders();
        var match = headers.match( /^Content-Type\:\s*(.*?)$/mi );
        var mimeType = match[1] || 'image/png';
        var blob = new Blob([request.response], {type: mimeType} );
        image.src =  window.URL.createObjectURL(blob);
        var imageElement = document.createElement("img");
        
        image.onload = function() {
            ctx = initContext();
            render(image, ctx);
        }
    });
}

function initContext(){
    let canvas, ctx;    
    try{
        if(!window.WebGLRenderingContext)
            throw 'WebGL not supported by the Browser';
        canvas = document.createElement('canvas');
        ctx = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        if(!ctx){
            throw 'WebGL context not formed'
        }
    }
    catch(e){
        $('#terminal').innerHTML = 'Browser not supported';
        return ;
    }
    return ctx;
}


function loadImage(imageURI, callback){
    request = new XMLHttpRequest();
    request.onload = callback;
    request.open('GET', imageURI, true);
    request.responseType = 'arraybuffer';
    request.send(null);
}

function render(image, ctx){
    console.log("Rendering begins");
    volume = new Volume(image, ctx);
}

