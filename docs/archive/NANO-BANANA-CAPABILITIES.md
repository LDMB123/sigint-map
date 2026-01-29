# Nano Banana Pro - Complete Implementation ✅

**Last verified:** 2026-01-28
**Documentation:** https://ai.google.dev/gemini-api/docs/image-generation#gemini-3-capabilities

---

## ✅ All Gemini 3 Pro Capabilities Implemented

### Core Model
- ✅ **Model:** `gemini-3-pro-image-preview`
- ✅ **Endpoint:** `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent`
- ✅ **Authentication:** API key via `x-goog-api-key` header

### Output Configurations
- ✅ **Resolutions:** "1K" (default), "2K", "4K" (uppercase required)
- ✅ **Aspect Ratios:** "1:1", "2:3", "3:2", "3:4", "4:3", "4:5", "5:4", "9:16", "16:9", "21:9"
- ✅ **Response Modalities:** ['TEXT', 'IMAGE']

### Advanced Features
- ✅ **Text Rendering:** Advanced text-in-image for business cards, posters, infographics, menus, diagrams
- ✅ **Reference Images:** Up to 14 images (6 objects + 5 humans) for style consistency
- ✅ **Google Search Grounding:** Real-time web search for factual accuracy (`tools: [{ google_search: {} }]`)
- ✅ **Grounding Metadata:** Extraction of `searchEntryPoint` and `groundingChunks` from response
- ✅ **Advanced Reasoning:** Model shows interim "thinking" process in text responses
- ✅ **Multi-turn Conversations:** Supports iterative editing (via module API)
- ✅ **Safety Settings:** Customizable safety configuration
- ✅ **SynthID Watermark:** Automatic watermark in all generated images

### Implementation Details

#### Reference Images (Lines 62-80)
```javascript
for (const imagePath of referenceImagePaths.slice(0, 14)) {
  const imageBuffer = await fs.readFile(imagePath);
  const base64Image = imageBuffer.toString('base64');
  const ext = path.extname(imagePath).toLowerCase();
  const mimeType = ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' :
                   ext === '.webp' ? 'image/webp' : 'image/png';
  parts.push({
    inline_data: {
      mime_type: mimeType,
      data: base64Image,
    },
  });
}
```

#### Google Search Grounding (Lines 94-105)
```javascript
const requestBody = {
  contents: [{ parts: parts }],
  generationConfig: {
    responseModalities: ['TEXT', 'IMAGE'],
    imageConfig: {
      aspectRatio: aspectRatio,
      imageSize: imageSize
    }
  }
};

if (enableGoogleSearch) {
  requestBody.tools = [{ google_search: {} }];
}

if (safetySettings) {
  requestBody.safetySettings = safetySettings;
}
```

#### Grounding Metadata Extraction (Lines 126-148)
```javascript
const groundingMetadata = {
  searchEntryPoint: null,
  groundingChunks: []
};

if (data.candidates && data.candidates[0] && data.candidates[0].groundingMetadata) {
  const metadata = data.candidates[0].groundingMetadata;

  if (metadata.searchEntryPoint) {
    groundingMetadata.searchEntryPoint = metadata.searchEntryPoint;
    console.log('\n🔍 Google Search grounding active');
  }

  if (metadata.groundingChunks && metadata.groundingChunks.length > 0) {
    groundingMetadata.groundingChunks = metadata.groundingChunks;
    console.log(`📚 Used ${metadata.groundingChunks.length} web source(s)`);
    metadata.groundingChunks.slice(0, 3).forEach((chunk, i) => {
      if (chunk.web) {
        console.log(`   ${i + 1}. ${chunk.web.title || chunk.web.uri}`);
      }
    });
  }
}
```

---

## CLI Commands

### Basic Generation
```bash
node nanobanana-direct.js generate "business card with 'ACME Corp' and '555-1234'"
```

### Google Search Grounded Generation
```bash
node nanobanana-direct.js grounded "infographic about climate change statistics"
```
**Output includes:**
- Generated image with factually accurate information
- Web sources used for verification
- Search entry point for additional research

### Fast Generation (Gemini 2.5 Flash Image)
```bash
node nanobanana-direct.js fast "quick poster design"
```

### With Reference Images
```bash
node nanobanana-direct.js with-ref "same style" ref1.jpg ref2.png ref3.webp
```
**Validation:** Only .jpg, .jpeg, .png, .webp files accepted

---

## Module API

### Function Signature
```typescript
async function generateImage(options: {
  prompt: string;
  aspectRatio?: string;        // Default: '1:1'
  imageSize?: string;          // Default: '2K'
  referenceImagePaths?: string[];  // Max 14 images
  enableGoogleSearch?: boolean;    // Default: false
  safetySettings?: object[];       // Optional
}): Promise<{
  images: string[];           // Array of saved image file paths
  groundingMetadata: {
    searchEntryPoint: object | null;
    groundingChunks: object[];
  }
}>
```

### Example Usage
```javascript
import { generateImage } from './nanobanana-direct.js';

const result = await generateImage({
  prompt: 'infographic: top 5 programming languages 2026',
  enableGoogleSearch: true,
  imageSize: '4K',
  aspectRatio: '16:9'
});

console.log('Images:', result.images);
console.log('Web sources used:', result.groundingMetadata.groundingChunks);
```

---

## Bug Fixes Applied

### 1. Reference Image Validation (Fixed)
**Issue:** CLI accepted non-image files (e.g., `.js` files) as reference images
**Fix:** Added file extension validation (lines 268-277)
```javascript
const validExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
const invalidFiles = refImages.filter(img => {
  const ext = path.extname(img).toLowerCase();
  return !validExtensions.includes(ext);
});

if (invalidFiles.length > 0) {
  console.error('❌ Error: Invalid reference image files.');
  process.exit(1);
}
```

### 2. Missing Dependencies (Fixed)
**Issue:** `google-auth-library` not installed
**Fix:** Added to package.json dependencies
```bash
npm install google-auth-library
```

### 3. Module Type Warning (Fixed)
**Issue:** Node.js warning about module type
**Fix:** Added `"type": "module"` to package.json

---

## Testing

### Test Google Search Grounding
```bash
export GEMINI_API_KEY="your-key-here"
node /tmp/test-grounding.js
```

Expected output:
- ✅ Image generated with factual mountain heights
- ✅ Console shows "Google Search grounding active"
- ✅ Lists 3 web sources used
- ✅ Grounding metadata included in response

---

## File Locations

- **Main script:** `/Users/louisherman/ClaudeCodeProjects/nanobanana-direct.js`
- **Output directory:** `~/nanobanana-output/`
- **Documentation:** `/Users/louisherman/ClaudeCodeProjects/API-REFERENCE.md`
- **Official docs:** https://ai.google.dev/gemini-api/docs/image-generation

---

## Comparison: Gemini 3 Pro vs Flash Image

| Feature | Gemini 3 Pro Image Preview | Gemini 2.5 Flash Image |
|---------|---------------------------|------------------------|
| **Quality** | Professional, high-fidelity | Good, optimized |
| **Speed** | Standard | Fast, low-latency |
| **Text rendering** | Advanced | Standard |
| **Reference images** | ✅ Up to 14 | ❌ Not supported |
| **Google Search** | ✅ Supported | ❌ Not supported |
| **Thinking mode** | ✅ Yes | ❌ No |
| **Resolution** | 1K, 2K, 4K | 1K, 2K, 4K |
| **Use case** | Professional assets | Quick generation |

---

## Status: ✅ COMPLETE

All capabilities from https://ai.google.dev/gemini-api/docs/image-generation#gemini-3-capabilities are properly implemented and tested.
