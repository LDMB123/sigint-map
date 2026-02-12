---
name: safari-media-gpu
description: >
  Expert in Safari 26.0-26.2 media, graphics, and GPU features including WebGPU,
  WebXR on visionOS, HDR images/canvas, WebCodecs audio, MediaRecorder ALAC/PCM,
  Media Source Extensions, immersive media, the <model> element, and WebRTC
  enhancements. Use for GPU-accelerated rendering, immersive experiences,
  advanced media processing, or 3D content on Apple platforms.
user-invocable: true
allowed-tools:
  - Read
  - Write
  - Edit
  - Grep
  - Glob
  - WebSearch
disable-model-invocation: false
---

# Safari 26.0-26.2 Media & GPU Skill

Expert knowledge of media, graphics, and GPU features in Safari 26.0 and 26.2.

## WebGPU (26.0 + 26.2)

Full WebGPU support with WGSL shading language:

```js
// Initialize WebGPU
const adapter = await navigator.gpu.requestAdapter();
const device = await adapter.requestDevice();

// Create shader module
const shaderModule = device.createShaderModule({
  code: `
    @vertex
    fn vertexMain(@builtin(vertex_index) vertexIndex: u32) -> @builtin(position) vec4f {
      var pos = array<vec2f, 3>(
        vec2f( 0.0,  0.5),
        vec2f(-0.5, -0.5),
        vec2f( 0.5, -0.5)
      );
      return vec4f(pos[vertexIndex], 0.0, 1.0);
    }

    @fragment
    fn fragmentMain() -> @location(0) vec4f {
      return vec4f(1.0, 0.0, 0.0, 1.0);
    }
  `
});

// Render pipeline
const pipeline = device.createRenderPipeline({
  layout: 'auto',
  vertex: { module: shaderModule, entryPoint: 'vertexMain' },
  fragment: {
    module: shaderModule,
    entryPoint: 'fragmentMain',
    targets: [{ format: navigator.gpu.getPreferredCanvasFormat() }]
  }
});

// Configure canvas
const canvas = document.querySelector('canvas');
const context = canvas.getContext('webgpu');
context.configure({
  device,
  format: navigator.gpu.getPreferredCanvasFormat()
});
```

### Compute Shaders
```js
const computeModule = device.createShaderModule({
  code: `
    @group(0) @binding(0) var<storage, read_write> data: array<f32>;

    @compute @workgroup_size(64)
    fn main(@builtin(global_invocation_id) id: vec3u) {
      data[id.x] = data[id.x] * 2.0;
    }
  `
});

const computePipeline = device.createComputePipeline({
  layout: 'auto',
  compute: { module: computeModule, entryPoint: 'main' }
});
```

### HDR Canvas via WebGPU (26.0)
```js
context.configure({
  device,
  format: 'rgba16float',  // HDR format
  toneMapping: { mode: 'standard' }  // or 'extended'
});
```

### WebGPU + WebXR on visionOS (26.2)
```js
// GPUTexture as depth-stencil in XR render passes
const depthTexture = device.createTexture({
  size: [width, height],
  format: 'depth24plus-stencil8',
  usage: GPUTextureUsage.RENDER_ATTACHMENT
});

// Use as both depth-stencil and resolve attachment
const renderPassDescriptor = {
  colorAttachments: [/* ... */],
  depthStencilAttachment: {
    view: depthTexture.createView(),
    depthLoadOp: 'clear',
    depthStoreOp: 'store',
    depthClearValue: 1.0,
    stencilLoadOp: 'clear',
    stencilStoreOp: 'store'
  }
};
```

## HDR Images (26.0)

Safari renders HDR images natively:

```css
/* Control HDR rendering per element */
.photo { dynamic-range-limit: no-limit; }   /* full HDR */
.thumbnail { dynamic-range-limit: standard; } /* clamp to SDR */
```

```html
<!-- HDR-aware picture element -->
<picture>
  <source srcset="hero-hdr.avif" type="image/avif"
          media="(dynamic-range: high)">
  <source srcset="hero-sdr.avif" type="image/avif">
  <img src="hero.jpg" alt="Hero image">
</picture>
```

```js
// Detect HDR display
const isHDR = window.matchMedia('(dynamic-range: high)').matches;
```

## WebCodecs Audio (26.0)

Low-level audio frame access:

```js
// Audio Encoder
const encoder = new AudioEncoder({
  output: (chunk, metadata) => {
    // Handle encoded audio chunk
    sendToServer(chunk);
  },
  error: (e) => console.error('Encode error:', e)
});

encoder.configure({
  codec: 'opus',
  sampleRate: 48000,
  numberOfChannels: 2,
  bitrate: 128000
});

// Audio Decoder
const decoder = new AudioDecoder({
  output: (frame) => {
    // Process decoded AudioData
    const samples = new Float32Array(frame.numberOfFrames * frame.numberOfChannels);
    frame.copyTo(samples, { planeIndex: 0 });
    processAudioSamples(samples);
    frame.close();
  },
  error: (e) => console.error('Decode error:', e)
});
```

## MediaRecorder: ALAC & PCM (26.0)

```js
const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

// Record as ALAC (Apple Lossless)
const recorder = new MediaRecorder(stream, {
  mimeType: 'audio/mp4; codecs=alac'
});

// Record as PCM (uncompressed)
const pcmRecorder = new MediaRecorder(stream, {
  mimeType: 'audio/wav; codecs=pcm'
});

// Check support
MediaRecorder.isTypeSupported('audio/mp4; codecs=alac'); // true on Safari 26+
MediaRecorder.isTypeSupported('audio/wav; codecs=pcm');   // true on Safari 26+
```

## Media Source Extensions (26.0)

### Detachable MediaSource
```js
// Create MediaSource that can be transferred
const mediaSource = new MediaSource();
const objectURL = URL.createObjectURL(mediaSource);

// Detach from main thread for worker processing
mediaSource.handle; // MediaSourceHandle for transfer

// Use with worker
const handle = mediaSource.handle;
worker.postMessage({ handle }, [handle]);
```

### DecompressionSession Support
Hardware-accelerated video decompression for MSE.

### In-Band Track Support
Embedded text/audio tracks within media segments.

## Immersive Media - visionOS (26.0)

### Spatial Video
```html
<!-- Spatial video playback on Apple Vision Pro -->
<video src="spatial-video.mov" controls
       spatial-video
       playsinline>
</video>
```

### Apple Immersive Video
Supports 180deg, 360deg, and wide FOV videos with Apple Projected Media Profile (APMP).

## `<model>` Element - visionOS (26.0)

Interactive 3D model embedding:

```html
<model src="product.usdz"
       environmentmap="studio.hdr"
       autoplay
       loop
       stagemode="mono"
       style="width: 400px; height: 300px;">
</model>
```

### JavaScript API
```js
const model = document.querySelector('model');

// Wait for load
await model.ready;

// Playback control
model.play();
model.pause();
model.playbackRate = 0.5;
model.currentTime = 2.5;

// Entity transforms
model.entityTransform = {
  scale: { x: 1.5, y: 1.5, z: 1.5 },
  rotation: { x: 0, y: 45, z: 0 },
  translation: { x: 0, y: 0, z: 0 }
};
```

## WebRTC Enhancements

### Safari 26.0
```js
// CSRC information on encoded video
const transform = new TransformStream({
  transform(frame, controller) {
    // Access CSRC info on RTCEncodedVideoFrame
    const metadata = frame.getMetadata();
    console.log('CSRCs:', metadata.csrcs);
    controller.enqueue(frame);
  }
});

// Speaker Selection API (iOS/iPadOS)
const devices = await navigator.mediaDevices.enumerateDevices();
const speakers = devices.filter(d => d.kind === 'audiooutput');

// Frame serialization
const audioFrame = new RTCEncodedAudioFrame(/* ... */);
const videoFrame = new RTCEncodedVideoFrame(/* ... */);
// Both are now serializable/transferable

// ImageCapture
const track = stream.getVideoTracks()[0];
const imageCapture = new ImageCapture(track);
const bitmap = await imageCapture.grabFrame();

// Keyframe generation with RID
transformer.generateKeyFrame('simulcast-rid');
```

### Safari 26.2
```js
// Encrypted header extension control
const sender = pc.addTransceiver('video').sender;
const params = sender.getParameters();
params.headerExtensions.forEach(ext => {
  // Control which header extensions are encrypted
  console.log(ext.encrypted); // boolean
});
```

## Canvas Changes (26.2)

```js
// Non-standard drawImageFromRect REMOVED
// Migrate to standard drawImage
const ctx = canvas.getContext('2d');

// Old (removed): ctx.drawImageFromRect(image, sx, sy, sw, sh, dx, dy, dw, dh, compositeOp)
// New (standard): ctx.drawImage(image, sx, sy, sw, sh, dx, dy, dw, dh)
```

## SVG Enhancements (26.0 + 26.2)

### SVG Icons (26.0)
```html
<!-- SVG favicons now supported -->
<link rel="icon" type="image/svg+xml" href="/favicon.svg">

<!-- Data URL icons -->
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><circle cx='16' cy='16' r='14' fill='%234285f4'/></svg>">
```

### SVG Pointer Events (26.0)
```xml
<!-- Bounding-box hit testing for groups -->
<g pointer-events="bounding-box">
  <circle cx="10" cy="10" r="5"/>
  <circle cx="30" cy="30" r="5"/>
  <!-- Clicking between circles now registers -->
</g>
```

### SVG Animation Events (26.2)
```js
const anim = document.querySelector('animate');
anim.addEventListener('repeatEvent', (e) => {
  console.log('Iteration:', e.detail);
});
anim.onbegin = () => console.log('Started');
```

### SVG Attributes (26.2)
- `<a type="...">` - MIME type on links
- `<script async>` - Async script loading
- `hreflang` on `<a>` elements

## Feature Detection

```js
// WebGPU
if ('gpu' in navigator) { /* supported */ }

// HDR display
if (window.matchMedia('(dynamic-range: high)').matches) { /* HDR display */ }

// WebCodecs Audio
if ('AudioEncoder' in window) { /* supported */ }

// MediaRecorder ALAC
if (MediaRecorder.isTypeSupported('audio/mp4; codecs=alac')) { /* supported */ }

// WebXR (visionOS)
if ('xr' in navigator) {
  const supported = await navigator.xr.isSessionSupported('immersive-ar');
}

// <model> element
if ('HTMLModelElement' in window) { /* supported */ }

// ImageCapture
if ('ImageCapture' in window) { /* supported */ }
```

## Performance Notes - Apple Silicon

- WebGPU maps to Metal on Apple Silicon - near-native GPU performance
- Unified Memory Architecture means GPU/CPU share memory pool
- HDR rendering leverages XDR display hardware on MacBook Pro/Pro Display XDR
- WebCodecs can use hardware encoders/decoders via VideoToolbox
- Spatial media on visionOS uses dedicated media engine
