precision highp float;

uniform sampler2D uVolume;
unifrom sampler2D uTransferFunction;

uniform vec3 uBBMin;
uniform vec3 uBBMax;
uniform vec3 uResolution;

uniform bool uEnableColor;


uniform float uBrightness;
uniform float uContrast;
uniform float uSaturation;
uniform float uPower;
uniform mat4 uPMatrix;
uniform mat4 uInvPMatrix;
uniform mat4 uMVMatrix;
uniform mat4 uNMatrix;
uniform vec4 uViewport;
uniform int uSamples;
uniform float uDensityFactor;
uniform float uIsoValue;
uniform vec4 uIsoColour;
uniform float uIsoSmooth;
uniform int uIsoWalls;
uniform int uFilter;
uniform vec2 uRange;
uniform vec2 uDenMinMax;

vec2 islices = vec2(1.0/slices.x, 1.0/slices.y);

vec4 texture3Dfrom2D(vec3 pos){
    float Z = pos.z*slices.x*slices.y;
    int slice = int(Z);

}


void main(){
    mat4 invMVMatrix = transpose(uMVMatrix);
    vec4 ndcPos;
    ndcPos.xy = ((2.0*gl_FragCoord.xy) - (2.0*uViewport.xy)) / (uViewport.zw - 1.0);
    ndcPos.z = (2.0*gl_FragCoord.z - gl_DepthRange.near - gl_DepthRange.far) / (gl_DepthRange.far - gl_DepthRange.near);
    ndcPos.w = 1.0;

    vec4 clipPos = ndcPos/gl_FragCoord.w;
    vec3 rayDirection = normalize((invMVMatrix*uInvPMatrix*clipPos).xyz);

    
    
    
}    
