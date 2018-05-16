function Volume(props, image, interactive, parentEl) {
    this.image = image;
    this.canvas = document.createElement("canvas");
    this.canvas.style.cssText = "width: 100%; height: 100%; z-index: 0; margin: 0px; padding: 0px; background: black; border: none; display:block;";
    if (!parentEl) parentEl = document.body;
    parentEl.appendChild(this.canvas);

    this.canvas.mouse = new Mouse(this.canvas, this);
    this.canvas.mouse.moveUpdate = true; 

    this.background = new Color(0xff404040);
    this.borderColour = new Color(0xffbbbbbb);

    this.width = this.height = 0; 

    this.webgl = new WebGL(this.canvas);
    this.gl = this.webgl.gl;

    this.rotating = false;
    this.translate = [0,0,4];
    this.rotate = quat4.create();
    quat4.identity(this.rotate);
    this.focus = [0,0,0];
    this.centre = [0,0,0];
    this.modelsize = 1;
    this.scale = [1, 1, 1];
    this.orientation = 1.0; 
    this.fov = 45.0;
    this.focalLength = 1.0 / Math.tan(0.5 * this.fov * Math.PI/180);
    this.resolution = props.volume["res"];

    
    this.res = props.volume["res"];
    this.dims = props.volume["scale"];
    this.scaling = this.dims;

    if (props.volume.autoscale) {
        var maxn = Math.max.apply(null, this.res);
        this.scaling = [this.res[0] / maxn * this.dims[0], 
                        this.res[1] / maxn * this.dims[1],
                        this.res[2] / maxn * this.dims[2]];
    }
    this.tiles = [this.image.width / this.res[0],
                  this.image.height / this.res[1]];
    this.iscale = [1.0 / this.scaling[0], 1.0 / this.scaling[1], 1.0 / this.scaling[2]]

    //Set dims
    this.centre = [0.5*this.scaling[0], 0.5*this.scaling[1], 0.5*this.scaling[2]];
    this.modelsize = Math.sqrt(3);
    this.focus = this.centre;

    this.translate[2] = -this.modelsize*1.25;


    this.linePositionBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.linePositionBuffer);
    var vertexPositions = [-1.0,  0.0,  0.0,
                           1.0,  0.0,  0.0,
                           0.0, -1.0,  0.0, 
                           0.0,  1.0,  0.0, 
                           0.0,  0.0, -1.0, 
                           0.0,  0.0,  1.0];
    this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(vertexPositions), this.gl.STATIC_DRAW);
    this.linePositionBuffer.itemSize = 3;
    this.linePositionBuffer.numItems = 6;

    this.lineColourBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.lineColourBuffer);
    var vertexColours =  [1.0, 0.0, 0.0, 1.0,
                          1.0, 0.0, 0.0, 1.0,
                          0.0, 1.0, 0.0, 1.0,
                          0.0, 1.0, 0.0, 1.0,
                          0.0, 0.0, 1.0, 1.0,
                          0.0, 0.0, 1.0, 1.0];
    this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(vertexColours), this.gl.STATIC_DRAW);
    this.lineColourBuffer.itemSize = 4;
    this.lineColourBuffer.numItems = 6;

    this.box([0.0, 0.0, 0.0], [1.0, 1.0, 1.0]);
    
    this.webgl.init2dBuffers(this.gl.TEXTURE1);
    
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);

    this.webgl.loadTexture(image, this.gl.LINEAR);

    console.log(image);
    
    this.lineprogram = new WebGLProgram(this.gl, 'line-vs', 'line-fs');
    if (this.lineprogram.errors) OK.debug(this.lineprogram.errors);
    this.lineprogram.setup(["aVertexPosition", "aVertexColour"], ["uColour", "uAlpha"]);
    this.gl.vertexAttribPointer(this.lineprogram.attributes["aVertexPosition"], this.linePositionBuffer.itemSize, this.gl.FLOAT, false, 0, 0);
    this.gl.vertexAttribPointer(this.lineprogram.attributes["aVertexColour"], this.lineColourBuffer.itemSize, this.gl.FLOAT, false, 0, 0);

    var defines = "precision highp float; const highp vec2 slices = vec2(" + this.tiles[0] + "," + this.tiles[1] + ");\n";
    var maxSamples = 1024;
    defines += "const int maxSamples = " + maxSamples + ";\n\n\n\n\n\n";
    
    this.program = new WebGLProgram(this.gl, 'volume-vs', 'volume-fs', defines);
    if (this.program.errors) OK.debug(this.program.errors);
    this.program.setup(["aVertexPosition"], 
                       ["uBackCoord", "uVolume", "uTransferFunction", "uEnableColour", "uFilter",
                        "uDensityFactor", "uPower", "uSaturation", "uBrightness", "uContrast", "uSamples",
                        "uViewport", "uBBMin", "uBBMax", "uResolution", "uRange", "uDenMinMax",
                        "uIsoValue", "uIsoColour", "uIsoSmooth", "uIsoWalls", "uInvPMatrix"]);

    this.gl.enable(this.gl.DEPTH_TEST);
    this.gl.clearColor(0, 0, 0, 0);
    this.gl.enable(this.gl.BLEND);
    this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
    this.gl.depthFunc(this.gl.LEQUAL);


    this.properties = {};
    this.properties.samples = 256;
    this.properties.isovalue = 0.0;
    this.properties.isowalls = false;
    this.properties.isoalpha = 0.75;
    this.properties.isosmooth = 1.0;
    this.properties.colour = [214, 188, 86];

    this.properties.xmin = this.properties.ymin = this.properties.zmin = 0.0;
    this.properties.xmax = this.properties.ymax = this.properties.zmax = 1.0;

    this.properties.density = 10.0;
    this.properties.saturation = 1.0;
    this.properties.brightness = 0.0;
    this.properties.contrast = 1.0;
    this.properties.power = 1.0;
    this.properties.minclip = props.volume.minclip || 0.0;
    this.properties.maxclip = props.volume.minclip || 1.0;
    this.properties.usecolourmap = true;
    this.properties.tricubicFilter = false;
    this.properties.interactive = interactive;
    this.properties.axes = true;
    this.properties.border = true;

    this.load(props);
}

Volume.prototype.box = function(min, max) {
    var vertices = new Float32Array(
        [
            min[0], min[1], max[2],
            min[0], max[1], max[2],
            max[0], max[1], max[2],
            max[0], min[1], max[2],
            min[0], min[1], min[2],
            min[0], max[1], min[2],
            max[0], max[1], min[2],
            max[0], min[1], min[2]
        ]);

    var indices = new Uint16Array(
        [
            0, 1, 1, 2, 2, 3, 3, 0,
            4, 5, 5, 6, 6, 7, 7, 4,
            0, 4, 3, 7, 1, 5, 2, 6
        ]
    );
    this.boxPositionBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.boxPositionBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, vertices, this.gl.STATIC_DRAW);
    this.boxPositionBuffer.itemSize = 3;

    this.boxIndexBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.boxIndexBuffer); 
    this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, indices, this.gl.STATIC_DRAW);
    this.boxIndexBuffer.numItems = 24;
}

Volume.prototype.addGUI = function(gui) {
    if (this.gui) this.gui.destroy();

    this.gui = gui;

    var f = this.gui.addFolder('Volume');
    f.add(this.properties, 'usecolourmap');
    this.properties.samples = Math.floor(this.properties.samples);
    if (this.properties.samples % 32 > 0) this.properties.samples -= this.properties.samples % 32;
    f.add(this.properties, 'samples', 32, 1024, 32);
    f.open();

    var f0 = this.gui.addFolder('Clip planes');
    f0.add(this.properties, 'xmin', 0.0, 1.0, 0.01);
    f0.add(this.properties, 'xmax', 0.0, 1.0, 0.01);
    f0.add(this.properties, 'ymin', 0.0, 1.0, 0.01);
    f0.add(this.properties, 'ymax', 0.0, 1.0, 0.01);
    f0.add(this.properties, 'zmin', 0.0, 1.0, 0.01);
    f0.add(this.properties, 'zmax', 0.0, 1.0, 0.01);
    f0.open()

    //Isosurfaces folder
    var f1 = this.gui.addFolder('Isosurface');
    f1.add(this.properties, 'isovalue', 0.0, 1.0, 0.01);
    f1.add(this.properties, 'isowalls');
    f1.add(this.properties, 'isoalpha', 0.0, 1.0, 0.01);
    f1.add(this.properties, 'isosmooth', 0.1, 3.0, 0.1);
    f1.addColor(this.properties, 'colour');
    //f1.open();

    var that = this;
    var changefn = function(value) {that.delayedRender(250);};
    for (var i in f.__controllers)
        f.__controllers[i].onChange(changefn);
    for (var i in f0.__controllers)
        f0.__controllers[i].onChange(changefn);
    for (var i in f1.__controllers)
        f1.__controllers[i].onChange(changefn);
}

Volume.prototype.load = function(src) {
    for (var key in src)
        this.properties[key] = src[key]

    if (src.colourmap != undefined) this.properties.usecolourmap = true;
    this.properties.axes = state.views[0].axes;
    this.properties.border = state.views[0].border;
    this.properties.tricubicFilter = src.tricubicfilter;

    if (state.views[0].translate) this.translate = state.views[0].translate;
    if (state.views[0].rotate) {
        if (state.views[0].rotate.length == 3) {
            this.rotateZ(-state.views[0].rotate[2]);
            this.rotateY(-state.views[0].rotate[1]);
            this.rotateX(-state.views[0].rotate[0]);
        } else if (state.views[0].rotate[3] != 0)
            this.rotate = quat4.create(state.views[0].rotate);    
    }
}

Volume.prototype.get = function(matrix) {
    var data = {};
    if (matrix) {
        data.modelview = this.webgl.modelView.toArray();
    } else {
        data.translate = this.translate;
        data.rotate = [this.rotate[0], this.rotate[1], this.rotate[2], this.rotate[3]];
    }
    data.properties = this.properties;
    return data;
}

var frames = 0;
var testtime;

Volume.prototype.draw = function(lowquality, testmode) {
    if (!this.properties || !this.webgl) return;
    if (this.width == 0 || this.height == 0) {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
    }

    if (this.width != this.canvas.width || this.height != this.canvas.height) {
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        this.canvas.setAttribute("width", this.width);
        this.canvas.setAttribute("height", this.height);
        if (this.gl) {
            this.gl.viewportWidth = this.width;
            this.gl.viewportHeight = this.height;
            this.webgl.viewport = new Viewport(0, 0, this.width, this.height);
        }
    }
 
    this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
    this.gl.viewport(this.webgl.viewport.x, this.webgl.viewport.y, this.webgl.viewport.width, this.webgl.viewport.height);

    if (this.properties.border) this.drawBox(1.0);
    if (this.properties.axes) this.drawAxis(1.0);

    this.webgl.modelView.push();
    this.rayCamera();
    
    this.webgl.use(this.program);
    this.webgl.modelView.scale(this.scaling);
    this.gl.disableVertexAttribArray(this.program.attributes["aVertexColour"]);

    this.gl.activeTexture(this.gl.TEXTURE0);
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.webgl.textures[0]);

    this.gl.activeTexture(this.gl.TEXTURE1);
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.webgl.gradientTexture);

    this.gl.uniform1i(this.program.uniforms["uSamples"], lowquality ? this.properties.samples * 0.5 : this.properties.samples);
    this.gl.uniform1i(this.program.uniforms["uVolume"], 0);
    this.gl.uniform1i(this.program.uniforms["uTransferFunction"], 1);
    this.gl.uniform1i(this.program.uniforms["uEnableColour"], this.properties.usecolourmap);
    this.gl.uniform1i(this.program.uniforms["uFilter"], lowquality ? false : this.properties.tricubicFilter);
    this.gl.uniform4fv(this.program.uniforms["uViewport"], new Float32Array([0, 0, this.gl.viewportWidth, this.gl.viewportHeight]));

    var bbmin = [this.properties.xmin, this.properties.ymin, this.properties.zmin];
    var bbmax = [this.properties.xmax, this.properties.ymax, this.properties.zmax];
    this.gl.uniform3fv(this.program.uniforms["uBBMin"], new Float32Array(bbmin));
    this.gl.uniform3fv(this.program.uniforms["uBBMax"], new Float32Array(bbmax));
    this.gl.uniform3fv(this.program.uniforms["uResolution"], new Float32Array(this.resolution));

    this.gl.uniform1f(this.program.uniforms["uDensityFactor"], this.properties.density);
    this.gl.uniform1f(this.program.uniforms["uSaturation"], this.properties.saturation);
    this.gl.uniform1f(this.program.uniforms["uBrightness"], this.properties.brightness);
    this.gl.uniform1f(this.program.uniforms["uContrast"], this.properties.contrast);
    this.gl.uniform1f(this.program.uniforms["uPower"], this.properties.power);

    this.gl.uniform1f(this.program.uniforms["uIsoValue"], this.properties.isovalue);
    var color = new Color(this.properties.colour);
    color.alpha = this.properties.isoalpha;
    this.gl.uniform4fv(this.program.uniforms["uIsoColour"], color.rgbaGL());
    this.gl.uniform1f(this.program.uniforms["uIsoSmooth"], this.properties.isosmooth);
    this.gl.uniform1i(this.program.uniforms["uIsoWalls"], this.properties.isowalls);

    this.gl.uniform2fv(this.program.uniforms["uRange"], new Float32Array([0.0, 1.0]));
    this.gl.uniform2fv(this.program.uniforms["uDenMinMax"], new Float32Array([this.properties.minclip, this.properties.maxclip]));

    this.webgl.initDraw2d();
    this.gl.uniformMatrix4fv(this.program.uniforms["uInvPMatrix"], false, this.invPMatrix);
    this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, this.webgl.vertexPositionBuffer.numItems);

    this.webgl.modelView.pop();
    
    this.gl.clear(this.gl.DEPTH_BUFFER_BIT);
    this.drawAxis(0.2);
    this.drawBox(1.0);
}

Volume.prototype.camera = function() {
    this.webgl.modelView.identity()
    this.webgl.modelView.translate(this.translate)
    adjust = [-(this.focus[0] - this.centre[0]), -(this.focus[1] - this.centre[1]), -(this.focus[2] - this.centre[2])];
    this.webgl.modelView.translate(adjust);

    var rotmat = quat4.toMat4(this.rotate);
    this.webgl.modelView.mult(rotmat);
    adjust = [this.focus[0] - this.centre[0], this.focus[1] - this.centre[1], this.focus[2] - this.centre[2]];
    this.webgl.modelView.translate(adjust);
    this.webgl.modelView.translate([-this.focus[0], -this.focus[1], -this.focus[2] * this.orientation]);
    this.webgl.setPerspective(this.fov, this.gl.viewportWidth / this.gl.viewportHeight, 0.1, 100.0);
}

Volume.prototype.rayCamera = function() {
    this.webgl.modelView.identity()
    this.webgl.modelView.translate(this.translate)
    var rotmat = quat4.toMat4(this.rotate);
    this.webgl.modelView.mult(rotmat);
    this.webgl.modelView.translate([-this.scaling[0]*0.5, -this.scaling[1]*0.5, -this.scaling[2]*0.5]);  //Translate to origin
    this.webgl.modelView.scale([this.iscale[0], this.iscale[1], this.iscale[2]]);
    this.webgl.setPerspective(this.fov, this.gl.viewportWidth / this.gl.viewportHeight, 0.1, 100.0);
    this.invPMatrix = mat4.create(this.webgl.perspective.matrix);
    mat4.inverse(this.invPMatrix);
}

Volume.prototype.drawAxis = function(alpha) {
    this.camera();
    this.webgl.use(this.lineprogram);
    this.gl.uniform1f(this.lineprogram.uniforms["uAlpha"], alpha);
    this.gl.uniform4fv(this.lineprogram.uniforms["uColour"], new Float32Array([1.0, 1.0, 1.0, 0.0]));

    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.linePositionBuffer);
    this.gl.enableVertexAttribArray(this.lineprogram.attributes["aVertexPosition"]);
    this.gl.vertexAttribPointer(this.lineprogram.attributes["aVertexPosition"], this.linePositionBuffer.itemSize, this.gl.FLOAT, false, 0, 0);

    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.lineColourBuffer);
    this.gl.enableVertexAttribArray(this.lineprogram.attributes["aVertexColour"]);
    this.gl.vertexAttribPointer(this.lineprogram.attributes["aVertexColour"], this.lineColourBuffer.itemSize, this.gl.FLOAT, false, 0, 0);

    var pos = [0.5*this.scaling[0], 0.5*this.scaling[1], 0.5*this.scaling[2]];
    if (this.slicer) {
        pos = [this.slicer.slices[0]*this.scaling[0], 
               this.slicer.slices[1]*this.scaling[1],
               this.slicer.slices[2]*this.scaling[2]];
    }
    this.webgl.modelView.translate(pos);
    this.webgl.setMatrices();
    this.gl.drawArrays(this.gl.LINES, 0, this.linePositionBuffer.numItems);
    this.webgl.modelView.translate([-pos[0], -pos[1], -pos[2]]);
}

Volume.prototype.drawBox = function(alpha) {
    this.camera();
    this.webgl.use(this.lineprogram);
    this.gl.uniform1f(this.lineprogram.uniforms["uAlpha"], alpha);
    this.gl.uniform4fv(this.lineprogram.uniforms["uColour"], this.borderColour.rgbaGL());

    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.boxPositionBuffer);
    this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.boxIndexBuffer);
    this.gl.enableVertexAttribArray(this.lineprogram.attributes["aVertexPosition"]);
    this.gl.vertexAttribPointer(this.lineprogram.attributes["aVertexPosition"], this.boxPositionBuffer.itemSize, this.gl.FLOAT, false, 0, 0);
    this.gl.vertexAttribPointer(this.lineprogram.attributes["aVertexColour"], 4, this.gl.UNSIGNED_BYTE, true, 0, 0);

    this.webgl.modelView.scale(this.scaling); 
    this.webgl.setMatrices();
    this.gl.drawElements(this.gl.LINES, this.boxIndexBuffer.numItems, this.gl.UNSIGNED_SHORT, 0);
}

Volume.prototype.rotateX = function(deg) {
    this.rotation(deg, [1,0,0]);
}

Volume.prototype.rotateY = function(deg) {
    this.rotation(deg, [0,1,0]);
}

Volume.prototype.rotateZ = function(deg) {
    this.rotation(deg, [0,0,1]);
}

Volume.prototype.rotation = function(deg, axis) {
    var arad = deg * Math.PI / 180.0;
    var rotation = quat4.fromAngleAxis(arad, axis);
    rotation = quat4.normalize(rotation);
    this.rotate = quat4.multiply(rotation, this.rotate);
}

Volume.prototype.zoom = function(factor) {
    this.translate[2] += factor * this.modelsize;
}

Volume.prototype.zoomClip = function(factor) {
    this.draw();
}

Volume.prototype.click = function(event, mouse) {
    this.rotating = false;
    this.draw();
    return false;
}

Volume.prototype.move = function(event, mouse) {
    this.rotating = false;
    if (!mouse.isdown) return true;

    var button = mouse.button;

    switch (button)
    {
        case 0:
        this.rotateY(mouse.deltaX/5.0);
        this.rotateX(mouse.deltaY/5.0);
        this.rotating = true;
        break;
        case 1:
        this.rotateZ(Math.sqrt(mouse.deltaX*mouse.deltaX + mouse.deltaY*mouse.deltaY)/5.0);
        this.rotating = true;
        break;
        case 2:
        var adjust = this.modelsize / 1000;
        this.translate[0] += mouse.deltaX * adjust;
        this.translate[1] -= mouse.deltaY * adjust;
        break;
    }
    this.draw(true);
    return false;
}

Volume.prototype.wheel = function(event, mouse) {
    if (event.shiftKey) {
        var factor = event.spin * 0.01;
        this.zoomClip(factor);
    } else {
        var factor = event.spin * 0.05;
        this.zoom(factor);
    }
    this.delayedRender(250); 
    return false; 
}

Volume.prototype.pinch = function(event, mouse) {
    var zoom = (event.distance * 0.0001);
    console.log(' --> ' + zoom);
    this.zoom(zoom);
    this.delayedRender(250);
}

Volume.prototype.delayedRender = function(time, skipImm) {
    if (!skipImm) this.draw(true);
    if (this.delaytimer) clearTimeout(this.delaytimer);
    var that = this;
    this.delaytimer = setTimeout(function() {that.draw();}, time);
}
