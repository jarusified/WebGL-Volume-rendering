function Volume(){
    this.image = image;
    this.canvas = document.createElement('canvas');
    this.canvas.style.cssText = "width: 100%; height: 100%; z-index: 0; margin: 0px; padding: 0px; background: black; border: none; display:block;";

    this.webgl = new WebGL(this.canvas);
    this.gl = this.webgl.gl;
    
    if(!parentDiv) parentDiv = document.body;
    parentDiv.appendChild(this.canvas);

    this.linePositionBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.linePositionBuffer);

    var vertextPositions
    
}
