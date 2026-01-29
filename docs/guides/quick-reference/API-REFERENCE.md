# Google Cloud AI - API Reference

**IMPORTANT FOR CLAUDE CODE: Use these direct Node.js scripts. Do NOT use MCP servers.**

---

## Quick Commands

### Nano Banana Pro (Professional Text-in-Images)
```bash
cd /Users/louisherman/ClaudeCodeProjects
# No API key needed - uses Google Cloud OAuth
node nanobanana-direct.js generate "business card with 'ACME Corp' and '555-1234'"
```
**Model:** `gemini-3-pro-image-preview`
**Auth:** Vertex AI OAuth (application_default_credentials.json)
**Output:** `~/nanobanana-output/`
**Features:** 4K output, 14 reference images, advanced text rendering, Google Search grounding, thinking process

### Nano Banana Pro - Image Editing
```bash
node nanobanana-direct.js edit ~/Pictures/photo.jpg "add colorful flowers in the foreground"
```
**Purpose:** Edit existing images with text prompts
**Features:** Add/remove/modify elements, style changes, color grading

### Nano Banana Pro with Google Search Grounding
```bash
node nanobanana-direct.js grounded "infographic about climate change statistics"
```
**Purpose:** Factually accurate images using real-time web search
**Features:** Verifies facts, shows web sources used, displays thinking process

### Nano Banana with Reference Images
```bash
node nanobanana-direct.js with-ref "same style" ref1.jpg ref2.jpg ref3.png
```
**Max references:** 14 images (6 objects + 5 humans)
**Supported formats:** .jpg, .jpeg, .png, .webp

### Imagen 3 (Photorealistic Images)
```bash
node imagen-direct.js generate "professional headshot of a businesswoman"
```
**Output:** `~/imagen-output/`

### Imagen 3 (Edit Images)
```bash
node imagen-direct.js edit ~/Pictures/photo.jpg "add colorful flowers"
```

### Veo 3.1 (Video Generation)
```bash
export GEMINI_API_KEY="AIzaSyAfaz9ab1OhqyAxGKrEhFvEqrHtB549as8"
node veo-direct.js generate "waves crashing on beach at sunset"
```
**Output:** `~/Videos/veo-output/`
**Note:** Requires GEMINI_API_KEY environment variable set

---

## Which API to Use?

| User Wants | Use This | Command |
|------------|----------|---------|
| Professional text-in-image | Nano Banana Pro | `node nanobanana-direct.js generate "..."` |
| Business card/poster/infographic | Nano Banana Pro | `node nanobanana-direct.js generate "..."` |
| Factual infographic with sources | Nano Banana Pro (Grounded) | `node nanobanana-direct.js grounded "..."` |
| Edit image with text prompts | Nano Banana Pro | `node nanobanana-direct.js edit image.jpg "..."` |
| Style matching with references | Nano Banana Pro | `node nanobanana-direct.js with-ref "..." ref1.jpg ref2.jpg` |
| Photorealistic image (no text) | Imagen 3 | `node imagen-direct.js generate "..."` |
| Edit existing image (photorealistic) | Imagen 3 | `node imagen-direct.js edit image.jpg "..."` |
| Video (4-8 sec) | Veo 3.1 | `node veo-direct.js generate "..."` |
| Video from image | Veo 3.1 | `node veo-direct.js from-image image.jpg "..."` |

**Important Notes:**
- **Nano Banana Pro** NOW supports image editing! Use for text-in-images AND editing
- **Imagen 3** is for photorealistic images WITHOUT text support
- **Nano Banana Pro** supports up to 14 reference images for style matching
- **Google Search grounding** enables factual accuracy and shows web sources used
- **Thinking process** shows model's reasoning steps (enabled by default)
- **Multi-turn conversations** available via NanoBananaChat class
- All models include SynthID watermark for AI-generated content tracking

---

## Key Information

### Authentication

**Nano Banana Pro & Imagen 3:**
- **Project:** gen-lang-client-0925343693
- **Auth:** Vertex AI OAuth via `~/.config/gcloud/application_default_credentials.json`
- **Endpoint:** Vertex AI (aiplatform.googleapis.com)
- **Tier:** Paid (Vertex AI) with $100 credits
- **Setup:** `gcloud auth application-default login`
- **Quota:** No limits

**Veo 3.1:**
- **Auth:** Simple API key (GEMINI_API_KEY environment variable)
- **Endpoint:** Standard Gemini API (generativelanguage.googleapis.com)
- **Billing:** Uses $100 Google Cloud credits (must enable Cloud Billing at https://aistudio.google.com)
- **Setup:** Add to `~/.zshrc`: `export GEMINI_API_KEY="AIzaSyAfaz9ab1OhqyAxGKrEhFvEqrHtB549as8"`

### Files Location
All scripts in: `/Users/louisherman/ClaudeCodeProjects/`
- `nanobanana-direct.js`
- `imagen-direct.js`
- `veo-direct.js`

### Testing Status
- ✅ Nano Banana Pro - WORKING (simplified! now uses standard Gemini API with API key)
- ✅ Imagen 3 Generate - WORKING (tested with photos)
- ✅ Imagen 3 Edit - WORKING (auto-masking tested)
- ✅ Veo 3.1 - WORKING (simplified! now uses standard Gemini API with API key)

**Benefits of simplification:**
- **Nano Banana Pro:** Professional-grade Gemini 3 Pro with all advanced features
- **Veo 3.1:** 8% smaller code (8.2K vs 8.9K)
- Simple API key instead of OAuth for Nano Banana & Veo
- Same $100 credits, same features
- Easier to use in Claude Code
- Single model (Gemini 3 Pro) for all image generation needs

---

## DO NOT USE (Removed)

❌ MCP servers (deleted):
- `nanobanana-vertex-mcp`
- `imagen-vertex-mcp`
- `veo-vertex-mcp`

❌ Old scripts (deleted):
- `gemini-image-direct.js` (use Nano Banana Pro instead)

---

## Nano Banana Pro - Complete Capabilities

### Core Features
- **Advanced Text Rendering**: Legible, stylized text for business cards, posters, menus, diagrams, infographics
- **Image Editing**: Modify existing images with text prompts (add/remove/change elements, style, color)
- **Reference Images**: Up to 14 reference images (6 objects + 5 humans) for style consistency
- **Output Resolutions**: 1K, 2K, 4K (uppercase required: "1K", "2K", "4K")
- **Aspect Ratios**: "1:1", "2:3", "3:2", "3:4", "4:3", "4:5", "5:4", "9:16", "16:9", "21:9"
- **Google Search Grounding**: Real-time web search for factual accuracy
- **Thinking Process**: Shows reasoning steps, saves interim thought images (enabled by default, not charged)
- **Multi-turn Conversations**: Iterative editing through NanoBananaChat class
- **SynthID Watermark**: All images include watermark for AI content identification

### Module Usage (Node.js)

#### Single Image Generation
```javascript
import { generateImage } from './nanobanana-direct.js';

const result = await generateImage({
  prompt: "business card with 'ACME Corp' and '555-1234'",
  aspectRatio: '16:9',        // Optional, default: '1:1'
  imageSize: '4K',            // Optional, default: '2K'
  referenceImagePaths: [      // Optional, max 14
    '/path/to/style-ref.jpg',
    '/path/to/color-ref.png'
  ],
  editImagePath: '/path/to/image.jpg',  // Optional, for image editing
  enableGoogleSearch: true,   // Optional, default: false
  showThinkingProcess: true,  // Optional, default: true
  safetySettings: [           // Optional
    {
      category: 'HARM_CATEGORY_HATE_SPEECH',
      threshold: 'BLOCK_MEDIUM_AND_ABOVE'
    }
  ]
});

console.log(result.images);              // Array of saved image paths
console.log(result.thinkingProcess);     // Reasoning steps and interim images
console.log(result.groundingMetadata);   // Google Search sources used
```

#### Multi-turn Conversations
```javascript
import { NanoBananaChat } from './nanobanana-direct.js';

const chat = new NanoBananaChat({
  imageSize: '4K',
  enableGoogleSearch: true,
  showThinkingProcess: true
});

// Turn 1: Create initial image
let result = await chat.sendMessage(
  "Create an infographic about photosynthesis with labeled diagrams"
);
console.log('Created:', result.images);

// Turn 2: Iterative editing
result = await chat.sendMessage(
  "Update this infographic to be in Spanish, keep all other elements"
);
console.log('Updated:', result.images);

// Turn 3: Further refinement
result = await chat.sendMessage(
  "Make the background gradient blue to green"
);
console.log('Refined:', result.images);

// Get full conversation history
console.log(chat.getHistory());
```

### Grounding Metadata
When `enableGoogleSearch: true`, the response includes:
- **searchEntryPoint**: HTML/CSS for Google Search suggestions
- **groundingChunks**: Top 3 web sources used for factual accuracy

---

## Imagen 3 Edit Limitations

**CAN do:**
- ✅ Add objects to images
- ✅ Remove objects from images
- ✅ Replace backgrounds
- ✅ Extend images (outpaint)

**CANNOT do:**
- ❌ Change person's clothing on same subject
- ❌ Transform both person AND background simultaneously
- **Solution:** Generate fresh images instead

---

**Last Updated:** 2026-01-28
**Location:** `/Users/louisherman/ClaudeCodeProjects/`
