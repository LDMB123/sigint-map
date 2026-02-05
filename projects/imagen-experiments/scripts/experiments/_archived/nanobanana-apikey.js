#!/usr/bin/env node

/**
 * Nano Banana Pro (Gemini 3 Pro Image Preview) - Official Implementation
 * Based on: https://ai.google.dev/gemini-api/docs/image-generation
 *
 * Features:
 * - Text-in-image generation with advanced reasoning
 * - Up to 14 reference images (6 objects + 5 humans)
 * - 4K output resolution
 * - Google Search grounding
 * - Professional asset production
 *
 * Uses standard Gemini API with your $100 Google Cloud credits
 */

import fs from 'fs/promises';
import path from 'path';

// Get API key from environment variable
const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
  console.error('Error: GEMINI_API_KEY environment variable not set');
  console.error('Get your API key from: https://aistudio.google.com/api-keys');
  console.error('Then run: export GEMINI_API_KEY="your-api-key-here"');
  process.exit(1);
}

const OUTPUT_DIR = path.join(process.env.HOME, 'nanobanana-output');
await fs.mkdir(OUTPUT_DIR, { recursive: true });

/**
 * Generate images with Nano Banana Pro (Gemini 3 Pro Image Preview)
 *
 * @param {Object} options
 * @param {string} options.prompt - Text description of what to generate
 * @param {string} options.aspectRatio - "1:1", "2:3", "3:2", "3:4", "4:3", "4:5", "5:4", "9:16", "16:9", "21:9"
 * @param {string} options.imageSize - "1K", "2K", "4K" (uppercase required)
 * @param {Array<string>} options.referenceImagePaths - Optional: paths to reference images (up to 14)
 * @param {string} options.editImagePath - Optional: path to image to edit (for image editing mode)
 * @param {boolean} options.enableGoogleSearch - Optional: enable Google Search grounding for factual accuracy (default: false)
 * @param {Object} options.safetySettings - Optional: custom safety settings
 * @param {boolean} options.showThinkingProcess - Optional: display thinking process details (default: true)
 */
async function generateImage(options = {}) {
  const {
    prompt,
    aspectRatio = '1:1',
    imageSize = '2K',
    referenceImagePaths = [],
    editImagePath = null,
    enableGoogleSearch = false,
    safetySettings = null,
    showThinkingProcess = true,
  } = options;

  console.log(`\n🎨 ${editImagePath ? 'Editing' : 'Generating'} with Nano Banana Pro (Gemini 3 Pro Image Preview)...`);
  console.log(`Prompt: ${prompt}`);
  console.log(`Size: ${imageSize}, Aspect Ratio: ${aspectRatio}`);
  if (editImagePath) {
    console.log(`Editing image: ${path.basename(editImagePath)}`);
  }
  if (referenceImagePaths.length > 0) {
    console.log(`Reference images: ${referenceImagePaths.length}`);
  }
  if (enableGoogleSearch) {
    console.log(`Google Search grounding: enabled ✓`);
  }

  const model = 'gemini-3-pro-image-preview';
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  // Build parts array with text prompt and optional images
  const parts = [{ text: prompt }];

  // Add image to edit if provided (image editing mode)
  if (editImagePath) {
    const imageBuffer = await fs.readFile(editImagePath);
    const base64Image = imageBuffer.toString('base64');
    const ext = path.extname(editImagePath).toLowerCase();
    const mimeType = ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' :
                     ext === '.webp' ? 'image/webp' : 'image/png';

    parts.push({
      inline_data: {
        mime_type: mimeType,
        data: base64Image,
      },
    });
  }

  // Add reference images if provided (up to 14: 6 objects + 5 humans)
  if (referenceImagePaths.length > 14) {
    console.warn('⚠️  Warning: Maximum 14 reference images supported (6 objects + 5 humans). Using first 14.');
  }

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

  const requestBody = {
    contents: [{
      parts: parts
    }],
    generationConfig: {
      responseModalities: ['TEXT', 'IMAGE'],
      imageConfig: {
        aspectRatio: aspectRatio,
        imageSize: imageSize
      }
    }
  };

  // Add Google Search grounding if enabled
  if (enableGoogleSearch) {
    requestBody.tools = [{ google_search: {} }];
  }

  // Add custom safety settings if provided
  if (safetySettings) {
    requestBody.safetySettings = safetySettings;
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'x-goog-api-key': API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  console.log('\n✅ Response received');

  // Debug: Log response structure to help diagnose issues
  if (process.env.DEBUG_RESPONSE === 'true') {
    console.log('\n🔍 DEBUG - Response structure:');
    console.log('  candidates:', data.candidates ? 'present' : 'missing');
    if (data.candidates && data.candidates[0]) {
      console.log('  candidates[0].content:', data.candidates[0].content ? 'present' : 'missing');
      if (data.candidates[0].content) {
        console.log('  candidates[0].content.parts:', data.candidates[0].content.parts ? `array of ${data.candidates[0].content.parts.length}` : 'missing');
      }
    }
    console.log('  Full response:', JSON.stringify(data, null, 2).substring(0, 500) + '...\n');
  }

  const savedImages = [];
  const thinkingProcess = {
    thoughts: [],
    interimImages: []
  };
  const groundingMetadata = {
    searchEntryPoint: null,
    groundingChunks: []
  };

  // Extract grounding metadata if available (Google Search results)
  if (data.candidates && data.candidates[0] && data.candidates[0].groundingMetadata) {
    const metadata = data.candidates[0].groundingMetadata;

    if (metadata.searchEntryPoint) {
      groundingMetadata.searchEntryPoint = metadata.searchEntryPoint;
      console.log('\n🔍 Google Search grounding active');
    }

    if (metadata.groundingChunks && metadata.groundingChunks.length > 0) {
      groundingMetadata.groundingChunks = metadata.groundingChunks;
      console.log(`📚 Used ${metadata.groundingChunks.length} web source(s) for factual accuracy`);
      metadata.groundingChunks.slice(0, 3).forEach((chunk, i) => {
        if (chunk.web) {
          console.log(`   ${i + 1}. ${chunk.web.title || chunk.web.uri}`);
        }
      });
    }
  }

  // Extract images and thinking process from response
  if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) {
    const parts = data.candidates[0].content.parts;
    let imageCount = 0;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isThought = part.thought === true;

      // Extract text (thinking process or final explanation)
      if (part.text) {
        if (isThought) {
          thinkingProcess.thoughts.push(part.text);
          if (showThinkingProcess) {
            console.log(`\n🧠 Thinking: ${part.text.substring(0, 150)}${part.text.length > 150 ? '...' : ''}`);
          }
        } else {
          console.log(`\n💭 Model explanation: ${part.text.substring(0, 200)}${part.text.length > 200 ? '...' : ''}`);
        }
      }

      // Extract images (both thought images and final output)
      if (part.inlineData && part.inlineData.data) {
        const imageData = Buffer.from(part.inlineData.data, 'base64');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        imageCount++;

        if (isThought) {
          // Thought/interim image - optionally save for debugging
          const filename = `nanobanana_thought_${imageCount}_${timestamp}.png`;
          const filepath = path.join(OUTPUT_DIR, filename);

          if (showThinkingProcess) {
            await fs.writeFile(filepath, imageData);
            thinkingProcess.interimImages.push(filepath);
            console.log(`   🧪 Interim image ${imageCount}: ${filepath} (${(imageData.length / 1024 / 1024).toFixed(2)} MB)`);
          }
        } else {
          // Final image - always save
          const filename = `nanobanana_${timestamp}.png`;
          const filepath = path.join(OUTPUT_DIR, filename);

          await fs.writeFile(filepath, imageData);
          savedImages.push(filepath);
          console.log(`\n✅ Final image: ${filepath} (${(imageData.length / 1024 / 1024).toFixed(2)} MB)`);
        }
      }
    }

    if (thinkingProcess.thoughts.length > 0 && showThinkingProcess) {
      console.log(`\n💡 Model used ${thinkingProcess.thoughts.length} thinking step(s) to refine the output`);
    }
  } else {
    // No valid response structure found
    console.error('\n❌ Unexpected response structure from API');
    console.error('Expected: data.candidates[0].content.parts');
    console.error('Received:', JSON.stringify(data, null, 2).substring(0, 300));
    throw new Error('Invalid API response structure - no image data found');
  }

  // Check if we actually got any images
  if (savedImages.length === 0) {
    console.warn('\n⚠️  Warning: API responded successfully but no images were generated');
    console.warn('Set DEBUG_RESPONSE=true to see full response details');
    console.warn('Example: DEBUG_RESPONSE=true node nanobanana-direct.js ...');
  }

  return {
    images: savedImages,
    thinkingProcess: thinkingProcess,
    groundingMetadata: groundingMetadata
  };
}

/**
 * Multi-turn conversation manager for iterative image editing
 * Maintains conversation context across multiple prompts
 */
class NanoBananaChat {
  constructor(options = {}) {
    this.model = 'gemini-3-pro-image-preview';
    this.endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent`;
    this.conversationHistory = [];
    this.aspectRatio = options.aspectRatio || '1:1';
    this.imageSize = options.imageSize || '2K';
    this.enableGoogleSearch = options.enableGoogleSearch || false;
    this.showThinkingProcess = options.showThinkingProcess !== false;
  }

  /**
   * Send a message in the conversation
   * @param {string} message - Text prompt
   * @param {string} imagePath - Optional image to include with this turn
   */
  async sendMessage(message, imagePath = null) {
    console.log(`\n💬 Turn ${this.conversationHistory.length / 2 + 1}: ${message}`);

    // Build parts for this turn
    const parts = [{ text: message }];

    // Add image if provided
    if (imagePath) {
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

    // Add this turn to conversation history
    this.conversationHistory.push({
      role: 'user',
      parts: parts
    });

    // Build request with full conversation history
    const requestBody = {
      contents: this.conversationHistory,
      generationConfig: {
        responseModalities: ['TEXT', 'IMAGE'],
        imageConfig: {
          aspectRatio: this.aspectRatio,
          imageSize: this.imageSize
        }
      }
    };

    if (this.enableGoogleSearch) {
      requestBody.tools = [{ google_search: {} }];
    }

    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        'x-goog-api-key': API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API error: ${response.status} - ${error}`);
    }

    const data = await response.json();

    // Add model's response to conversation history
    if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) {
      this.conversationHistory.push({
        role: 'model',
        parts: data.candidates[0].content.parts
      });

      // Extract and save images
      const savedImages = [];
      const thinkingProcess = { thoughts: [], interimImages: [] };

      for (const part of data.candidates[0].content.parts) {
        const isThought = part.thought === true;

        if (part.text) {
          if (isThought && this.showThinkingProcess) {
            console.log(`🧠 ${part.text.substring(0, 150)}${part.text.length > 150 ? '...' : ''}`);
            thinkingProcess.thoughts.push(part.text);
          } else if (!isThought) {
            console.log(`💭 ${part.text.substring(0, 200)}${part.text.length > 200 ? '...' : ''}`);
          }
        }

        if (part.inlineData && part.inlineData.data) {
          const imageData = Buffer.from(part.inlineData.data, 'base64');
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

          if (!isThought) {
            const filename = `nanobanana_chat_turn${this.conversationHistory.length / 2}_${timestamp}.png`;
            const filepath = path.join(OUTPUT_DIR, filename);

            await fs.writeFile(filepath, imageData);
            savedImages.push(filepath);
            console.log(`✅ ${filepath} (${(imageData.length / 1024 / 1024).toFixed(2)} MB)`);
          }
        }
      }

      return {
        images: savedImages,
        thinkingProcess: thinkingProcess,
        turnNumber: this.conversationHistory.length / 2
      };
    }

    throw new Error('No valid response from model');
  }

  /**
   * Get conversation history
   */
  getHistory() {
    return this.conversationHistory;
  }

  /**
   * Reset conversation
   */
  reset() {
    this.conversationHistory = [];
  }
}

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const command = process.argv[2];
  const prompt = process.argv[3];

  try {
    if (command === 'generate' && prompt) {
      await generateImage({ prompt });
    } else if (command === 'grounded' && prompt) {
      await generateImage({ prompt, enableGoogleSearch: true });
    } else if (command === 'edit') {
      const imagePath = process.argv[3];
      const editPrompt = process.argv[4];
      if (!imagePath || !editPrompt) {
        console.error('Usage: node nanobanana-direct.js edit /path/to/image.jpg "add flowers in the foreground"');
        process.exit(1);
      }
      await generateImage({
        prompt: editPrompt,
        editImagePath: imagePath
      });
    } else if (command === 'with-ref') {
      const promptText = process.argv[3];
      const refImages = process.argv.slice(4);
      if (!promptText || refImages.length === 0) {
        console.error('Usage: node nanobanana-direct.js with-ref "prompt" /path/to/ref1.jpg /path/to/ref2.jpg');
        process.exit(1);
      }

      // Validate that reference images have valid image file extensions
      const validExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
      const invalidFiles = refImages.filter(img => {
        const ext = path.extname(img).toLowerCase();
        return !validExtensions.includes(ext);
      });

      if (invalidFiles.length > 0) {
        console.error('❌ Error: Invalid reference image files. Only .jpg, .jpeg, .png, and .webp are supported.');
        console.error('Invalid files:', invalidFiles.join(', '));
        process.exit(1);
      }

      await generateImage({
        prompt: promptText,
        referenceImagePaths: refImages
      });
    } else {
      console.log(`
Nano Banana Pro - Gemini 3 Pro Image Preview

Model: gemini-3-pro-image-preview

Setup:
  1. Get API key: https://aistudio.google.com/api-keys
  2. Enable Cloud Billing at https://aistudio.google.com to use your $100 credits
  3. Set environment variable: export GEMINI_API_KEY="your-key"

Usage:
  Generate:  node nanobanana-direct.js generate "business card with 'ACME Corp' and '555-1234'"
  Grounded:  node nanobanana-direct.js grounded "infographic about climate change"
  Edit:      node nanobanana-direct.js edit image.jpg "add flowers in the foreground"
  With refs: node nanobanana-direct.js with-ref "same style" ref1.jpg ref2.jpg

Features:
  ✅ Advanced text rendering for business cards, posters, infographics
  ✅ Image editing - modify existing images with text prompts
  ✅ Up to 14 reference images (6 objects + 5 humans max)
  ✅ 4K output resolution (1K, 2K, 4K available)
  ✅ Google Search grounding for factual accuracy
  ✅ Thinking process - shows model's reasoning steps
  ✅ Multi-turn conversations for iterative editing (via module API)
  ✅ SynthID watermark included
  ✅ Safety settings customization

Options (when using as module):
  - aspectRatio: "1:1", "2:3", "3:2", "3:4", "4:3", "4:5", "5:4", "9:16", "16:9", "21:9"
  - imageSize: "1K", "2K", "4K" (uppercase required, default: "2K")
  - referenceImagePaths: array of paths to reference images (max 14)
  - editImagePath: path to image to edit (for image editing mode)
  - enableGoogleSearch: boolean (default: false) - enables Google Search grounding
  - showThinkingProcess: boolean (default: true) - display thinking steps
  - safetySettings: array of safety setting objects (optional)

Multi-turn Editing (Module API):
  const chat = new NanoBananaChat({ imageSize: '4K' });
  await chat.sendMessage("Create an infographic about photosynthesis");
  await chat.sendMessage("Update to Spanish, keep everything else");

Output: ${OUTPUT_DIR}

Documentation: https://ai.google.dev/gemini-api/docs/image-generation
      `);
    }
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

export { generateImage, NanoBananaChat };
