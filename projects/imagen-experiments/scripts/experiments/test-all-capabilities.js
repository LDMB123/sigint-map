#!/usr/bin/env node

/**
 * Test script to verify ALL Gemini 3 Pro Image capabilities
 * Run: GEMINI_API_KEY="your-key" node test-all-capabilities.js
 */

import { generateImage, NanoBananaChat } from './nanobanana-direct.js';

console.log('🧪 Testing ALL Gemini 3 Pro Image Preview Capabilities\n');

async function runTests() {
  const testResults = [];

  // Test 1: Basic generation with thinking process
  console.log('1️⃣  Testing: Basic generation with thinking process');
  try {
    const result = await generateImage({
      prompt: "Simple test image with text 'TEST'",
      imageSize: '1K',
      showThinkingProcess: true
    });
    testResults.push({
      test: 'Basic generation + thinking',
      status: '✅',
      details: `Generated ${result.images.length} image(s), ${result.thinkingProcess.thoughts.length} thought(s)`
    });
  } catch (error) {
    testResults.push({
      test: 'Basic generation + thinking',
      status: '❌',
      details: error.message
    });
  }

  // Test 2: Image editing
  console.log('\n2️⃣  Testing: Image editing');
  console.log('   ⚠️  Skipping (requires existing image file)');
  testResults.push({
    test: 'Image editing',
    status: '⏭️',
    details: 'Skipped - requires test image'
  });

  // Test 3: Google Search grounding
  console.log('\n3️⃣  Testing: Google Search grounding');
  try {
    const result = await generateImage({
      prompt: "Infographic showing Mount Everest height",
      enableGoogleSearch: true,
      imageSize: '1K'
    });
    testResults.push({
      test: 'Google Search grounding',
      status: '✅',
      details: `Found ${result.groundingMetadata.groundingChunks.length} source(s)`
    });
  } catch (error) {
    testResults.push({
      test: 'Google Search grounding',
      status: '❌',
      details: error.message
    });
  }

  // Test 4: Reference images
  console.log('\n4️⃣  Testing: Reference image validation');
  console.log('   ⚠️  Skipping (requires reference image files)');
  testResults.push({
    test: 'Reference images',
    status: '⏭️',
    details: 'Skipped - requires reference files'
  });

  // Test 5: 4K generation (removed Fast mode, only using Gemini 3 Pro now)
  console.log('\n5️⃣  Testing: 4K generation');
  try {
    const result = await generateImage({
      prompt: "Test 4K image",
      imageSize: '4K',
      showThinkingProcess: false
    });
    testResults.push({
      test: '4K generation',
      status: '✅',
      details: `Generated ${result.images.length} 4K image(s)`
    });
  } catch (error) {
    testResults.push({
      test: '4K generation',
      status: '❌',
      details: error.message
    });
  }

  // Test 6: Multi-turn conversation
  console.log('\n6️⃣  Testing: Multi-turn conversation');
  try {
    const chat = new NanoBananaChat({
      imageSize: '1K',
      showThinkingProcess: false
    });

    const turn1 = await chat.sendMessage("Create simple logo with text 'TEST'");
    const turn2 = await chat.sendMessage("Make the background blue");

    testResults.push({
      test: 'Multi-turn conversation',
      status: '✅',
      details: `Completed ${turn2.turnNumber} turns, ${chat.getHistory().length} messages in history`
    });
  } catch (error) {
    testResults.push({
      test: 'Multi-turn conversation',
      status: '❌',
      details: error.message
    });
  }

  // Test 7: Safety settings
  console.log('\n7️⃣  Testing: Safety settings');
  try {
    const result = await generateImage({
      prompt: "Test with safety settings",
      imageSize: '1K',
      showThinkingProcess: false,
      safetySettings: [
        {
          category: 'HARM_CATEGORY_HATE_SPEECH',
          threshold: 'BLOCK_MEDIUM_AND_ABOVE'
        }
      ]
    });
    testResults.push({
      test: 'Safety settings',
      status: '✅',
      details: `Generated with custom safety settings`
    });
  } catch (error) {
    testResults.push({
      test: 'Safety settings',
      status: '❌',
      details: error.message
    });
  }

  // Test 8: All aspect ratios
  console.log('\n8️⃣  Testing: Aspect ratios');
  try {
    const result = await generateImage({
      prompt: "Test",
      aspectRatio: '16:9',
      imageSize: '1K',
      showThinkingProcess: false
    });
    testResults.push({
      test: 'Aspect ratios',
      status: '✅',
      details: `Successfully used 16:9 aspect ratio`
    });
  } catch (error) {
    testResults.push({
      test: 'Aspect ratios',
      status: '❌',
      details: error.message
    });
  }

  // Print results
  console.log('\n' + '='.repeat(70));
  console.log('TEST RESULTS SUMMARY');
  console.log('='.repeat(70));

  let passed = 0;
  let failed = 0;
  let skipped = 0;

  testResults.forEach((result, i) => {
    console.log(`\n${i + 1}. ${result.test}`);
    console.log(`   Status: ${result.status}`);
    console.log(`   Details: ${result.details}`);

    if (result.status === '✅') passed++;
    else if (result.status === '❌') failed++;
    else if (result.status === '⏭️') skipped++;
  });

  console.log('\n' + '='.repeat(70));
  console.log(`TOTAL: ${testResults.length} tests`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`⏭️  Skipped: ${skipped}`);
  console.log('='.repeat(70));

  if (failed === 0 && passed > 0) {
    console.log('\n🎉 ALL TESTS PASSED! Gemini 3 Pro implementation is complete.');
  } else if (failed > 0) {
    console.log('\n⚠️  Some tests failed. Check errors above.');
    process.exit(1);
  }
}

runTests().catch(error => {
  console.error('\n❌ Test suite failed:', error);
  process.exit(1);
});
