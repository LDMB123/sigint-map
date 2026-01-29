import { ImageServiceClient } from '@google-cloud/image-service';
import fs from 'fs';
import path from 'path';

// Initialize the Imagen client
const client = new ImageServiceClient({
  apiEndpoint: 'us-central1-aiplatform.googleapis.com',
});

const projectId = 'nano-banana-pro';
const location = 'us-central1';
const parent = `projects/${projectId}/locations/${location}`;

async function editImageToSpeakeasy() {
  try {
    // Read the input image
    const imagePath = '/Users/louisherman/Documents/LWMMoms - 374.jpeg';
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString('base64');

    console.log('Sending request to Imagen API...');

    // Create the edit request
    const request = {
      parent: parent,
      instances: [{
        prompt: 'Transform this woman into a 1920s speakeasy bar setting. She is wearing a glamorous red micro dress with vintage styling. The background shows a dimly lit speakeasy with art deco details, vintage bar, mood lighting, and atmospheric smoke. Cinematic lighting, professional photography, elegant and sophisticated atmosphere.',
        image: {
          bytesBase64Encoded: base64Image,
        },
        parameters: {
          sampleCount: 1,
          mode: 'edit-full-image',
          editConfig: {
            guidanceScale: 100,
            numberOfImages: 1,
            editMode: 'inpainting-insert',
          }
        }
      }],
    };

    // Call the API
    const [response] = await client.predict(request);

    console.log('Response received!');

    // Save the output image
    if (response.predictions && response.predictions.length > 0) {
      const prediction = response.predictions[0];
      const outputImageBase64 = prediction.bytesBase64Encoded;
      const outputBuffer = Buffer.from(outputImageBase64, 'base64');

      const outputPath = '/Users/louisherman/ClaudeCodeProjects/speakeasy-red-dress-output.jpg';
      fs.writeFileSync(outputPath, outputBuffer);

      console.log(`✓ Image saved to: ${outputPath}`);
      return outputPath;
    } else {
      throw new Error('No predictions in response');
    }

  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
}

// Run the transformation
editImageToSpeakeasy()
  .then(path => console.log('Success!'))
  .catch(error => console.error('Failed:', error.message));
