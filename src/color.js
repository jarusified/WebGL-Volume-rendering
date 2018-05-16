function ColorPos(colour, pos) {
    if (pos == undefined)
        this.position = 0.0;
    else
        this.position = parseFloat(pos);
    //Detect out of range...
    if (this.position >= 0 && this.position <= 1) {
        if (colour) {
            if (typeof(colour) == 'object')
                this.colour = colour;
            else
                this.colour = new Color(colour);
        } else {
            this.colour = new Color("#000000");
        }
    } else {
        throw( "Invalid Colour Position: " + pos);
    }
}

function Color(color) {
    //Construct... stores color as r,g,b,a values
    //Can pass in html color string, HSV object, Color object or integer rgba
    if (typeof color == "undefined")
        this.set("#ffffff")
    else if (typeof(color) == 'string')
        this.set(color);
    else if (typeof(color) == 'object') {
        //Determine passed type, Color, RGBA or HSV
        if (typeof color.H != "undefined")
            //HSV
            this.setHSV(color);
        else if (typeof color.red != "undefined") {
            //Another Color object
            this.red = color.red;
            this.green = color.green;
            this.blue = color.blue;
            this.alpha = color.alpha;
        } else if (color.R) {
            //RGBA
            this.red = color.R;
            this.green = color.G;
            this.blue = color.B;
            this.alpha = typeof color.A == "undefined" ? 1.0 : color.A;
        } else {
            //Assume array
            this.red = color[0];
            this.green = color[1];
            this.blue = color[2];
            //Convert float components to [0-255]
            //NOTE: This was commented, not sure where the problem was
            //Needed for parsing JSON array [0,1] colors
            if (this.red <= 1.0 && this.green <= 1.0 && this.blue <= 1.0) {
                this.red = Math.round(this.red * 255);
                this.green = Math.round(this.green * 255);
                this.blue = Math.round(this.blue * 255);
            }
            this.alpha = typeof color[3] == "undefined" ? 1.0 : color[3];
        }
    } else {
        //Convert from integer AABBGGRR
        this.fromInt(color);
    }
}

Color.prototype.set = function(val) {
    if (!val) val = "#ffffff"; //alert("No Value provided!");
    var re = /^rgba?\((\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,?\s*(\d\.?\d*)?\)$/;
    var bits = re.exec(val);
    if (bits)
    {
        this.red = parseInt(bits[1]);
        this.green = parseInt(bits[2]);
        this.blue = parseInt(bits[3]);
        this.alpha = typeof bits[4] == "undefined" ? 1.0 : parseFloat(bits[4]);

    } else if (val.charAt(0) == "#") {
        var hex = val.substring(1,7);
        this.alpha = 1.0;
        this.red = parseInt(hex.substring(0,2),16);
        this.green = parseInt(hex.substring(2,4),16);
        this.blue = parseInt(hex.substring(4,6),16);
    } else {
        //Attempt to parse as integer
        this.fromInt(parseInt(val));
    }
}

Color.prototype.fromInt = function(intcolor) {
    //Convert from integer AABBGGRR
    this.red = (intcolor&0x000000ff);
    this.green = (intcolor&0x0000ff00) >>> 8;
    this.blue = (intcolor&0x00ff0000) >>> 16;
    this.alpha = ((intcolor&0xff000000) >>> 24) / 255.0;
}

Color.prototype.toInt = function() {
    //Convert to integer AABBGGRR
    var result = this.red;
    result += (this.green << 8);
    result += (this.blue << 16);
    result += (Math.round(this.alpha * 255) << 24);
    return result;
}

Color.prototype.toString = function() {return this.html();}

Color.prototype.html = function() {
    return "rgba(" + this.red + "," + this.green + "," + this.blue + "," + this.alpha.toFixed(2) + ")";
}

Color.prototype.rgbaGL = function() {
    var arr = [this.red/255.0, this.green/255.0, this.blue/255.0, this.alpha];
    return new Float32Array(arr);
}

Color.prototype.rgbaGLSL = function() {
    var c = this.rgbaGL();
    return "rgba(" + c[0].toFixed(4) + "," + c[1].toFixed(4) + "," + c[2].toFixed(4) + "," + c[3].toFixed(4) + ")";
}

Color.prototype.rgba = function() {
    var rgba = [this.red/255.0, this.green/255.0, this.blue/255.0, this.alpha];
    return rgba;
}

Color.prototype.rgbaObj = function() {
    //OK.debug('R:' + this.red + ' G:' + this.green + ' B:' + this.blue + ' A:' + this.alpha);
    return({'R':this.red, 'G':this.green, 'B':this.blue, 'A':this.alpha});
}

Color.prototype.print = function() {
    OK.debug(this.printString(true));
}

Color.prototype.printString = function(alpha) {
    return 'R:' + this.red + ' G:' + this.green + ' B:' + this.blue + (alpha ? ' A:' + this.alpha : '');
}

Color.prototype.HEX = function(o) {
    o = Math.round(Math.min(Math.max(0,o),255));
    return("0123456789ABCDEF".charAt((o-o%16)/16)+"0123456789ABCDEF".charAt(o%16));
}

Color.prototype.htmlHex = function(o) {
    return("#" + this.HEX(this.red) + this.HEX(this.green) + this.HEX(this.blue));
};

Color.prototype.hex = function(o) {
    //hex RGBA in expected order
    return(this.HEX(this.red) + this.HEX(this.green) + this.HEX(this.blue) + this.HEX(this.alpha*255));
};

Color.prototype.hexGL = function(o) {
    //RGBA for openGL (stored ABGR internally on little endian)
    return(this.HEX(this.alpha*255) + this.HEX(this.blue) + this.HEX(this.green) + this.HEX(this.red));
};

Color.prototype.setHSV = function(o)
{
    var R, G, A, B, C, S=o.S/100, V=o.V/100, H=o.H/360;

    if(S>0) {
        if(H>=1) H=0;

        H=6*H; F=H-Math.floor(H);
        A=Math.round(255*V*(1-S));
        B=Math.round(255*V*(1-(S*F)));
        C=Math.round(255*V*(1-(S*(1-F))));
        V=Math.round(255*V);

        switch(Math.floor(H)) {
        case 0: R=V; G=C; B=A; break;
        case 1: R=B; G=V; B=A; break;
        case 2: R=A; G=V; B=C; break;
        case 3: R=A; G=B; B=V; break;
        case 4: R=C; G=A; B=V; break;
        case 5: R=V; G=A; B=B; break;
        }

        this.red = R ? R : 0;
        this.green = G ? G : 0;
        this.blue = B ? B : 0;
    } else {
        this.red = (V=Math.round(V*255));
        this.green = V;
        this.blue = V;
    }
    this.alpha = typeof o.A == "undefined" ? 1.0 : o.A;
}

Color.prototype.HSV = function() {
    var r = ( this.red / 255.0 );                   //RGB values = 0 ÷ 255
    var g = ( this.green / 255.0 );
    var b = ( this.blue / 255.0 );

    var min = Math.min( r, g, b );    //Min. value of RGB
    var max = Math.max( r, g, b );    //Max. value of RGB
    deltaMax = max - min;             //Delta RGB value

    var v = max;
    var s, h;
    var deltaRed, deltaGreen, deltaBlue;

    if ( deltaMax == 0 )                     //This is a gray, no chroma...
    {
        h = 0;                               //HSV results = 0 ÷ 1
        s = 0;
    }
    else                                    //Chromatic data...
    {
        s = deltaMax / max;

        deltaRed = ( ( ( max - r ) / 6 ) + ( deltaMax / 2 ) ) / deltaMax;
        deltaGreen = ( ( ( max - g ) / 6 ) + ( deltaMax / 2 ) ) / deltaMax;
        deltaBlue = ( ( ( max - b ) / 6 ) + ( deltaMax / 2 ) ) / deltaMax;

        if      ( r == max ) h = deltaBlue - deltaGreen;
        else if ( g == max ) h = ( 1 / 3 ) + deltaRed - deltaBlue;
        else if ( b == max ) h = ( 2 / 3 ) + deltaGreen - deltaRed;

        if ( h < 0 ) h += 1;
        if ( h > 1 ) h -= 1;
    }

    return({'H':360*h, 'S':100*s, 'V':v*100});
}

Color.prototype.HSVA = function() {
    var hsva = this.HSV();
    hsva.A = this.alpha;
    return hsva;
}

Color.prototype.interpolate = function(other, lambda) {
    //Interpolate between this color and another by lambda
    this.red = Math.round(this.red + lambda * (other.red - this.red));
    this.green = Math.round(this.green + lambda * (other.green - this.green));
    this.blue = Math.round(this.blue + lambda * (other.blue - this.blue));
    this.alpha = Math.round(this.alpha + lambda * (other.alpha - this.alpha));
}

Color.prototype.blend = function(src) {
    //Blend this color with another and return result (uses src alpha from other color)
    return new Color([
        Math.round((1.0 - src.alpha) * this.red + src.alpha * src.red),
        Math.round((1.0 - src.alpha) * this.green + src.alpha * src.green),
        Math.round((1.0 - src.alpha) * this.blue + src.alpha * src.blue),
        (1.0 - src.alpha) * this.alpha + src.alpha * src.alpha
    ]);
}
