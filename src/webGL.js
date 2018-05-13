function WebGL(canvas, options) {
    this.program = null;
    this.modelView = new ViewMatrix();
    this.perspective = new ViewMatrix();
    this.textures = [];
    this.timer = null;

    if (!window.WebGLRenderingContext) throw "No browser WebGL support";

    // Try to grab the standard context. If it fails, fallback to experimental.
    try {
        this.gl = canvas.getContext("webgl", options) || canvas.getContext("experimental-webgl", options);
    } catch (e) {
        console.log("detectGL exception: " + e);
        throw "No context"
    }
    this.viewport = new Viewport(0, 0, canvas.width, canvas.height);
    if (!this.gl) throw "Failed to get context";
}

WebGL.prototype.setMatrices = function() {
    //Model view matrix
    this.gl.uniformMatrix4fv(this.program.mvMatrixUniform, false, this.modelView.matrix);
    //Perspective matrix
    this.gl.uniformMatrix4fv(this.program.pMatrixUniform, false, this.perspective.matrix);
    //Normal matrix
    if (this.program.nMatrixUniform) {
        var nMatrix = mat4.create(this.modelView.matrix);
        mat4.inverse(nMatrix);
        mat4.transpose(nMatrix);
        this.gl.uniformMatrix4fv(this.program.nMatrixUniform, false, nMatrix);
    }
}

WebGL.prototype.initDraw2d = function() {
    this.gl.viewport(this.viewport.x, this.viewport.y, this.viewport.width, this.viewport.height);

    this.gl.enableVertexAttribArray(this.program.attributes["aVertexPosition"]);
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexPositionBuffer);
    this.gl.vertexAttribPointer(this.program.attributes["aVertexPosition"], this.vertexPositionBuffer.itemSize, this.gl.FLOAT, false, 0, 0);

    if (this.program.attributes["aTextureCoord"]) {
        this.gl.enableVertexAttribArray(this.program.attributes["aTextureCoord"]);
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.textureCoordBuffer);
        this.gl.vertexAttribPointer(this.program.attributes["aTextureCoord"], this.textureCoordBuffer.itemSize, this.gl.FLOAT, false, 0, 0);
    }

    this.setMatrices();
}

WebGL.prototype.updateTexture = function(texture, image, unit) {
    //Set default texture unit if not provided
    if (unit == undefined) unit = this.gl.TEXTURE0;
    this.gl.activeTexture(unit);
    this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
    this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, image);
    this.gl.bindTexture(this.gl.TEXTURE_2D, null);
}

WebGL.prototype.init2dBuffers = function(unit) {
    //Set default texture unit if not provided
    if (unit == undefined) unit = this.gl.TEXTURE0;
    //All output drawn onto a single 2x2 quad
    this.vertexPositionBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexPositionBuffer);
    var vertexPositions = [1.0,1.0,  -1.0,1.0,  1.0,-1.0,  -1.0,-1.0];
    this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(vertexPositions), this.gl.STATIC_DRAW);
    this.vertexPositionBuffer.itemSize = 2;
    this.vertexPositionBuffer.numItems = 4;

    //Gradient texture
    this.gl.activeTexture(unit);
    this.gradientTexture = this.gl.createTexture();
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.gradientTexture);

    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST);

    //Texture coords
    this.textureCoordBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.textureCoordBuffer);
    var textureCoords = [1.0, 1.0,  0.0, 1.0,  1.0, 0.0,  0.0, 0.0];
    this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(textureCoords), this.gl.STATIC_DRAW);
    this.textureCoordBuffer.itemSize = 2;
    this.textureCoordBuffer.numItems = 4;
}

WebGL.prototype.loadTexture = function(image, filter) {
    if (filter == undefined) filter = this.gl.NEAREST;
    this.texid = this.textures.length;
    this.textures.push(this.gl.createTexture());
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.textures[this.texid]);
    //this.gl.pixelStorei(this.gl.UNPACK_FLIP_Y_WEBGL, true);
    //(Ability to set texture type?)
    this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.LUMINANCE, this.gl.LUMINANCE, this.gl.UNSIGNED_BYTE, image);
    //this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, image);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, filter);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, filter);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
    this.gl.bindTexture(this.gl.TEXTURE_2D, null);
    return this.textures[this.texid];
}

WebGL.prototype.setPerspective = function(fovy, aspect, znear, zfar) {
    this.perspective.matrix = mat4.perspective(fovy, aspect, znear, zfar);
}

WebGL.prototype.use = function(program) {
    this.program = program;
    if (this.program.program)
        this.gl.useProgram(this.program.program);
}

  /**
   * @constructor
   */
//Program object
function WebGLProgram(gl, vs, fs) {
    //Can be passed source directly or script tag
    this.program = null;
    console.log(getSourceFromElement(vs));
    if (vs.indexOf("main") < 0) vs = getSourceFromElement(vs);
    if (fs.indexOf("main") < 0) fs = getSourceFromElement(fs);
    //Pass in vertex shader, fragment shaders...
    this.gl = gl;
    if (this.program && this.gl.isProgram(this.program))
    {
        //Clean up previous shader set
        if (this.gl.isShader(this.vshader))
        {
            this.gl.detachShader(this.program, this.vshader);
            this.gl.deleteShader(this.vshader);
        }
        if (this.gl.isShader(this.fshader))
        {
            this.gl.detachShader(this.program, this.fshader);
            this.gl.deleteShader(this.fshader);
        }
        this.gl.deleteProgram(this.program);  //Required for chrome, doesn't like re-using this.program object
    }

    this.program = this.gl.createProgram();

    this.vshader = this.compileShader(vs, this.gl.VERTEX_SHADER);
    this.fshader = this.compileShader(fs, this.gl.FRAGMENT_SHADER);

    this.gl.attachShader(this.program, this.vshader);
    this.gl.attachShader(this.program, this.fshader);

    this.gl.linkProgram(this.program);

    if (!this.gl.getProgramParameter(this.program, this.gl.LINK_STATUS)) {
        throw "Could not initialise shaders: " + this.gl.getProgramInfoLog(this.program);
    }
}

WebGLProgram.prototype.compileShader = function(source, type) {
    var shader = this.gl.createShader(type);
    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);
    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS))
        throw this.gl.getShaderInfoLog(shader);
    return shader;
}

//Setup and load uniforms
WebGLProgram.prototype.setup = function(attributes, uniforms, noenable) {
    if (!this.program) return;
    if (attributes == undefined) attributes = ["aVertexPosition", "aTextureCoord"];
    this.attributes = {};
    var i;
    for (i in attributes) {
        this.attributes[attributes[i]] = this.gl.getAttribLocation(this.program, attributes[i]);
        if (!noenable) this.gl.enableVertexAttribArray(this.attributes[attributes[i]]);
    }

    this.uniforms = {};
    for (i in uniforms)
        this.uniforms[uniforms[i]] = this.gl.getUniformLocation(this.program, uniforms[i]);
    this.mvMatrixUniform = this.gl.getUniformLocation(this.program, "uMVMatrix");
    this.pMatrixUniform = this.gl.getUniformLocation(this.program, "uPMatrix");
    this.nMatrixUniform = this.gl.getUniformLocation(this.program, "uNMatrix");
}


