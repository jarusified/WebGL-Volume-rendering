function Palette(source, premultiply) {
    this.premultiply = premultiply;
    //Default transparent black background
    this.background = new Color("rgba(0,0,0,0)");
    //Colour palette array
    this.colours = [];
    this.slider = new Image();
    this.slider.src = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAkAAAAPCAYAAAA2yOUNAAAAj0lEQVQokWNIjHT8/+zZs//Pnj37/+TJk/9XLp/+f+bEwf9HDm79v2Prqv9aKrz/GUYVEaeoMDMQryJXayWIoi0bFmFV1NWS+z/E1/Q/AwMDA0NVcez/LRsWoSia2luOUAADVcWx/xfO6/1/5fLp/1N7y//HhlmhKoCBgoyA/w3Vyf8jgyyxK4CBUF8zDAUAAJRXY0G1eRgAAAAASUVORK5CYII=";

    if (!source) {
        //Default greyscale
        this.colours.push(new ColorPos("rgba(255,255,255,1)", 0));
        this.colours.push(new ColorPos("rgba(0,0,0,1)", 1.0));
        return;
    }

    var calcPositions = false;

    if (typeof(source) == 'string') {
        //Palette string data parser
        var lines = source.split(/[\n;]/); // split on newlines and/or semi-colons
        var position;
        for (var i = 0; i < lines.length; i++) {
            var line = lines[i].trim();
            if (!line) continue;

            //Palette: parse into attrib=value pairs
            var pair = line.split("=");
            if (pair[0] == "Background")
                this.background = new Colour(pair[1]);
            else if (pair[0][0] == "P") //Very old format: PositionX=
                position = parseFloat(pair[1]);
            else if (pair[0][0] == "C") { //Very old format: ColourX=
                //Colour constructor handles html format colours, if no # or rgb/rgba assumes integer format
                this.colours.push(new ColorPos(pair[1], position));
                //Some old palettes had extra colours at end which screws things up so check end position
                if (position == 1.0) break;
            } else if (pair.length == 2) {
                //New style: position=value
                this.colours.push(new ColorPos(pair[1], pair[0]));
            } else {
                //Interpret as colour only, calculate positions
                calcPositions = true;
                this.colours.push(new ColorPos(line));
            }
        }
    } else {
        //JSON colour/position list data
        for (var j=0; j<source.length; j++) {
            //Calculate default positions if none provided
            if (source[j].position == undefined)
                calcPositions = true;
            //Create the entry
            this.colours.push(new ColorPos(source[j].colour, source[j].position));
        }
        //Use background if included
        if (source.background)
            this.background = new Color(source.background);
    }

    //Calculate default positions
    if (calcPositions) {
        for (var j=0; j<this.colours.length; j++)
            this.colours[j].position = j * (1.0 / (this.colours.length-1));
    }

    //Sort by position (fix out of order entries in old palettes)
    this.sort();

    //Check for all-transparent palette and fix
    var opaque = false;
    for (var c = 0; c < this.colours.length; c++) {
        if (this.colours[c].colour.alpha > 0) opaque = true;
        //Fix alpha=255
        if (this.colours[c].colour.alpha > 1.0)
            this.colours[c].colour.alpha = 1.0;
    }
    if (!opaque) {
        for (var c = 0; c < this.colours.length; c++)
            this.colours[c].colour.alpha = 1.0;
    }
}

Palette.prototype.sort = function() {
    this.colours.sort(function(a,b){return a.position - b.position});
}

Palette.prototype.newColour = function(position, colour) {
    var col = new ColorPos(colour, position);
    this.colours.push(col);
    this.sort();
    for (var i = 1; i < this.colours.length-1; i++)
        if (this.colours[i].position == position) return i;
    return -1;
}

Palette.prototype.inRange = function(pos, range, length) {
    for (var i = 0; i < this.colours.length; i++)
    {
        var x = this.colours[i].position * length;
        if (pos == x || (range > 1 && pos >= x - range / 2 && pos <= x + range / 2))
            return i;
    }
    return -1;
}

Palette.prototype.inDragRange = function(pos, range, length) {
    for (var i = 1; i < this.colours.length-1; i++)
    {
        var x = this.colours[i].position * length;
        if (pos == x || (range > 1 && pos >= x - range / 2 && pos <= x + range / 2))
            return i;
    }
    return 0;
}

Palette.prototype.remove = function(i) {
    this.colours.splice(i,1);
}

Palette.prototype.toString = function() {
    var paletteData = 'Background=' + this.background.html();
    for (var i = 0; i < this.colours.length; i++)
        paletteData += '\n' + this.colours[i].position.toFixed(6) + '=' + this.colours[i].colour.html();
    return paletteData;
}

Palette.prototype.get = function() {
    var obj = {};
    obj.background = this.background.html();
    obj.colours = [];
    for (var i = 0; i < this.colours.length; i++)
        obj.colours.push({'position' : this.colours[i].position, 'colour' : this.colours[i].colour.html()});
    return obj;
}

Palette.prototype.toJSON = function() {
    return JSON.stringify(this.get());
}

//Palette draw to canvas
Palette.prototype.draw = function(canvas, ui) {
    //Slider image not yet loaded?
    if (!this.slider.width && ui) {
        var _this = this;
        setTimeout(function() { _this.draw(canvas, ui); }, 150);
        return;
    }

    // Figure out if a webkit browser is being used
    if (!canvas) {alert("Invalid canvas!"); return;}
    var webkit = /webkit/.test(navigator.userAgent.toLowerCase());

    if (this.colours.length == 0) {
        this.background = new Color("#ffffff");
        this.colours.push(new ColorPos("#000000", 0));
        this.colours.push(new ColorPos("#ffffff", 1));
    }

    //Colours might be out of order (especially during editing)
    //so save a (shallow) copy and sort it
    list = this.colours.slice(0);
    list.sort(function(a,b){return a.position - b.position});

    if (canvas.getContext) {
        //Draw the gradient(s)
        var width = canvas.width;
        var height = canvas.height;
        var context = canvas.getContext('2d');
        context.clearRect(0, 0, width, height);

        if (webkit) {
            //Split up into sections or webkit draws a fucking awful gradient with banding
            var x0 = 0;
            for (var i = 1; i < list.length; i++) {
                var x1 = Math.round(width * list[i].position);
                context.fillStyle = context.createLinearGradient(x0, 0, x1, 0);
                var colour1 = list[i-1].colour;
                var colour2 = list[i].colour;
                //Pre-blend with background unless in UI mode
                if (this.premultiply && !ui) {
                    colour1 = this.background.blend(colour1);
                    colour2 = this.background.blend(colour2);
                }
                context.fillStyle.addColorStop(0.0, colour1.html());
                context.fillStyle.addColorStop(1.0, colour2.html());
                context.fillRect(x0, 0, x1-x0, height);
                x0 = x1;
            }
        } else {
            //Single gradient
            context.fillStyle = context.createLinearGradient(0, 0, width, 0);
            for (var i = 0; i < list.length; i++) {
                var colour = list[i].colour;
                //Pre-blend with background unless in UI mode
                if (this.premultiply && !ui)
                    colour = this.background.blend(colour);
                context.fillStyle.addColorStop(list[i].position, colour.html());
            }
            context.fillRect(0, 0, width, height);
        }

              /* Posterise mode (no gradients)
      var x0 = 0;
      for (var i = 1; i < list.length; i++) {
        var x1 = Math.round(width * list[i].position);
        //Pre-blend with background unless in UI mode
        var colour2 = ui ? list[i].colour : this.background.blend(list[i].colour);
        context.fillStyle = colour2.html();
        context.fillRect(x0, 0, x1-x0, height);
        x0 = x1;
      }
              */

        //Background colour
        var bg = document.getElementById('backgroundCUR');
        if (bg) bg.style.background = this.background.html();

        //User interface controls
        if (!ui) return;  //Skip drawing slider interface
        for (var i = 1; i < list.length-1; i++)
        {
            var x = Math.floor(width * list[i].position) + 0.5;
            var HSV = list[i].colour.HSV();
            if (HSV.V > 50)
                context.strokeStyle = "black";
            else
                context.strokeStyle = "white";
            context.beginPath();
            context.moveTo(x, 0);
            context.lineTo(x, canvas.height);
            context.closePath();
            context.stroke();
            x -= (this.slider.width / 2);
            context.drawImage(this.slider, x, 0);
        }
    } else alert("getContext failed!");
}



/**
 * Draggable window class *
 * @constructor
 */
function MoveWindow(id) {
    //Mouse processing:
    if (!id) return;
    this.element = document.getElementById(id);
    if (!this.element) {alert("No such element: " + id); return null;}
    this.mouse = new Mouse(this.element, this);
    this.mouse.moveUpdate = true;
    this.element.mouse = this.mouse;
}

MoveWindow.prototype.open = function(x, y) {
    //Show the window
    var style = this.element.style;

    if (x<0) x=0;
    if (y<0) y=0;
    if (x != undefined) style.left = x + "px";
    if (y != undefined) style.top = y + "px";
    style.display = 'block';

    //Correct if outside window width/height
    var w = this.element.offsetWidth,
        h = this.element.offsetHeight;
    if (x + w > window.innerWidth - 20)
        style.left=(window.innerWidth - w - 20) + 'px';
    if (y + h > window.innerHeight - 20)
        style.top=(window.innerHeight - h - 20) + 'px';
    //console.log("Open " + this.element.id + " " + style.left + "," + style.top + " : " + style.display);
}

MoveWindow.prototype.close = function() {
    this.element.style.display = 'none';
}

MoveWindow.prototype.move = function(e, mouse) {
    //console.log("Move: " + mouse.isdown);
    if (!mouse.isdown) return;
    if (mouse.button > 0) return; //Process left drag only
    //Drag position
    var style = mouse.element.style;
    style.left = parseInt(style.left) + mouse.deltaX + 'px';
    style.top = parseInt(style.top) + mouse.deltaY + 'px';
}

MoveWindow.prototype.down = function(e, mouse) {
    //Prevents drag/selection
    return false;
}

function scale(val, range, min, max) {return clamp(max * val / range, min, max);}
function clamp(val, min, max) {return Math.max(min, Math.min(max, val));}


function ColourPicker(savefn, abortfn) {
    // Originally based on :
    // DHTML Color Picker, Programming by Ulyses, ColorJack.com (Creative Commons License)
    // http://www.dynamicdrive.com/dynamicindex11/colorjack/index.htm
    // (Stripped down, clean class based interface no IE6 support for HTML5 browsers only)

    function createDiv(id, inner, styles) {
        var div = document.createElement("div");
        div.id = id;
        if (inner) div.innerHTML = inner;
        if (styles) div.style.cssText = styles;

        return div;
    }

    var parentElement = document.body;
    //Images
    var checkimg = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAIElEQVQ4jWP4TwAcOHAAL2YYNWBYGEBIASEwasCwMAAALvidroqDalkAAAAASUVORK5CYII="
    var slideimg = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAB0AAAAFCAYAAAC5Fuf5AAAAKklEQVQokWP4////fwY6gv////9n+A8F9LIQxVJaW4xiz4D5lB4WIlsMAPjER7mTpG/OAAAAAElFTkSuQmCC"
    var pickimg = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAkAAAAJCAYAAADgkQYQAAAALUlEQVQYlWNgQAX/kTBW8B8ZYFMIk0ARQFaIoQCbQuopIspNRPsOrpABSzgBAFHzU61KjdKlAAAAAElFTkSuQmCC";
    var svimg = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAEG0lEQVQ4jQEQBO/7APz8/Pz7+/vx+/v75Pr6+tb6+vrF+Pj4tPf396H4+PiO9/f3e/X19Wfz8/NU8PDwQuvr6zLi4uIjzs7OFZmZmQoA8PDw/O/v7/Ht7e3l7Ozs2Ozs7Mjq6uq35ubmpeXl5ZLf39+A3NzcbtXV1VvMzMxLvr6+O6ioqCyEhIQfQEBAFADk5OT84eHh8uDg4Obe3t7Z3Nzcy9nZ2brV1dWq0NDQmcrKyofCwsJ2uLi4ZKqqqlSYmJhFfX19N1lZWSsnJychANPT0/zT09Pz0NDQ6c3NzdzKysrNx8fHv8DAwK+6urqfsrKyj6mpqX+cnJxvjIyMX3l5eVBeXl5EPz8/ORsbGy8Aw8PD/MHBwfS+vr7qurq63ra2ttKxsbHErKystaOjo6eampqXj4+PiYODg3lycnJrXl5eX0hISFIuLi5IEBAQPwCwsLD9r6+v9aysrOynp6fioqKi1p2dncmVlZW8jo6OroODg6F5eXmUa2trhl1dXXlLS0ttNzc3YiIiIlkNDQ1RAJ6env2bm5v2l5eX7pSUlOWPj4/aiIiIz4GBgcN5eXm3cHBwq2RkZJ5XV1eSSkpKhzk5OX0qKipzGBgYawgICGMAioqK/YeHh/eDg4PvgICA6Hp6et90dHTVbW1ty2VlZcBcXFy1UVFRqkZGRqA6OjqWLS0tjSEhIYQSEhJ9BgYGdwB2dnb+c3Nz+HFxcfJra2vrZmZm42JiYttaWlrRUlJSyUtLS79CQkK2Nzc3rS0tLaQiIiKdGBgYlQ4ODo8EBASKAGNjY/5gYGD5XV1d9FpaWu5VVVXnTk5O4UlJSdlCQkLRPDw8yTQ0NMEqKiq7IiIisxkZGa0RERGmCgoKoQMDA5wAUFBQ/k9PT/pKSkr3R0dH8kNDQ+w+Pj7mOTk54DMzM9otLS3TJycnzSAgIMgZGRnBExMTvA0NDbcHBweyAwMDrwA9PT3+PDw8+zo6Ovg2Njb0MzMz8DAwMOwqKirnJSUl4iEhId4cHBzYFxcX1BISEtAODg7KCQkJxwQEBMQBAQHBAC0tLf4rKyv9Kioq+iYmJvclJSX0ISEh8R4eHu4aGhrqFhYW5xMTE+MQEBDgDQ0N3AgICNkGBgbWBAQE0wAAANEAHh4e/h0dHf0bGxv7Ghoa+hgYGPcWFhb2FBQU8xEREfEPDw/uDAwM7AoKCuoICAjoBgYG5gMDA+MBAQHiAAAA4QARERH+EBAQ/g8PD/0NDQ38DQ0N+wsLC/kKCgr4CAgI9wcHB/YFBQX0BAQE8wICAvIBAQHwAQEB7wAAAO8AAADuAAUFBf4FBQX+BAQE/gQEBP4DAwP+AwMD/QMDA/0CAgL8AQEB/AEBAfsAAAD7AAAA+wAAAPoAAAD6AAAA+QAAAPmq2NbsCl2m4wAAAABJRU5ErkJggg=="

    var checked = 'background-image: url("' + checkimg + '");';
    var slider = 'cursor: crosshair; float: left; height: 170px; position: relative; width: 19px; padding: 0;' + checked;
    var sliderControl = 'top: 0px; left: -5px; background: url("' + slideimg + '"); height: 5px; width: 29px; position: absolute; ';
    var sliderBG = 'position: relative;';

    this.element = createDiv("picker", null, "display:none; top: 58px; z-index: 20; background: #0d0d0d; color: #aaa; cursor: move; font-family: arial; font-size: 11px; padding: 7px 10px 11px 10px; position: fixed; width: 229px; border-radius: 5px; border: 1px solid #444;");
    var bg = createDiv("pickCURBG", null, checked + " float: left; width: 12px; height: 12px; margin-right: 3px;");
    bg.appendChild(createDiv("pickCUR", null, "float: left; width: 12px; height: 12px; background: #fff; margin-right: 3px;"));
    this.element.appendChild(bg);
    var rgb = createDiv("pickRGB", "R: 255 G: 255 B: 255", "float: left; position: relative; top: -1px;");
    rgb.onclick = "colours.picker.updateString()";
    this.element.appendChild(rgb);
    this.element.appendChild(createDiv("pickCLOSE", "X", "float: right; cursor: pointer; margin: 0 8px 3px;"));
    this.element.appendChild(createDiv("pickOK", "OK", "float: right; cursor: pointer; margin: 0 8px 3px;"));
    var sv = createDiv("SV", null, "position: relative; cursor: crosshair; float: left; height: 170px; width: 170px; margin-right: 10px; background: url('" + svimg +"') no-repeat; background-size: 100%;");
    sv.appendChild(createDiv("SVslide", null, "background: url('" + pickimg +"'); height: 9px; width: 9px; position: absolute; cursor: crosshair"));
    this.element.appendChild(sv);
    var h = createDiv("H", null, slider);
    h.appendChild(createDiv("Hmodel", null, sliderBG));
    h.appendChild(createDiv("Hslide", null, sliderControl));
    this.element.appendChild(h);
    var o = createDiv("O", null, slider + "border: 1px solid #888; left: 9px;");
    o.appendChild(createDiv("Omodel", null, sliderBG));
    o.appendChild(createDiv("Oslide", null, sliderControl));
    this.element.appendChild(o);
    parentElement.appendChild(this.element);

    /* Hover rules require appending to stylesheet */
    var css = '#pickRGB:hover {color: #FFD000;} #pickCLOSE:hover {color: #FFD000;} #pickOK:hover {color: #FFD000;}';
    var style = document.createElement('style');
    if (style.styleSheet)
        style.styleSheet.cssText = css;
    else
        style.appendChild(document.createTextNode(css));
    document.getElementsByTagName('head')[0].appendChild(style);

    // call base class constructor
    MoveWindow.call(this, "picker");

    this.savefn = savefn;
    this.abortfn = abortfn;
    this.size = 170.0; //H,S & V range in pixels
    this.sv = 5;   //Half size of SV selector
    this.oh = 2;   //Half size of H & O selectors
    this.picked = {H:360, S:100, V:100, A:1.0};
    this.max = {'H':360,'S':100,'V':100, 'A':1.0};
    this.colour = new Color();

    //Load hue strip
    var i, html='', bgcol, opac;
    for(i=0; i<=this.size; i++) {
        bgcol = new Color({H:Math.round((360/this.size)*i), S:100, V:100, A:1.0});
        html += "<div class='hue' style='height: 1px; width: 19px; margin: 0; padding: 0; background: " + bgcol.htmlHex()+";'> <\/div>";
    }
    $('Hmodel').innerHTML = html;

    //Load alpha strip
    html='';
    for(i=0; i<=this.size; i++) {
        opac=1.0-i/this.size;
        html += "<div class='opacity' style='height: 1px; width: 19px; margin: 0; padding: 0; background: #000;opacity: " + opac.toFixed(2) + ";'> <\/div>";
    }
    $('Omodel').innerHTML = html;
}

//Inherits from MoveWindow
ColourPicker.prototype = new MoveWindow;
ColourPicker.prototype.constructor = MoveWindow;

ColourPicker.prototype.pick = function(colour, x, y) {
    //Show the picker, with selected colour
    this.update(colour.HSVA());
    if (this.element.style.display == 'block') return;
    MoveWindow.prototype.open.call(this, x, y);
}

ColourPicker.prototype.select = function(element, x, y) {
    if (!x || !y) {
        var offset = findElementPos(element); //Requires: mouse.js
        x = x ? x : offset[0]+32;
        y = y ? y : offset[1]+32;
    }
    var colour = new Color(element.style.backgroundColor);
    //Show the picker, with selected colour
    this.update(colour.HSVA());
    if (this.element.style.display == 'block') return;
    MoveWindow.prototype.open.call(this, x, y);
    this.target = element;
}

//Mouse event handling
ColourPicker.prototype.click = function(e, mouse) {
    if (mouse.target.id == "pickCLOSE") {
        if (this.abortfn) this.abortfn();
        toggle('picker');
    } else if (mouse.target.id == "pickOK") {
        if (this.savefn)
            this.savefn(this.picked);

        //Set element background
        if (this.target) {
            var colour = new Color(this.picked);
            this.target.style.backgroundColor = colour.html();
        }

        toggle('picker');
    } else if (mouse.target.id == 'SV')
        this.setSV(mouse);
    else if (mouse.target.id == 'Hslide' || mouse.target.className == 'hue')
        this.setHue(mouse);
    else if (mouse.target.id == 'Oslide' || mouse.target.className == 'opacity')
        this.setOpacity(mouse);
}

ColourPicker.prototype.move = function(e, mouse) {
    //Process left drag
    if (mouse.isdown && mouse.button == 0) {
        if (mouse.target.id == 'picker' || mouse.target.id == 'pickCUR' || mouse.target.id == 'pickRGB') {
            //Call base class function
            MoveWindow.prototype.move.call(this, e, mouse);
        } else if (mouse.target) {
            //Drag on H/O slider acts as click
            this.click(e, mouse);
        }
    }
}

ColourPicker.prototype.wheel = function(e, mouse) {
    this.incHue(-e.spin);
}

ColourPicker.prototype.setSV = function(mouse) {
    var X = mouse.clientx - parseInt($('SV').offsetLeft),
        Y = mouse.clienty - parseInt($('SV').offsetTop);
    //Saturation & brightness adjust
    this.picked.S = scale(X, this.size, 0, this.max['S']);
    this.picked.V = this.max['V'] - scale(Y, this.size, 0, this.max['V']);
    this.update(this.picked);
}

ColourPicker.prototype.setHue = function(mouse) {
    var X = mouse.clientx - parseInt($('H').offsetLeft),
        Y = mouse.clienty - parseInt($('H').offsetTop);
    //Hue adjust
    this.picked.H = scale(Y, this.size, 0, this.max['H']);
    this.update(this.picked);
}

ColourPicker.prototype.incHue = function(inc) {
    //Hue adjust incrementally
    this.picked.H += inc;
    this.picked.H = clamp(this.picked.H, 0, this.max['H']);
    this.update(this.picked);
}

ColourPicker.prototype.setOpacity = function(mouse) {
    var X = mouse.clientx - parseInt($('O').offsetLeft),
        Y = mouse.clienty - parseInt($('O').offsetTop);
    //Alpha adjust
    this.picked.A = 1.0 - clamp(Y / this.size, 0, 1);
    this.update(this.picked);
}

ColourPicker.prototype.updateString = function(str) {
    if (!str) str = prompt('Edit colour:', this.colour.html());
    if (!str) return;
    this.colour = new Color(str);
    this.update(this.colour.HSV());
}

ColourPicker.prototype.update = function(HSV) {
    this.picked = HSV;
    this.colour = new Color(HSV),
    rgba = this.colour.rgbaObj(),
    rgbaStr = this.colour.html(),
    bgcol = new Color({H:HSV.H, S:100, V:100, A:255});

    $('pickRGB').innerHTML=this.colour.printString();
    $S('pickCUR').background=rgbaStr;
    $S('pickCUR').backgroundColour=rgbaStr;
    $S('SV').backgroundColor=bgcol.htmlHex();

    //Hue adjust
    $S('Hslide').top = this.size * (HSV.H/360.0) - this.oh + 'px';
    //SV adjust
    $S('SVslide').top = Math.round(this.size - this.size*(HSV.V/100.0) - this.sv) + 'px';
    $S('SVslide').left = Math.round(this.size*(HSV.S/100.0) - this.sv) + 'px';
    //Alpha adjust
    $S('Oslide').top = this.size * (1.0-HSV.A) - this.oh - 1 + 'px';
};
