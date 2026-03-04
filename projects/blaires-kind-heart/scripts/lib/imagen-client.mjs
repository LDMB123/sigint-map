import { GoogleAuth } from 'google-auth-library';

const DEFAULT_LOCATION = 'us-central1';
const DEFAULT_MODEL = 'imagen-3.0-generate-001';

const auth = new GoogleAuth({
  scopes: ['https://www.googleapis.com/auth/cloud-platform'],
});

function resolveProjectId(projectId) {
  return projectId || process.env.GOOGLE_CLOUD_PROJECT || 'gen-lang-client-0925343693';
}

function buildEndpoint({ location, projectId, model }) {
  return `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/${model}:predict`;
}

function extractErrorMessage(errorPayload) {
  if (errorPayload?.error?.message) {
    return errorPayload.error.message;
  }
  try {
    return JSON.stringify(errorPayload);
  } catch {
    return String(errorPayload);
  }
}

export async function requestImagenBase64({
  prompt,
  aspectRatio = '1:1',
  negativePrompt = null,
  model = DEFAULT_MODEL,
  location = DEFAULT_LOCATION,
  projectId = null,
}) {
  const effectiveProjectId = resolveProjectId(projectId);
  const client = await auth.getClient();
  const accessToken = await client.getAccessToken();

  const requestBody = {
    instances: [{ prompt }],
    parameters: {
      sampleCount: 1,
      aspectRatio,
      ...(negativePrompt ? { negativePrompt } : {}),
    },
  };

  const response = await fetch(buildEndpoint({
    location,
    projectId: effectiveProjectId,
    model,
  }), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  let payload;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  return {
    ok: response.ok,
    status: response.status,
    payload,
    bytesBase64Encoded: payload?.predictions?.[0]?.bytesBase64Encoded ?? null,
    errorMessage: response.ok ? null : extractErrorMessage(payload),
  };
}
