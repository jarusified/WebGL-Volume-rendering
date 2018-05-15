#ifdef GL_ES
precision highp float;
#endif

precision highp float;
attribute vec3 vp;
attribute vec4 vc;
uniform mat4 uMVMatrix;
uniform mat4 uPMatrix;
uniform vec4 uColour;
uniform float uAlpha;
varying vec4 vColour;
void main(void)
{
    vec4 mvPosition = uMVMatrix * vec4(vp, 1.0);
    gl_Position = uPMatrix * mvPosition;
    vec4 color = vc;
    float alpha = 1.0;
    if (uColor.a > 0.01) color = uColor;
    if (uAlpha > 0.01) alpha = uAlpha;
    vColor = vec4(color.rgb, color.a * alpha);
}
