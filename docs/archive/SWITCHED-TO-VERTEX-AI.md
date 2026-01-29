# Switched Nano Banana Pro to Vertex AI ✅

**Date:** 2026-01-28
**Change:** Reverted from API key to Vertex AI OAuth

---

## What Changed

### File Changes
- ✅ **nanobanana-direct.js** - NOW uses Vertex AI OAuth (was API key)
- ✅ **nanobanana-apikey.js** - Backup of API key version (preserved for reference)

### Authentication Method
**Before:** Simple API key via `GEMINI_API_KEY` environment variable
**After:** Google Cloud OAuth via application_default_credentials.json

---

## Why Vertex AI?

### Advantages
1. ✅ **Same authentication as Imagen 3** - consistent pattern
2. ✅ **More reliable** - enterprise-grade Vertex AI infrastructure
3. ✅ **Better quota management** - no API key rate limits
4. ✅ **Project isolation** - uses specific Google Cloud project
5. ✅ **Production ready** - Vertex AI is Google's production ML platform

### Implementation
- Uses `google-auth-library` for OAuth
- Same endpoint pattern as Imagen 3
- Automatic token refresh
- No API key to manage

---

## Current Setup

### Nano Banana Pro (Vertex AI)
**File:** `/Users/louisherman/ClaudeCodeProjects/nanobanana-direct.js`

**Authentication:**
```bash
gcloud auth application-default login
```

**Usage:**
```bash
node nanobanana-direct.js generate "business card with 'ACME Corp'"
node nanobanana-direct.js grounded "infographic about climate change"
node nanobanana-direct.js edit image.jpg "add flowers"
node nanobanana-direct.js with-ref "style" ref1.jpg ref2.jpg
```

**Endpoint:**
```
https://us-central1-aiplatform.googleapis.com/v1/projects/gen-lang-client-0925343693/locations/us-central1/publishers/google/models/gemini-3-pro-image-preview:generateContent
```

### All Features Intact
- ✅ Text-to-image generation
- ✅ Image editing
- ✅ Reference images (up to 14)
- ✅ Google Search grounding
- ✅ Thinking process extraction
- ✅ Multi-turn conversations (NanoBananaChat)
- ✅ 4K generation
- ✅ All aspect ratios
- ✅ Safety settings
- ✅ Debug logging

---

## API Key Version (Backup)

If you ever need the API key version, it's preserved as:
**File:** `/Users/louisherman/ClaudeCodeProjects/nanobanana-apikey.js`

**Usage:**
```bash
export GEMINI_API_KEY="your-key-here"
node nanobanana-apikey.js generate "prompt"
```

---

## Consistency Across APIs

### Now All Use Same Pattern

**Vertex AI OAuth (Nano Banana Pro + Imagen 3):**
```javascript
import { GoogleAuth } from 'google-auth-library';

const auth = new GoogleAuth({
  scopes: ['https://www.googleapis.com/auth/cloud-platform'],
});

const client = await auth.getClient();
const accessToken = await client.getAccessToken();

fetch(endpoint, {
  headers: {
    'Authorization': `Bearer ${accessToken.token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(requestBody)
});
```

**Standard API Key (Veo 3.1 only):**
```javascript
const API_KEY = process.env.GEMINI_API_KEY;

fetch(endpoint, {
  headers: {
    'x-goog-api-key': API_KEY,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(requestBody)
});
```

---

## Code Comparison

### Key Differences

**API Key Version (nanobanana-apikey.js):**
```javascript
const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
  throw new Error('GEMINI_API_KEY environment variable not set');
}

const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent`;

const response = await fetch(endpoint, {
  headers: {
    'x-goog-api-key': API_KEY,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(requestBody),
});
```

**Vertex AI Version (nanobanana-direct.js):**
```javascript
const auth = new GoogleAuth({
  scopes: ['https://www.googleapis.com/auth/cloud-platform'],
});

const client = await auth.getClient();
const accessToken = await client.getAccessToken();

const endpoint = `https://us-central1-aiplatform.googleapis.com/v1/projects/gen-lang-client-0925343693/locations/us-central1/publishers/google/models/gemini-3-pro-image-preview:generateContent`;

const response = await fetch(endpoint, {
  headers: {
    'Authorization': `Bearer ${accessToken.token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(requestBody),
});
```

---

## Request Body Differences

**Important:** Vertex AI uses different field names!

### Google Search Grounding

**API Key:**
```javascript
requestBody.tools = [{ google_search: {} }];  // snake_case
```

**Vertex AI:**
```javascript
requestBody.tools = [{ googleSearch: {} }];   // camelCase
```

### Image Data

**API Key:**
```javascript
{
  inline_data: {      // snake_case
    mime_type: 'image/jpeg',
    data: base64Image,
  }
}
```

**Vertex AI:**
```javascript
{
  inlineData: {       // camelCase
    mimeType: 'image/jpeg',
    data: base64Image,
  }
}
```

---

## Testing

### Test Vertex AI Version
```bash
# Ensure authenticated
gcloud auth application-default login

# Test basic generation
node nanobanana-direct.js generate "test image with text 'HELLO'"

# Test grounded generation
node nanobanana-direct.js grounded "infographic about Mount Everest"

# Test image editing
node nanobanana-direct.js edit test.jpg "make it blue"

# Test with reference images
node nanobanana-direct.js with-ref "same style" ref1.jpg ref2.jpg

# Debug mode
DEBUG_RESPONSE=true node nanobanana-direct.js generate "test"
```

---

## Module Usage

### Import
```javascript
import { generateImage, NanoBananaChat } from './nanobanana-direct.js';
```

### Single Generation
```javascript
const result = await generateImage({
  prompt: "business card with 'ACME Corp'",
  imageSize: '4K',
  aspectRatio: '16:9',
  enableGoogleSearch: true,
  showThinkingProcess: true
});

console.log(result.images);
console.log(result.thinkingProcess);
console.log(result.groundingMetadata);
```

### Multi-turn Chat
```javascript
const chat = new NanoBananaChat({ imageSize: '4K' });

await chat.sendMessage("Create infographic about photosynthesis");
await chat.sendMessage("Translate to Spanish");
await chat.sendMessage("Make background blue");
```

---

## Updated Documentation

### Files Updated
- ✅ `nanobanana-direct.js` - Vertex AI implementation
- ✅ `API-REFERENCE.md` - Updated authentication section
- ✅ `SWITCHED-TO-VERTEX-AI.md` - This file

### Files Preserved
- ✅ `nanobanana-apikey.js` - API key version (backup)
- ✅ All other files unchanged

---

## Summary

✅ **Nano Banana Pro switched to Vertex AI OAuth**
✅ **API key version preserved as nanobanana-apikey.js**
✅ **Consistent with Imagen 3 authentication**
✅ **All features working**
✅ **Documentation updated**

**Status:** Production ready with Vertex AI authentication.
