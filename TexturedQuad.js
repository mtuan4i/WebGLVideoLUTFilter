import {
    OrthographicCamera, BufferGeometry, BufferAttribute, RawShaderMaterial, Scene, Mesh, Vector2, Texture,
    LinearFilter, VideoTexture, TextureLoader, Line
} from "./three.module.js";

const vertexShader = `
precision lowp float;
attribute lowp vec2 position;
void main() {
  gl_Position = vec4(position, 1.0, 1.0);
}
`

const fragmentShader = `
precision highp float;
uniform sampler2D uScene;
uniform sampler2D uLUT;
uniform vec2 uResolution;
uniform float uWeight;

void main() {
    vec2 uv = gl_FragCoord.xy / uResolution.xy;
    vec3 texCoord = texture2D(uScene, uv).xyz;

    // 1D LUT
    // float size = 8.0;
    // float sliceSize = 1.0 / size;                  // space of 1 slice
    // float slicePixelSize = sliceSize / size;       // space of 1 pixel
    // float width = size - 1.0;
    // float sliceInnerSize = slicePixelSize * width; // space of size pixels
    // float zSlice0 = floor( texCoord.z * width);
    // float zSlice1 = min( zSlice0 + 1.0, width);
    // float xOffset = slicePixelSize * 0.5 + texCoord.x * sliceInnerSize;                      
    // float yRange = 1.0 - (texCoord.y * width + 0.5) / size;
    // float s0 = xOffset + (zSlice0 * sliceSize);
    //
    // float s1 = xOffset + (zSlice1 * sliceSize);
    // vec4 slice0Color = texture2D(uLUT, vec2(s0, yRange));
    // vec4 slice1Color = texture2D(uLUT, vec2(s1, yRange));
    // //float zOffset = mod(texCoord.z * width, 1.0);
    // float zOffset = texCoord.z * width - zSlice0;
    // gl_FragColor = mix(slice0Color, slice1Color, zOffset) * uWeight + texture2D(uScene, uv) * (1.0 - uWeight);

    // 2D LUT
    float size = 8.0;
    float sliceSize = 1.0 / size;                  // space of 1 slice
    float slicePixelSize = sliceSize / 64.0;       // space of 1 pixel
    float width = 64.0 - 1.0;
    float sliceInnerSize = slicePixelSize * width; // space of size pixels
    
    float L = 63.0;
    float blue = texCoord.z * L;
    
    float xOffset = slicePixelSize * 0.5 + texCoord.x * sliceInnerSize;                      
    float yOffset = slicePixelSize * 0.5 + texCoord.y * sliceInnerSize; 
    
    vec2 slice0 = vec2(0.0);
    slice0.y = floor(floor(blue) / size);
    slice0.x = floor(blue) - (slice0.y * size);
    vec2 s0;        
    s0 = vec2(xOffset + (slice0.x * sliceSize), yOffset + (slice0.y * sliceSize));

    vec2 slice1 = vec2(0.0);
    slice1.y = floor(ceil(blue) / size);
    slice1.x = ceil(blue) - (slice1.y * size);        
    vec2 s1;
    s1 = vec2(xOffset + (slice1.x * sliceSize), yOffset + (slice1.y * sliceSize));

    vec4 slice0Color = texture2D(uLUT, s0);
    vec4 slice1Color = texture2D(uLUT, s1);
    float zOffset = fract(blue);
    gl_FragColor = mix(slice0Color, slice1Color, zOffset) * uWeight + texture2D(uScene, uv) * (1.0 - uWeight);
}
`

export class TexturedQuad {
    constructor(renderer, video) {
        this.renderer = renderer;
        this.scene = new Scene();
        this.dummyCamera = new OrthographicCamera();
        this.geometry = new BufferGeometry();
        const vertices = new Float32Array([
            -1.0, -1.0, 3.0, -1.0, -1.0, 3.0
        ]);
        this.geometry.setAttribute('position', new BufferAttribute(vertices, 2));
        this.resolution = new Vector2();
        this.renderer.getDrawingBufferSize(this.resolution);

        this.texture = new VideoTexture(video);
        this.texture.minFilter = LinearFilter;
        this.texture.maxFilter = LinearFilter;

        let lutTex = new TextureLoader().load('./LUT0.png');
        lutTex.magFilter = LinearFilter;
        lutTex.minFilter = LinearFilter;

        this.material = new RawShaderMaterial({
            fragmentShader, vertexShader, uniforms: {
                uResolution: {value: this.resolution},
                uScene: {value: this.texture},
                uLUT: {value: lutTex},
                uWeight: {value: 1.0}
            }, depthWrite: false, depthTest: false
        });
        this.triangle = new Mesh(this.geometry, this.material);
        // this.triangle.frustumCulled = false;
        this.scene.add(this.triangle);
    }

    didResize(width, height) {
        this.renderer.getDrawingBufferSize(this.resolution);
        this.triangle.material.uniforms.uResolution.value = this.resolution;
    }

    setParameter(w) {
        this.triangle.material.uniforms.uWeight.value = w;
    }

    setLUT(luturl) {
        let lutTex = new TextureLoader().load(luturl, () => {
            lutTex.magFilter = LinearFilter;
            lutTex.minFilter = LinearFilter;
            this.triangle.material.uniforms.uLUT.value = lutTex;
        });

    }

    render() {
        this.renderer.render(this.scene, this.dummyCamera);
    }
}