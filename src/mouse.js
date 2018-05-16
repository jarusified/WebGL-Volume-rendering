function Mouse(element, handler, enableContext) {
    this.element = element;
    //Custom handler for mouse actions...
    //requires members: click(event, mouse), move(event, mouse) and wheel(event, mouse)
    this.handler = handler;

    this.disabled = false;
    this.isdown = false;
    this.button = null;
    this.dragged = false;
    this.x = 0;
    this.x = 0;
    this.absoluteX = 0;
    this.absoluteY = 0;
    this.lastX = 0;
    this.lastY = 0;
    this.slider = null;
    this.spin = 0;
    //Option settings...
    this.moveUpdate = false;  //Save mouse move origin once on mousedown or every move
    this.enableContext = enableContext ? true : false;
    this.dragMouse = null;
    this.defaultMouse = null;
    
    element.addEventListener("onwheel" in document ? "wheel" : "mousewheel", handleMouseWheel, false);
    element.onmousedown = handleMouseDown;
    element.onmouseout = handleMouseLeave;
    document.onmouseup = handleMouseUp;
    document.onmousemove = handleMouseMove;
    //To disable context menu
    element.oncontextmenu = function() {return this.mouse.enableContext;}
}

Mouse.prototype.setDefault = function() {
    //Sets up this mouse as the default for the document
    //Multiple mouse handlers can be created for elements but only
    //one should be set to handle document events
    this.defaultMouse = document.mouse = this;
}

Mouse.prototype.update = function(e) {
    // Get the mouse position relative to the document.
    if (!e) var e = window.event;
    var coord = mousePageCoord(e);
    this.x = coord[0];
    this.y = coord[1];

    //Save doc relative coords
    this.absoluteX = this.x;
    this.absoluteY = this.y;
    //Get element offset in document
    var offset = findElementPos(this.element);
    //Convert coords to position relative to element
    this.x -= offset[0];
    this.y -= offset[1];
    //Save position without scrolling, only checked in ff5 & chrome12
    this.clientx = e.clientX - offset[0];
    this.clienty = e.clientY - offset[1];
}

function mousePageCoord(event) {
    //Note: screen relative coords are only that are consistent (e.screenX/Y)
    var x,y;
    if (event.pageX || event.pageY) {
        x = event.pageX;
        y = event.pageY;
    }
    else {
        x = event.clientX + document.body.scrollLeft +
            document.documentElement.scrollLeft;
        y = event.clientY + document.body.scrollTop +
            document.documentElement.scrollTop;
    }
    return [x,y];
}

function elementRelativeCoord(element, coord) {
    var offset = findElementPos(element);
    coord[0] -= offset[0];
    coord[1] -= offset[1];
}


// Get offset of element
function findElementPos(obj) {
    var curleft = curtop = 0;
    //if (obj.offsetParent) { //Fix for chrome not getting actual object's offset here
    do {
        curleft += obj.offsetLeft;
        curtop += obj.offsetTop;
    } while (obj = obj.offsetParent);
    //}
    return [curleft,curtop];
}

function getMouse(event) {
    if (!event) event = window.event; //access the global (window) event object
    var mouse = event.target.mouse;
    if (mouse) return mouse;
    //Attempt to find in parent nodes
    var target = event.target;
    var i = 0;
    while (target != document) {
        target = target.parentNode;
        if (target.mouse) return target.mouse;
    }

    return null;
}

function handleMouseDown(event) {
    //Event delegation details
    var mouse = getMouse(event);
    if (!mouse || mouse.disabled) return true;
    var e = event || window.event;
    mouse.target = e.target;
    //Clear dragged flag on mouse down
    mouse.dragged = false;

    mouse.update(event);
    if (!mouse.isdown) {
        mouse.lastX = mouse.absoluteX;
        mouse.lastY = mouse.absoluteY;
    }
    mouse.isdown = true;
    this.dragMouse = mouse;
    mouse.button = event.button;
    //Set document move & up event handlers to this.mouse object's
    document.mouse = mouse;

    //Handler for mouse down
    var action = true;
    if (mouse.handler.down) action = mouse.handler.down(event, mouse);
    //If handler returns false, prevent default action
    if (!action && event.preventDefault) event.preventDefault();
    return action;
}

//Default handlers for up & down, call specific handlers on element
function handleMouseUp(event){
    var mouse = document.mouse;
    if (!mouse || mouse.disabled) return true;
    var action = true;
    if (mouse.isdown)
    {
        mouse.update(event);
        if (mouse.handler.click) action = mouse.handler.click(event, mouse);
        mouse.isdown = false;
        this.dragMouse = null;
        mouse.button = null;
        mouse.dragged = false;
    }
    if (mouse.handler.up) action = action && mouse.handler.up(event, mouse);
    //Restore default mouse on document
    document.mouse = this.defaultMouse;

    //If handler returns false, prevent default action
    if (!action && event.preventDefault) event.preventDefault();
    return action;
}

function handleMouseMove(event){
    //Use previous mouse if dragging
    var mouse = this.dragMouse ? this.dragMouse : getMouse(event);
    if (!mouse || mouse.disabled) return true;
    mouse.update(event);
    mouse.deltaX = mouse.absoluteX - mouse.lastX;
    mouse.deltaY = mouse.absoluteY - mouse.lastY;
    var action = true;

    //Set dragged flag if moved more than limit
    if (!mouse.dragged && mouse.isdown && Math.abs(mouse.deltaX) + Math.abs(mouse.deltaY) > 3)
        mouse.dragged = true;

    if (mouse.handler.move)
        action = mouse.handler.move(event, mouse);

    if (mouse.moveUpdate) {
        //Constant update of last position
        mouse.lastX = mouse.absoluteX;
        mouse.lastY = mouse.absoluteY;
    }

    //If handler returns false, prevent default action
    if (!action && event.preventDefault) event.preventDefault();
    return action;
}

function handleMouseWheel(event) {
    var mouse = getMouse(event);
    if (!mouse || mouse.disabled) return true;
    mouse.update(event);
    var action = false; //Default action disabled

    var delta = event.deltaY ? -event.deltaY : event.wheelDelta;
    event.spin = delta > 0 ? 1 : -1;

    if (mouse.handler.wheel) action = mouse.handler.wheel(event, mouse);

    //If handler returns false, prevent default action
    if (!action && event.preventDefault) event.preventDefault();
    return action;
}

function handleMouseLeave(event) {
    var mouse = getMouse(event);
    if (!mouse || mouse.disabled) return true;

    var action = true;
    if (mouse.handler.leave) action = mouse.handler.leave(event, mouse);

    //If handler returns false, prevent default action
    if (!action && event.preventDefault) event.preventDefault();
    event.returnValue = action; //IE
    return action;
} 
