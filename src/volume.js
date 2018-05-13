function Volume(image, gl, parentDiv){
    this.image = image;
    this.canvas = document.createElement('canvas');
    this.canvas.style.cssText = "width: 100%; height: 100%; z-index: 0; margin: 0px; padding: 0px; background: black; border: none; display:block;";

    this.webgl = new WebGL(this.canvas);
    this.gl = this.webgl.gl;
    
    if(!parentDiv) parentDiv = document.body;
    parentDiv.appendChild(this.canvas);

    this.linePositionBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.linePositionBuffer);

    var vertexPositions = [-1.0, 0.0, 0.0,
                            1.0,  0.0,  0.0,
                            0.0, -1.0,  0.0,
                            0.0,  1.0,  0.0,
                            0.0,  0.0, -1.0,
                            0.0, 0.0, 1.0 ];

    this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(vertexPositions), this.gl.STATIC_DRAW);
    this.linePositionBuffer.itemSize = 3;
    this.linePositionBuffer.numItems = 6;

    this.lineColorBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.lineColorBuffer);
    var vertexColours =  [1.0, 0.0, 0.0, 1.0,
                          1.0, 0.0, 0.0, 1.0,
                          0.0, 1.0, 0.0, 1.0,
                          0.0, 1.0, 0.0, 1.0,
                          0.0, 0.0, 1.0, 1.0,
                          0.0, 0.0, 1.0, 1.0];

    this.res = 256
    this.tiles = [this.image.width / this.res[0],
                  this.image.height / this.res[1]];

    this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(vertexColours), this.gl.STATIC_DRAW);
    this.lineColorBuffer.itemSize = 4;
    this.lineColorBuffer.numItes = 6;

    this.box([0.0, 0.0, 0.0], [1.0, 1.0, 1.0]);

    this.webgl.init2dBuffers(this.gl.TEXTURE1);
    
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);

    this.webgl.loadTexture(image, this.gl.LINEAR);

    var IE11 = !!window.MSInputMethodContext;  //More evil user-agent sniffing, broken WebGL on windows forces me to do this
    this.lineprogram = new WebGLProgram(this.gl, 'line-vs', 'line-fs');
    this.lineprogram.setup(["aVertexPosition", "aVertexColour"], ["uColour", "uAlpha"]);
    this.gl.vertexAttribPointer(this.lineprogram.attributes["aVertexPosition"], this.linePositionBuffer.itemSize, this.gl.FLOAT, false, 0, 0);
    this.gl.vertexAttribPointer(this.lineprogram.attributes["aVertexColour"], this.lineColorBuffer.itemSize, this.gl.FLOAT, false, 0, 0);

    var defines = "precision highp float; const highp vec2 slices = vec2(" + this.tiles[0] + "," + this.tiles[1] + ");\n";
    defines += (IE11 ? "#define IE11\n" : "#define NOT_IE11\n");
    var maxSamples =  256;
    defines += "const int maxSamples = " + maxSamples + ";\n\n\n\n\n\n"; //Extra newlines so errors in main shader have correct line #
}


Volume.prototype.box = function(min, max){
    var vertices = new Float32Array([
        min[0], min[1], min[2],
        min[0], min[1], max[2],
        min[0], max[1], min[2],
        max[0], min[1], min[2],
        min[0], max[1], max[2],
        max[0], min[1], max[2],
        max[0], max[1], min[2],
        max[0], max[1], max[2],
    ]);

    var indices = new Uint16Array([
        0, 1, 1, 2, 2, 3, 3, 0,
        4, 5, 5, 6, 6, 7, 7, 4,
        0, 4, 3, 7, 1, 5, 2, 6
    ]);

    this.boxPositionBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.boxPositionBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, vertices, this.gl.STATIC_DRAW)
    this.boxPositionBuffer.itemSize = 3;

    this.boxIndexBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.boxIndexBuffer);
    this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, indices, this.gl.STATIC_DRAW);
    this.boxIndexBuffer.numItems = 24;

    
}
