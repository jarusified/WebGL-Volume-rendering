function init(){
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

    var json = "default.json"
    readFile(decodeURI(json), loadData, true);
}


function loadData(){
    loadTexture();
}

function loadTexture(){
    let image = new Image();
    let headers = request.getAllResponseHeaders();
    var match = headers.match( /^Content-Type\:\s*(.*?)$/mi );
    var mimeType = match[1] || 'image/png';
    var blob = new Blob([request.response], {type: mimeType} );
    image.src =  window.URL.createObjectURL(blob);
    var imageElement = document.createElement("img");

    image.onload = function() {
        render(image);
    }
}


function render(image){
    volume = new Voluem(image);
}

