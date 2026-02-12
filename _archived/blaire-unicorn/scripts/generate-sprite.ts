/**
 * Imagen 3 Sprite Generator for Blaire's Unicorn Adventure
 *
 * Generates game sprites with consistent style and quality
 *
 * Usage:
 *   npx ts-node scripts/generate-sprite.ts [options]
 *
 * Options:
 *   --animal [name]      Animal type (deer, fox, owl, squirrel, etc.)
 *   --output [path]      Output file path
 *   --seed [number]      Random seed for reproducibility
 *   --count [number]     Number of variations to generate
 */

import { VertexAI } from '@google-cloud/vertexai';
import * as fs from 'fs';
import * as path from 'path';

interface GenerationOptions {
    animal: string;
    output: string;
    seed?: number;
    count?: number;
    aspectRatio?: '1:1' | '16:9' | '9:16';
    guidanceScale?: number;
    quality?: 'draft' | 'standard' | 'quality';
}

interface SpriteConfig {
    prompt: string;
    negativePrompt: string;
    style: string;
    colorPalette: string[];
}

class ImagenSpriteGenerator {
    private vertexAI: VertexAI;
    private model: any;
    private project: string;
    private location: string;

    constructor() {
        const project = process.env.GOOGLE_CLOUD_PROJECT;
        if (!project) {
            throw new Error('GOOGLE_CLOUD_PROJECT environment variable not set');
        }

        this.project = project;
        this.location = 'us-central1';

        this.vertexAI = new VertexAI({
            project,
            location: this.location,
        });

        this.model = this.vertexAI.preview.getGenerativeModel({
            model: 'imagegeneration@006',
        });
    }

    /**
     * Build sprite-specific configuration based on animal type
     */
    private getSpriteConfig(animal: string): SpriteConfig {
        const configs: Record<string, SpriteConfig> = {
            deer: {
                prompt: `A cute kawaii baby deer fawn sitting in centered composition, translucent glassy iridescent pastel body with pink lavender and blue shimmer, sparkle highlights on body, large adorable purple eyes with shine, small spots on back, tiny antler nubs, same art style as a glass figurine toy, transparent PNG game sprite on solid black background, children's game character asset, no text, highly detailed, professional digital art, game-ready`,
                negativePrompt: 'blurry, low quality, distorted, extra limbs, text, watermark, signature, deformed face, CGI, realistic, photograph, photo',
                style: 'glassy kawaii figurine',
                colorPalette: ['#FFB6E1', '#C8A2E0', '#87CEEB'],
            },
            fox: {
                prompt: `A cute kawaii baby fox kit sitting, translucent glassy iridescent pastel body with orange peach and rose gold shimmer, sparkle highlights, large adorable orange eyes, fluffy tail, glass figurine toy art style, transparent PNG game sprite on solid black background, children's game character, no text, centered composition`,
                negativePrompt: 'blurry, low quality, distorted, extra limbs, text, watermark, signature, deformed face, CGI, realistic, photograph',
                style: 'glassy kawaii figurine',
                colorPalette: ['#FFB347', '#FFB6C1', '#FFD700'],
            },
            owl: {
                prompt: `A cute kawaii baby owl sitting, translucent glassy iridescent pastel body with lavender periwinkle and mint green shimmer, sparkle highlights, large adorable round eyes, small wings, glass figurine toy art style, transparent PNG game sprite on solid black background, children's game character, no text, centered composition`,
                negativePrompt: 'blurry, low quality, distorted, extra limbs, text, watermark, signature, deformed face, CGI, realistic, photograph',
                style: 'glassy kawaii figurine',
                colorPalette: ['#E6B3FF', '#B3D9FF', '#B3FFB3'],
            },
            rabbit: {
                prompt: `A cute kawaii baby rabbit bunny sitting, translucent glassy iridescent pastel body with pink white and lilac shimmer, sparkle highlights, large adorable eyes, long ears, cotton tail, glass figurine toy art style, transparent PNG game sprite on solid black background, children's game character, no text, centered composition`,
                negativePrompt: 'blurry, low quality, distorted, extra limbs, text, watermark, signature, deformed face, CGI, realistic, photograph',
                style: 'glassy kawaii figurine',
                colorPalette: ['#FFB6E1', '#FFFFFF', '#E6D9FF'],
            },
        };

        return configs[animal.toLowerCase()] || configs.deer;
    }

    /**
     * Generate a single sprite image
     */
    async generateSprite(options: GenerationOptions): Promise<Buffer> {
        const config = this.getSpriteConfig(options.animal);
        const quality = options.quality || 'standard';

        const generationConfig = {
            candidateCount: 1,
            sampleCount: 1,
            aspectRatio: options.aspectRatio || ('1:1' as const),
            safetySetting: 'block_some',
            guidanceScale: options.guidanceScale || 7.5,
        };

        // Adjust parameters based on quality setting
        if (quality === 'draft') {
            (generationConfig as any).inferenceSteps = 20;
        } else if (quality === 'quality') {
            (generationConfig as any).inferenceSteps = 100;
            (generationConfig as any).guidanceScale = 8.5;
        }

        try {
            console.log(`Generating ${options.animal} sprite...`);

            const response = await this.model.generateContent({
                contents: [
                    {
                        role: 'user',
                        parts: [{ text: config.prompt }],
                    },
                ],
                generationConfig,
            });

            if (!response.candidates || response.candidates.length === 0) {
                throw new Error('No candidates in response');
            }

            const candidate = response.candidates[0];
            if (!candidate.content?.parts?.[0]) {
                throw new Error('No content in response');
            }

            const part = candidate.content.parts[0];

            if ('inlineData' in part && part.inlineData?.data) {
                return Buffer.from(part.inlineData.data, 'base64');
            }

            throw new Error('Unexpected response format');

        } catch (error) {
            throw new Error(`Generation failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Generate multiple sprite variations
     */
    async generateMultiple(options: GenerationOptions): Promise<string[]> {
        const count = options.count || 1;
        const baseName = path.basename(options.output, '.png');
        const baseDir = path.dirname(options.output);
        const results: string[] = [];

        for (let i = 0; i < count; i++) {
            try {
                const buffer = await this.generateSprite({
                    ...options,
                    seed: options.seed ? options.seed + i : undefined,
                });

                const outputPath = count === 1
                    ? options.output
                    : path.join(baseDir, `${baseName}_${i + 1}.png`);

                // Ensure output directory exists
                if (!fs.existsSync(baseDir)) {
                    fs.mkdirSync(baseDir, { recursive: true });
                }

                fs.writeFileSync(outputPath, buffer);

                console.log(`✓ Generated: ${outputPath} (${(buffer.length / 1024).toFixed(2)} KB)`);
                results.push(outputPath);

                // Rate limiting between requests
                if (i < count - 1) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }

            } catch (error) {
                console.error(`✗ Failed to generate sprite ${i + 1}:`, error);
                if (i === 0) throw error; // Fail fast on first error
            }
        }

        return results;
    }
}

/**
 * CLI Entry Point
 */
async function main() {
    const args = process.argv.slice(2);

    const options: GenerationOptions = {
        animal: 'deer',
        output: path.join(__dirname, '../assets/deer_sprite.png'),
        count: 1,
        aspectRatio: '1:1',
        guidanceScale: 7.5,
        quality: 'standard',
    };

    // Parse CLI arguments
    for (let i = 0; i < args.length; i++) {
        switch (args[i]) {
            case '--animal':
                options.animal = args[++i];
                break;
            case '--output':
                options.output = args[++i];
                break;
            case '--seed':
                options.seed = parseInt(args[++i], 10);
                break;
            case '--count':
                options.count = parseInt(args[++i], 10);
                break;
            case '--quality':
                options.quality = args[++i] as 'draft' | 'standard' | 'quality';
                break;
            case '--help':
                console.log(`
Usage: npx ts-node scripts/generate-sprite.ts [options]

Options:
  --animal [name]      Animal type: deer, fox, owl, rabbit (default: deer)
  --output [path]      Output file path (default: assets/deer_sprite.png)
  --seed [number]      Random seed for reproducibility
  --count [number]     Number of variations (default: 1)
  --quality [level]    Quality level: draft, standard, quality (default: standard)
  --help              Show this help message
                `);
                process.exit(0);
        }
    }

    try {
        const generator = new ImagenSpriteGenerator();
        const results = await generator.generateMultiple(options);

        console.log('\nSuccess! Generated sprites:');
        results.forEach(filepath => {
            console.log(`  - ${filepath}`);
        });

    } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : String(error));
        process.exit(1);
    }
}

main();
