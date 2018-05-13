/* View Matrix object */
function ViewMatrix() {
    this.matrix = mat4.create();
    mat4.identity(this.matrix);
    this.stack = [];
}

ViewMatrix.prototype.toString = function() {
    return JSON.stringify(this.toArray());
}

ViewMatrix.prototype.toArray = function() {
    return JSON.parse(mat4.str(this.matrix));
}

ViewMatrix.prototype.push = function(m) {
    if (m) {
        this.stack.push(mat4.create(m));
        this.matrix = mat4.create(m);
    } else {
        this.stack.push(mat4.create(this.matrix));
    }
}

ViewMatrix.prototype.pop = function() {
    if (this.stack.length == 0) {
        throw "Matrix stack underflow";
    }
    this.matrix = this.stack.pop();
    return this.matrix;
}

ViewMatrix.prototype.mult = function(m) {
    mat4.multiply(this.matrix, m);
}

ViewMatrix.prototype.identity = function() {
    mat4.identity(this.matrix);
}

ViewMatrix.prototype.scale = function(v) {
    mat4.scale(this.matrix, v);
}

ViewMatrix.prototype.translate = function(v) {
    mat4.translate(this.matrix, v);
}

ViewMatrix.prototype.rotate = function(angle,v) {
    var arad = angle * Math.PI / 180.0;
    mat4.rotate(this.matrix, arad, v);
}


 /**
   * @constructor
   */
function Viewport(x, y, width, height) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
}
