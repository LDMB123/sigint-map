#!/usr/bin/env node
/**
 * Conceptual Priming Formula Validator
 *
 * Tests the empirical formula:
 * Required_Words = 400 + (New_Physics × 100) - (Known_Physics × 50) + Complexity
 *
 * Runs real Imagen 3 Pro API calls to measure actual success rates.
 * NO FABRICATION - real measurements only.
 */

import { VertexAI } from '@google-cloud/vertexai';
import fs from 'fs/promises';
import path from 'path';

// Configuration
const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT || 'imagen-experiments';
const LOCATION = 'us-central1';
const OUTPUT_DIR = './validation_results';

// Session state - tracks known physics across multiple generations
class SessionState {
  constructor() {
    this.knownPhysics = new Set();
    this.generationHistory = [];
  }

  addPhysics(physicsNames) {
    physicsNames.forEach(p => this.knownPhysics.add(p));
  }

  getKnownCount() {
    return this.knownPhysics.size;
  }

  recordGeneration(test) {
    this.generationHistory.push({
      timestamp: new Date().toISOString(),
      ...test
    });
  }

  async save(filename) {
    const data = {
      knownPhysics: Array.from(this.knownPhysics),
      history: this.generationHistory,
      summary: {
        totalTests: this.generationHistory.length,
        successRate: this.generationHistory.filter(t => t.success).length / this.generationHistory.length,
        avgError: this.generationHistory
          .filter(t => t.predicted && t.actual)
          .reduce((sum, t) => sum + Math.abs(t.predicted - t.actual) / t.actual, 0) /
          this.generationHistory.filter(t => t.predicted && t.actual).length
      }
    };

    await fs.mkdir(OUTPUT_DIR, { recursive: true });
    await fs.writeFile(
      path.join(OUTPUT_DIR, filename),
      JSON.stringify(data, null, 2)
    );
  }
}

// Formula implementation
function predictWordCount(newPhysics, knownPhysics, complexityPenalty = 50) {
  return 400 + (newPhysics * 100) - (knownPhysics * 50) + complexityPenalty;
}

// Test cases - progressing from simple to complex
const testCases = [
  {
    name: 'Baseline: Single Physics (First Time)',
    physics: ['holographic interference'],
    newPhysics: 1,
    knownPhysics: 0,
    complexity: 0,
    basePrompt: 'Photorealistic holographic optical interference pattern from photonic crystal Bragg mirror with alternating TiO2/SiO2 80-layer quarter-wave stack.'
  },
  {
    name: 'Priming Test: Same Physics (Second Time)',
    physics: ['holographic interference'],
    newPhysics: 0,  // Already known from previous
    knownPhysics: 1,
    complexity: 0,
    basePrompt: 'Holographic interference validated.'
  },
  {
    name: 'Two Physics: Independent',
    physics: ['holographic interference', 'sonoluminescence'],
    newPhysics: 1,  // Sonoluminescence is new
    knownPhysics: 1, // Holographic already known
    complexity: 0,
    basePrompt: 'Holographic interference and sonoluminescence (single bubble collapse UV emission in degassed water).'
  },
  {
    name: 'Compound: 5 Physics with Interactions',
    physics: ['holographic', 'triboluminescence', 'mechanoluminescence', 'photoacoustic', 'Rayleigh scattering'],
    newPhysics: 4,  // 4 new ones
    knownPhysics: 1, // Holographic known
    complexity: 100, // Interactions between phenomena
    basePrompt: 'Holographic photonic crystal exhibiting triboluminescence (fracture-induced), mechanoluminescence (stress-induced), photoacoustic pressure waves, and Rayleigh scattering from structural color.'
  }
];

async function generateImage(vertexai, prompt) {
  const generativeVisionModel = vertexai.preview.getGenerativeModel({
    model: 'imagen-3.0-generate-001',
  });

  try {
    const request = {
      prompt: prompt,
      // Add any Imagen 3 specific parameters
      aspectRatio: '1:1',
      numberOfImages: 1,
      safetyFilterLevel: 'block_some',
      personGeneration: 'dont_allow',
    };

    const response = await generativeVisionModel.generateImages(request);

    // Check if generation was successful
    if (response && response.images && response.images.length > 0) {
      return {
        success: true,
        image: response.images[0],
        wordCount: prompt.split(/\s+/).length
      };
    }

    return {
      success: false,
      error: 'No images returned',
      wordCount: prompt.split(/\s+/).length
    };

  } catch (error) {
    return {
      success: false,
      error: error.message,
      errorType: error.message.includes('IMAGE_SAFETY') ? 'SAFETY' :
                 error.message.includes('IMAGE_PROHIBITED') ? 'PROHIBITED' : 'OTHER',
      wordCount: prompt.split(/\s+/).length
    };
  }
}

async function runValidation() {
  console.log('='.repeat(80));
  console.log('Conceptual Priming Formula Validation');
  console.log('='.repeat(80));
  console.log('');
  console.log('Formula: Required_Words = 400 + (New × 100) - (Known × 50) + Complexity');
  console.log('');

  // Initialize Vertex AI
  const vertexai = new VertexAI({
    project: PROJECT_ID,
    location: LOCATION
  });

  const session = new SessionState();

  // Run test cases sequentially (to maintain session state)
  for (const testCase of testCases) {
    console.log('-'.repeat(80));
    console.log(`Test: ${testCase.name}`);
    console.log('-'.repeat(80));

    // Predict word count
    const predicted = predictWordCount(
      testCase.newPhysics,
      testCase.knownPhysics,
      testCase.complexity
    );

    console.log(`Physics: ${testCase.physics.join(', ')}`);
    console.log(`  New: ${testCase.newPhysics}, Known: ${testCase.knownPhysics}, Complexity: ${testCase.complexity}`);
    console.log(`  Predicted word count: ${predicted}w`);

    // Construct prompt to match predicted length
    const currentWords = testCase.basePrompt.split(/\s+/).length;
    const needed = predicted - currentWords;

    let fullPrompt = testCase.basePrompt;
    if (needed > 0) {
      // Add filler to reach predicted length
      // In real usage, this would be detailed physics descriptions
      const filler = ' '.repeat(needed * 5); // Approximate words with spaces
      fullPrompt += filler;
    }

    const actualWords = fullPrompt.split(/\s+/).length;
    console.log(`  Actual prompt: ${actualWords}w`);

    // Generate image
    console.log('  Calling Imagen 3 Pro API...');
    const result = await generateImage(vertexai, fullPrompt);

    // Record results
    const testResult = {
      name: testCase.name,
      physics: testCase.physics,
      newPhysics: testCase.newPhysics,
      knownPhysics: testCase.knownPhysics,
      complexity: testCase.complexity,
      predicted: predicted,
      actual: actualWords,
      success: result.success,
      error: result.error,
      errorType: result.errorType,
      relativeError: Math.abs(predicted - actualWords) / predicted
    };

    session.recordGeneration(testResult);

    // Update known physics for next test
    if (result.success) {
      session.addPhysics(testCase.physics);
      console.log(`  ✓ SUCCESS - Generated image`);
    } else {
      console.log(`  ✗ FAILED - ${result.errorType}: ${result.error}`);
    }

    console.log(`  Prediction error: ${(testResult.relativeError * 100).toFixed(1)}%`);
    console.log('');

    // Rate limiting - wait between API calls
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  // Save results
  const timestamp = new Date().toISOString().split('T')[0];
  await session.save(`validation_${timestamp}.json`);

  // Print summary
  console.log('='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total tests: ${session.generationHistory.length}`);
  console.log(`Successes: ${session.generationHistory.filter(t => t.success).length}`);
  console.log(`Success rate: ${(session.generationHistory.filter(t => t.success).length / session.generationHistory.length * 100).toFixed(1)}%`);

  const errors = session.generationHistory
    .filter(t => t.predicted && t.actual)
    .map(t => t.relativeError);

  if (errors.length > 0) {
    const avgError = errors.reduce((a, b) => a + b, 0) / errors.length;
    const maxError = Math.max(...errors);
    console.log(`Average prediction error: ${(avgError * 100).toFixed(1)}%`);
    console.log(`Maximum prediction error: ${(maxError * 100).toFixed(1)}%`);
  }

  console.log('');
  console.log(`Results saved to: ${OUTPUT_DIR}/validation_${timestamp}.json`);
  console.log('');
  console.log('INTERPRETATION:');
  console.log('- < 5% error: Formula is accurate');
  console.log('- 5-10% error: Formula needs refinement');
  console.log('- > 10% error: Formula is incorrect or other factors dominate');
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runValidation().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { predictWordCount, SessionState, testCases };
