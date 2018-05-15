function Volume(props, image, gl, parentDiv){
    this.image = image;
    this.canvas = document.createElement('canvas');
    this.canvas.style.cssText = "width: 100%; height: 100%; z-index: 0; margin: 0px; padding: 0px; background: black; border: none; display:block;";

    this.webgl = new WebGL(this.canvas);
    this.gl = this.webgl.gl;

    //Color properties
    this.borderColor = new Color(0xffbbbbbb);
    this.background = new Color(0xfb404030);

    //Camera properties
    this.rotating = false;
    this.translate = [0,0,4];
    this.rotate = quat4.create();
    quat4.identity(this.rotate);
    this.focus = [0,0,3];
    this.centre = [0,0,0];
    this.modelsize = 0.5;
    this.scale = [1, 1, 1];
    this.orientation = 1.0; 
    this.fov = 45.0;
    
    //scaling properties
    this.scaling = props.volume['scale'];
    this.iscale = [1.0/this.scaling, 1.0/this.scaling[1], 1.0/this.scaling[2]];
    
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
    var vertexColors =  [1.0, 0.0, 0.0, 1.0,
                          1.0, 0.0, 0.0, 1.0,
                          0.0, 1.0, 0.0, 1.0,
                          0.0, 1.0, 0.0, 1.0,
                          0.0, 0.0, 1.0, 1.0,
                          0.0, 0.0, 1.0, 1.0];

    this.res = 256
    this.tiles = [this.image.width / this.res[0],
                  this.image.height / this.res[1]];

    this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(vertexColors), this.gl.STATIC_DRAW);
    this.lineColorBuffer.itemSize = 4;
    this.lineColorBuffer.numItes = 6;

    this.box([0.0, 0.0, 0.0], [1.0, 1.0, 1.0]);

    this.webgl.init2dBuffers(this.gl.TEXTURE1);
    
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);

    this.webgl.loadTexture(image, this.gl.LINEAR);

    this.lineprogram = new WebGLProgram(this.gl, 'line-vs', 'line-fs');
    this.lineprogram.setup(["vp", "vc"], ["uColour", "uAlpha"]);
    this.gl.vertexAttribPointer(this.lineprogram.attributes["vp"], this.linePositionBuffer.itemSize, this.gl.FLOAT, false, 0, 0);
    this.gl.vertexAttribPointer(this.lineprogram.attributes["vc"], this.lineColorBuffer.itemSize, this.gl.FLOAT, false, 0, 0);

    var defines = "precision highp float; const highp vec2 slices = vec2(" + this.tiles[0] + "," + this.tiles[1] + ");\n";
    var maxSamples =  256;
    defines += "const int maxSamples = " + maxSamples + ";\n\n\n\n\n\n"; 

    // var fs = getSourceFromElement('volume-fs');
    // this.program = new WebGLProgram(this.gl, 'volume-vs', defines + fs);
    // if(this.program.errors){
    //     console.log(this.program.errors);
    // }

    // this.program.setup(["vp"], 
    //                    ["uBackCoord", "uVolume", "uTransferFunction", "uEnableColor", "uFilter", "uDensityFactor",
    //                     "uPower", "uSaturation", "uBrightness", "uContrast", "uSamples",
    //                     "uViewport", "uBBMin", "uBBMax", "uResolution", "uRange", "uDenMinMax",
    //                     "uIsoValue", "uIsoColour", "uIsoSmooth", "uIsoWalls", "uInvPMatrix"]);

    this.gl.enable(this.gl.DEPTH_TEST);
    this.gl.clearColor(0, 0, 0, 0);
    this.gl.enable(this.gl.BLEND);
    this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);

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
    this.properties.usecolourmap = false;
    this.properties.tricubicFilter = false;
//    this.properties.interactive = interactive;
    this.properties.axes = true;
    this.properties.border = true;
    
    this.load(props);

    // mouse interactions
    this.canvas.mouse = new Mouse(this.canvas, this);
    this.canvas.mouse.moveUpdate = true;
}

Volume.prototype.load = function(props){
    for(var key in props)
        this.properties[key] = props[key];

    if(props.colormap != undefined) this.properties.usecolormap = true;
    this.properties.axes = state.views[0].axes;
    this.properties.border = state.views[0].border;
    this.properties.tricubicFilter = props.tricubicfilter;

    if(state.views[0].translate) this.translate = state.views[0].translate;
    if (state.views[0].rotate) {
        if (state.views[0].rotate.length == 3) {
            this.rotateZ(-state.views[0].rotate[2]);
            this.rotateY(-state.views[0].rotate[1]);
            this.rotateX(-state.views[0].rotate[0]);
        } else if (state.views[0].rotate[3] != 0)
            this.rotate = quat4.create(state.views[0].rotate);
    }
}


Volume.prototype.box = function(min, max){
    // //     -1,-1,-1,
    // // 1,-1,-1,
    // // 1, 1,-1,
    // //     -1, 1,-1,
    // //     -1,-1, 1,
    // // 1,-1, 1,
    // // 1, 1, 1,
    // //     -1, 1, 1,
    // //     -1,-1,-1,
    // //     -1, 1,-1,
    // //     -1, 1, 1,
    // //     -1,-1, 1,
    // // 1,-1,-1,
    // // 1, 1,-1,
    // // 1, 1, 1,
    // // 1,-1, 1,
    // //     -1,-1,-1,
    // //     -1,-1, 1,
    // // 1,-1, 1,
    // // 1,-1,-1,
    // //     -1, 1,-1,
    // //     -1, 1, 1,
    // // 1, 1, 1,
    // // 1, 1,-1, 
    // var vertices = new Float32Array([
    //     min[0], min[1], min[2],
    //     max[0], min[1], min[2],
    //     max[0], max[1], min[2],
    //     min[0], max[1], min[2],
    //     min[0], min[1], max[2],
    //     max[0], min[1], max[2],
    //     max[0], max[1], max[2],
    //     min[0], max[1], max[2],
    //     min[0], min[1], min[2],
    //     min[0], max[1], min[2],
    //     min[0], max[1], max[2],
    //     min[0], min[1], max[2],
    //     max[0], min[1], min[2],
    //     max[0], max[1], min[2],
    //     max[0], max[1], max[2],
    //     max[0], min[1], max[2],
    //     min[0], min[1], min[2],
    //     min[0], min[1], max[2],
    //     max[0], min[1], max[2],
    //     max[0], min[1], min[2],
    //     min[0], max[1], min[2],
    //     min[0], max[1], max[2],
    //     max[0], max[1], max[2],
    //     max[0], max[1], min[2]
    // ]);

    // var indices = new Uint16Array([
    //     0, 1, 2, 0, 2, 3,
    //     4, 5, 6, 4, 6, 7,
    //     8, 9, 10, 8, 10, 11,
    //     12, 13, 14, 12, 14, 15,
    //     16, 17, 18, 16, 18, 19,
    //     20, 21, 22, 20, 22, 23
    // ]);

    var vertices = new Float32Array([
        min[0], min[1], max[2],
        min[0], max[1], max[2],
        max[0], max[1], max[2],
        max[0], min[1], max[2],
        min[0], min[1], min[2],
        min[0], max[1], min[2],
        max[0], max[1], min[2],
        max[0], min[1], min[2]
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

Volume.prototype.draw = function(){
    this.width = window.innerWidth;
    this.height = window.innerHeight;

    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.gl.viewportWidth = this.width;
    this.gl.viewportHeight = this.height;
    this.webgl.viewport = new Viewport(0, 0, this.width, this.height);

    this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
    this.gl.viewport(this.webgl.viewport.x, this.webgl.viewport.y, this.webgl.viewport.width, this.webgl.viewport.height);

//    this.drawBox(1.0);
    this.drawAxis(1.0);

    // Volume rendering part
    this.webgl.modelView.push();
    this.rayCamera();
    
}

Volume.prototype.rayCamera = function() {
    //Apply translation to origin, any rotation and scaling
    this.webgl.modelView.identity()
    this.webgl.modelView.translate(this.translate)

    // rotate model
    var rotmat = quat4.toMat4(this.rotate);
    this.webgl.modelView.mult(rotmat);

    //For a volume cube other than [0,0,0] - [1,1,1], need to translate/scale here...
    this.webgl.modelView.translate([-this.scaling[0]*0.5, -this.scaling[1]*0.5, -this.scaling[2]*0.5]);  //Translate to origin
    //Inverse of scaling
    this.webgl.modelView.scale([this.iscale[0], this.iscale[1], this.iscale[2]]);

    //Perspective matrix
    this.webgl.setPerspective(this.fov, this.gl.viewportWidth / this.gl.viewportHeight, 0.1, 100.0);

    //Get inverted matrix for volume shader
    this.invPMatrix = mat4.create(this.webgl.perspective.matrix);
    mat4.inverse(this.invPMatrix);
}

Volume.prototype.camera = function(){
    this.webgl.modelView.identity();
    this.webgl.modelView.translate(this.translate);
    adjust = [-(this.focus[0] - this.centre[0]), -(this.focus[1] - this.centre[1]), -(this.focus[2] - this.centre[2])];
    this.webgl.modelView.translate(adjust);

    // rotate model
    var rotmat = quat4.toMat4(this.rotate);
    this.webgl.modelView.mult(rotmat);
    //this.webgl.modelView.mult(this.rotate);

    // Adjust back for rotation centre
    adjust = [this.focus[0] - this.centre[0], this.focus[1] - this.centre[1], this.focus[2] - this.centre[2]];
    this.webgl.modelView.translate(adjust);

    // Translate back by centre of model to align eye with model centre
    this.webgl.modelView.translate([-this.focus[0], -this.focus[1], -this.focus[2] * this.orientation]);

    //Perspective matrix
    this.webgl.setPerspective(this.fov, this.gl.viewportWidth / this.gl.viewportHeight, 0.1, 100.0)
}

Volume.prototype.drawAxis = function(alpha){
    this.camera();
    this.webgl.use(this.lineprogram);
    this.gl.uniform1f(this.lineprogram.uniforms["uAlpha"], alpha);
    this.gl.uniform4fv(this.lineprogram.uniforms["uColor"], new Float32Array([1.0, 1.0, 1.0, 0.0]));

    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.linePositionBuffer);
    this.gl.enableVertexAttribArray(this.lineprogram.attributes["vp"]);
    this.gl.vertexAttribPointer(this.lineprogram.attributes["vp"], this.linePositionBuffer.itemSize, this.gl.FLOAT, false, 0, 0);

    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.lineColorBuffer);
    this.gl.enableVertexAttribArray(this.lineprogram.attributes["vc"]);
    this.gl.vertexAttribPointer(this.lineprogram.attributes["vc"], this.lineColorBuffer.itemSize, this.gl.FLOAT, false, 0, 0);

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

Volume.prototype.drawBox = function(alpha){
    this.camera();
    this.webgl.use(this.lineprogram);
    this.gl.uniform1f(this.lineprogram.uniforms['uAlpha'], alpha);
    console.log(this.borderColor.rgbaGL());
    this.gl.uniform4fv(this.lineprogram.uniforms["uColor"], new Float32Array([1.0, 1.0, 1.0, 1.0]));

    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.boxPositionBuffer);
    this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.boxIndexBuffer);
    this.gl.enableVertexAttribArray(this.lineprogram.attributes['vp']);
    this.gl.vertexAttribPointer(this.lineprogram.attributes["vp"], this.boxPositionBuffer.itemSize, this.gl.FLOAT, false, 0, 0);
    
    this.gl.vertexAttribPointer(this.lineprogram.attributes["vc"], 4, this.gl.UNSIGNED_BYTE, false, 0, 0);

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

Volume.prototype.rotation = function(deg, axis){
    let rad = deg* Math.PI/180.0;
    let rotation = quat4.fromAngleAxis(rad, axis);
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

Volume.prototype.wheel = function(event, mouse) {
    if (event.shiftKey) {
        var factor = event.spin * 0.01;
        this.zoomClip(factor);
    } else {
        var factor = event.spin * 0.05;
        this.zoom(factor);
    }
    this.timedRender(0); 

    return false; 
}

Volume.prototype.move = function(event, mouse){
    this.rotating = false;
    if(!mouse.isdown) return true;

    var button = mouse.button;
    switch(button){
    case 0: {
        this.rotateY(mouse.deltaX/5.0);
        this.rotateX(mouse.deltaY/5.0);
        this.rotating = true;
        break;
    }
    case 1: {
        this.rotateZ(Math.sqrt(mouse.deltaX*mouse.deltaX + mouse.deltaY*mouse.deltaY)/5.0);
        this.rotating = true;
        break;
    }
    case 2:{
        let adjust = this.modelsize/1000;
        this.translate[0] += mouse.deltaX*adjust;
        this.translate[1] -= mouse.deltaY*adjust;
        break;
    }  
        
    }
}

Volume.prototype.timedRender = function(time){
    if(!time) this.draw(true);

    if(this.delayTimer) clearTimeout(this.delaytimer);
    let that = this;
    this.delaytimer = setTimeout(function() { that.draw(); }, time);    
}
