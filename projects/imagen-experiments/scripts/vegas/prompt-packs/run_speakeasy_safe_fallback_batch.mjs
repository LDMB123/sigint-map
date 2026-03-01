#!/usr/bin/env node

import { GoogleAuth } from 'google-auth-library';
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import process from 'process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function parseNumberEnv(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw === null || raw === '') return fallback;
  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT || 'gen-lang-client-0925343693';
const LOCATION = process.env.GOOGLE_CLOUD_LOCATION || 'global';
const MODEL = process.env.MODEL || 'gemini-3-pro-image-preview';
const DEFAULT_IMAGE_ENDPOINT = `https://aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/${MODEL}:generateContent`;
const ENDPOINT = process.env.IMAGE_ENDPOINT || DEFAULT_IMAGE_ENDPOINT;
const SCORER_MODEL = process.env.SCORER_MODEL || 'gemini-2.5-flash';
const DEFAULT_SCORER_ENDPOINT = `https://aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/${SCORER_MODEL}:generateContent`;
const SCORER_ENDPOINT = process.env.SCORER_ENDPOINT || DEFAULT_SCORER_ENDPOINT;
const STATIC_ACCESS_TOKEN = (process.env.STATIC_ACCESS_TOKEN || '').trim();

const PROMPT_FILE = process.argv[2] || path.join(__dirname, 'speakeasy_prompts_81_100_luxury_suite_v9_devils_advocate_hardened.md');
const REFERENCE_IMAGE = process.argv[3] || '/Users/louisherman/Documents/70480559_10214041948152499_1422451704820924416_n.jpeg';
const OUTPUT_BASE = process.env.OUTPUT_BASE
  || path.join(process.env.HOME || '/Users/louisherman', 'nanobanana-output', 'projects', 'img_1300');
const WAIT_BEFORE_ATTEMPT_S = Math.max(1, parseInt(process.env.WAIT_BEFORE_ATTEMPT_S || '90', 10));
const REQUEST_TIMEOUT_MS = Math.max(30_000, parseInt(process.env.REQUEST_TIMEOUT_MS || '300000', 10));
const MAX_PROMPTS = Math.max(1, parseInt(process.env.MAX_PROMPTS || '20', 10));
const IMAGE_HTTP_RETRIES = Math.max(0, Math.min(8, parseInt(process.env.IMAGE_HTTP_RETRIES || '3', 10)));
const IMAGE_HTTP_BACKOFF_BASE_MS = Math.max(250, parseInt(process.env.IMAGE_HTTP_BACKOFF_BASE_MS || '2000', 10));
const IMAGE_HTTP_BACKOFF_MAX_MS = Math.max(1000, parseInt(process.env.IMAGE_HTTP_BACKOFF_MAX_MS || '20000', 10));
const IMAGE_HTTP_BACKOFF_MIN_MS = Math.max(
  250,
  Math.min(
    IMAGE_HTTP_BACKOFF_MAX_MS,
    parseInt(process.env.IMAGE_HTTP_BACKOFF_MIN_MS || '250', 10)
  )
);
const OUTPUT_IMAGE_SIZE = String(process.env.OUTPUT_IMAGE_SIZE || '2K').trim().toUpperCase();
const OUTPUT_ASPECT_RATIO = String(process.env.OUTPUT_ASPECT_RATIO || '4:5').trim();
const HTTP_CACHE_BYPASS = process.env.HTTP_CACHE_BYPASS !== '0';
const PROMPT_NONCE_ENABLED = process.env.PROMPT_NONCE_ENABLED !== '0';
const PROMPT_NONCE_LENGTH = Math.max(8, Math.min(24, parseInt(process.env.PROMPT_NONCE_LENGTH || '12', 10)));
const SAVE_PROMPT_PREVIEW = process.env.SAVE_PROMPT_PREVIEW === '1';
const REFERENCE_IDENTITY_ONLY_LOCK = process.env.REFERENCE_IDENTITY_ONLY_LOCK !== '0';
const ATTIRE_REPLACEMENT_LOCK = process.env.ATTIRE_REPLACEMENT_LOCK !== '0';
const ENABLE_QUALITY_GATE = process.env.ENABLE_QUALITY_GATE !== '0';
const ENABLE_PRIMARY_RESCUE = process.env.ENABLE_PRIMARY_RESCUE !== '0';
const ENABLE_PRIMARY_UPLIFT_RESCUE = process.env.ENABLE_PRIMARY_UPLIFT_RESCUE !== '0';
const PRIMARY_RESCUE_MAX_ATTEMPTS = Math.max(
  1,
  Math.min(
    3,
    parseInt(
      process.env.PRIMARY_RESCUE_MAX_ATTEMPTS
        || (process.env.PHYSICS_REALISM_PRIORITY_MULTIPLIER && Number(process.env.PHYSICS_REALISM_PRIORITY_MULTIPLIER) >= 3 ? '2' : '1'),
      10
    )
  )
);
const QUALITY_GATE_MAX_OUTPUT_TOKENS = Math.max(400, parseInt(process.env.QUALITY_GATE_MAX_OUTPUT_TOKENS || '1400', 10));
const QUALITY_THRESHOLD_IDENTITY = Math.max(0, Math.min(10, parseFloat(process.env.QUALITY_THRESHOLD_IDENTITY || '9.2')));
const QUALITY_THRESHOLD_GAZE = Math.max(0, Math.min(10, parseFloat(process.env.QUALITY_THRESHOLD_GAZE || '9.0')));
const QUALITY_THRESHOLD_ATTIRE_REPLACEMENT = Math.max(
  0,
  Math.min(10, parseFloat(process.env.QUALITY_THRESHOLD_ATTIRE_REPLACEMENT || '9.3'))
);
const QUALITY_THRESHOLD_EDGE = Math.max(0, Math.min(10, parseFloat(process.env.QUALITY_THRESHOLD_EDGE || '9.5')));
const QUALITY_THRESHOLD_REALISM = Math.max(0, Math.min(10, parseFloat(process.env.QUALITY_THRESHOLD_REALISM || '9.2')));
const QUALITY_THRESHOLD_PHYSICS = Math.max(0, Math.min(10, parseFloat(process.env.QUALITY_THRESHOLD_PHYSICS || '9.3')));
const QUALITY_THRESHOLD_SCENE_ADHERENCE = Math.max(
  0,
  Math.min(10, parseFloat(process.env.QUALITY_THRESHOLD_SCENE_ADHERENCE || '9.15'))
);
const QUALITY_THRESHOLD_POSE_ADHERENCE = Math.max(
  0,
  Math.min(10, parseFloat(process.env.QUALITY_THRESHOLD_POSE_ADHERENCE || '9.1'))
);
const UPLIFT_TARGET_OVERALL = Math.max(0, Math.min(10, parseFloat(process.env.UPLIFT_TARGET_OVERALL || '9.5')));
const UPLIFT_TARGET_IDENTITY = Math.max(0, Math.min(10, parseFloat(process.env.UPLIFT_TARGET_IDENTITY || '9.5')));
const UPLIFT_TARGET_GAZE = Math.max(0, Math.min(10, parseFloat(process.env.UPLIFT_TARGET_GAZE || '9.3')));
const UPLIFT_TARGET_ATTIRE = Math.max(0, Math.min(10, parseFloat(process.env.UPLIFT_TARGET_ATTIRE || '9.6')));
const UPLIFT_TARGET_EDGE = Math.max(0, Math.min(10, parseFloat(process.env.UPLIFT_TARGET_EDGE || '9.6')));
const UPLIFT_TARGET_REALISM = Math.max(0, Math.min(10, parseFloat(process.env.UPLIFT_TARGET_REALISM || '9.45')));
const UPLIFT_TARGET_PHYSICS = Math.max(0, Math.min(10, parseFloat(process.env.UPLIFT_TARGET_PHYSICS || '9.45')));
const UPLIFT_TARGET_SCENE = Math.max(0, Math.min(10, parseFloat(process.env.UPLIFT_TARGET_SCENE || '9.4')));
const UPLIFT_TARGET_POSE = Math.max(0, Math.min(10, parseFloat(process.env.UPLIFT_TARGET_POSE || '9.35')));
const PHYSICS_REALISM_PRIORITY_MULTIPLIER = Math.max(
  1,
  Math.min(5, parseFloat(process.env.PHYSICS_REALISM_PRIORITY_MULTIPLIER || '1'))
);
const PHYSICS_REALISM_PROMPT_HARD_MODE = process.env.PHYSICS_REALISM_PROMPT_HARD_MODE !== '0';
const PHYSICS_REALISM_PROMPT_DENSITY = Math.max(
  1,
  Math.min(
    3,
    parseInt(
      process.env.PHYSICS_REALISM_PROMPT_DENSITY
        || (PHYSICS_REALISM_PRIORITY_MULTIPLIER >= 3 ? '3' : '2'),
      10
    )
  )
);
const EDGE_PRIORITY_MULTIPLIER = Math.max(1, Math.min(4, parseFloat(process.env.EDGE_PRIORITY_MULTIPLIER || '2.4')));
const EDGE_FIRST_ACCEPTANCE_MODE = process.env.EDGE_FIRST_ACCEPTANCE_MODE !== '0';
const EDGE_FIRST_ACCEPTANCE_EDGE_MIN = Math.max(
  0,
  Math.min(10, parseFloat(process.env.EDGE_FIRST_ACCEPTANCE_EDGE_MIN || '9.6'))
);
const EDGE_FIRST_ACCEPTANCE_IDENTITY_MIN = Math.max(
  0,
  Math.min(10, parseFloat(process.env.EDGE_FIRST_ACCEPTANCE_IDENTITY_MIN || '9.25'))
);
const EDGE_FIRST_ACCEPTANCE_GAZE_MIN = Math.max(
  0,
  Math.min(10, parseFloat(process.env.EDGE_FIRST_ACCEPTANCE_GAZE_MIN || '9.1'))
);
const EDGE_FIRST_ACCEPTANCE_ATTIRE_MIN = Math.max(
  0,
  Math.min(10, parseFloat(process.env.EDGE_FIRST_ACCEPTANCE_ATTIRE_MIN || '9.2'))
);
const EDGE_FIRST_ACCEPTANCE_SCENE_MIN = Math.max(
  0,
  Math.min(10, parseFloat(process.env.EDGE_FIRST_ACCEPTANCE_SCENE_MIN || '9.2'))
);
const EDGE_FIRST_ACCEPTANCE_POSE_MIN = Math.max(
  0,
  Math.min(10, parseFloat(process.env.EDGE_FIRST_ACCEPTANCE_POSE_MIN || '9.15'))
);
const DARING_EDITORIAL_MODE = process.env.DARING_EDITORIAL_MODE === '1';
const DARING_EDITORIAL_LEVEL = Math.max(1, Math.min(3, parseInt(process.env.DARING_EDITORIAL_LEVEL || '3', 10)));
const DARING_EDITORIAL_FEATURE_COUNT_MIN = Math.max(
  2,
  Math.min(5, parseInt(process.env.DARING_EDITORIAL_FEATURE_COUNT_MIN || '3', 10))
);
const SCENE_DIRECTOR_BLUEPRINT_MODE = process.env.SCENE_DIRECTOR_BLUEPRINT_MODE === '1';
const EDITORIAL_EDGE_REBUILD_MODE = process.env.EDITORIAL_EDGE_REBUILD_MODE === '1';
const PROMPT_FIRST_PRIORITY_MODE = process.env.PROMPT_FIRST_PRIORITY_MODE === '1';
const PROMPT_DIRECTION_SUPREMACY_MODE = process.env.PROMPT_DIRECTION_SUPREMACY_MODE !== '0';
const SKIP_SAFE_FALLBACK_ON_PRIMARY_REJECT = process.env.SKIP_SAFE_FALLBACK_ON_PRIMARY_REJECT
  ? process.env.SKIP_SAFE_FALLBACK_ON_PRIMARY_REJECT !== '0'
  : EDITORIAL_EDGE_REBUILD_MODE;
const ATTIRE_BOLD_BOOST = process.env.ATTIRE_BOLD_BOOST === '1';
const ATTIRE_BOLD_BOOST_LEVEL = Math.max(1, Math.min(3, parseInt(process.env.ATTIRE_BOLD_BOOST_LEVEL || '3', 10)));
const SKIN_FORWARD_STYLING = process.env.SKIN_FORWARD_STYLING === '1';
const SKIN_FORWARD_LEVEL = Math.max(1, Math.min(3, parseInt(process.env.SKIN_FORWARD_LEVEL || '3', 10)));
const SENSUAL_EDITORIAL_BOOST = process.env.SENSUAL_EDITORIAL_BOOST === '1';
const SENSUAL_EDITORIAL_LEVEL = Math.max(1, Math.min(3, parseInt(process.env.SENSUAL_EDITORIAL_LEVEL || '3', 10)));
const SENSUAL_VARIANCE_GUARD = process.env.SENSUAL_VARIANCE_GUARD === '1';
const SENSUAL_VARIANCE_LEVEL = Math.max(1, Math.min(3, parseInt(process.env.SENSUAL_VARIANCE_LEVEL || '2', 10)));
const ENABLE_RESEARCH_MICRODETAIL_EXPANSION = process.env.ENABLE_RESEARCH_MICRODETAIL_EXPANSION !== '0';
const PROMPT_TARGET_WORDS = Math.max(800, Math.min(2600, parseInt(process.env.PROMPT_TARGET_WORDS || '1500', 10)));
const SAFE_POLICY_HARDENING = process.env.SAFE_POLICY_HARDENING !== '0';
const SAFE_FALLBACK_SOURCE = (process.env.SAFE_FALLBACK_SOURCE || 'safe_prompt').trim().toLowerCase();
const SAFE_FALLBACK_SOURCE_NORMALIZED = SAFE_FALLBACK_SOURCE === 'primary_prompt' ? 'primary_prompt' : 'safe_prompt';
const SAFE_TRANSFER_PRIMARY_ANCHORS = process.env.SAFE_TRANSFER_PRIMARY_ANCHORS !== '0';
const SCORER_INTENT_DIGEST_MAX_CHARS = Math.max(
  500,
  Math.min(2400, parseInt(process.env.SCORER_INTENT_DIGEST_MAX_CHARS || '900', 10))
);
const SCORER_UNAVAILABLE_POLICY = (process.env.SCORER_UNAVAILABLE_POLICY || 'soft_accept').trim().toLowerCase();
const PHYSICS_CHECKLIST_ENFORCE = process.env.PHYSICS_CHECKLIST_ENFORCE !== '0';
const PHYSICS_CHECKLIST_MIN = Math.max(
  0,
  Math.min(10, parseFloat(process.env.PHYSICS_CHECKLIST_MIN || '8.8'))
);
const DIRECT_CAMERA_GAZE_OVERRIDE = process.env.DIRECT_CAMERA_GAZE_OVERRIDE === '1';
const PHYSICS_REALISM_OVERRIDE_LEVEL = Math.max(1, Math.min(10, parseInt(process.env.PHYSICS_REALISM_OVERRIDE_LEVEL || '10', 10)));
const ANTI_AI_REALISM_BOOST = process.env.ANTI_AI_REALISM_BOOST === '1';
const ANTI_AI_REALISM_LEVEL = Math.max(1, Math.min(10, parseInt(process.env.ANTI_AI_REALISM_LEVEL || '10', 10)));
const ENABLE_MICRO_PHYSICS_SOLVER = process.env.ENABLE_MICRO_PHYSICS_SOLVER === '1';
const MICRO_PHYSICS_SOLVER_LEVEL = Math.max(1, Math.min(10, parseInt(process.env.MICRO_PHYSICS_SOLVER_LEVEL || '10', 10)));
const ENABLE_FRONTIER_PROTOCOL = process.env.ENABLE_FRONTIER_PROTOCOL === '1';
const FRONTIER_WITH_SOLVER = process.env.FRONTIER_WITH_SOLVER === '1';
const ENABLE_REVOLUTIONARY_PHYSICS_KERNEL = process.env.ENABLE_REVOLUTIONARY_PHYSICS_KERNEL === '1';
const REVOLUTIONARY_PHYSICS_KERNEL_LEVEL = Math.max(
  1,
  Math.min(10, parseInt(process.env.REVOLUTIONARY_PHYSICS_KERNEL_LEVEL || '10', 10))
);
const ENABLE_HYPER_MICRO_DETAIL = process.env.ENABLE_HYPER_MICRO_DETAIL === '1';
const HYPER_MICRO_DETAIL_LEVEL = Math.max(1, Math.min(10, parseInt(process.env.HYPER_MICRO_DETAIL_LEVEL || '10', 10)));
const ENABLE_IDENTITY_SUPREMACY_LOCK = process.env.ENABLE_IDENTITY_SUPREMACY_LOCK !== '0';
const IDENTITY_SUPREMACY_LEVEL = Math.max(1, Math.min(10, parseInt(process.env.IDENTITY_SUPREMACY_LEVEL || '10', 10)));
const ENABLE_FORENSIC_REALISM_TARGET = process.env.ENABLE_FORENSIC_REALISM_TARGET !== '0';
const FORENSIC_REALISM_TARGET_LEVEL = Math.max(
  1,
  Math.min(10, parseInt(process.env.FORENSIC_REALISM_TARGET_LEVEL || '10', 10))
);
const ENABLE_GOAL_MAXIMIZER = process.env.ENABLE_GOAL_MAXIMIZER === '1';
const GOAL_MAXIMIZER_LEVEL = Math.max(1, Math.min(10, parseInt(process.env.GOAL_MAXIMIZER_LEVEL || '10', 10)));
const SCORER_PARSE_REPAIR_RETRIES = Math.max(0, Math.min(3, parseInt(process.env.SCORER_PARSE_REPAIR_RETRIES || '3', 10)));
const SCORER_HEURISTIC_MIN_FIELDS = Math.max(2, Math.min(8, parseInt(process.env.SCORER_HEURISTIC_MIN_FIELDS || '3', 10)));
const SCORER_REPAIR_MAX_OUTPUT_TOKENS = Math.max(
  180,
  Math.min(1200, parseInt(process.env.SCORER_REPAIR_MAX_OUTPUT_TOKENS || '420', 10))
);
const SCORER_SELF_HEAL_RETRIES = Math.max(
  0,
  Math.min(3, parseInt(process.env.SCORER_SELF_HEAL_RETRIES || '1', 10))
);
const SCORER_PARSE_REQUERY_ON_FAIL = process.env.SCORER_PARSE_REQUERY_ON_FAIL !== '0';
const SCORER_PARSE_REQUERY_MAX_OUTPUT_TOKENS = Math.max(
  280,
  Math.min(1200, parseInt(process.env.SCORER_PARSE_REQUERY_MAX_OUTPUT_TOKENS || '700', 10))
);
const SCORER_FORCE_SCHEMA = process.env.SCORER_FORCE_SCHEMA !== '0';
const SCORER_COMPACT_PROMPT = process.env.SCORER_COMPACT_PROMPT !== '0';
const IMAGE_HTTP_RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504]);
const RATE_LIMIT_ADAPTIVE_COOLDOWN = process.env.RATE_LIMIT_ADAPTIVE_COOLDOWN === '1';
const RATE_LIMIT_COOLDOWN_BASE_S = Math.max(0, parseNumberEnv('RATE_LIMIT_COOLDOWN_BASE_S', 18));
const RATE_LIMIT_COOLDOWN_MAX_S = Math.max(
  RATE_LIMIT_COOLDOWN_BASE_S,
  parseNumberEnv('RATE_LIMIT_COOLDOWN_MAX_S', 120)
);
const RATE_LIMIT_COOLDOWN_GROWTH = Math.max(1, parseNumberEnv('RATE_LIMIT_COOLDOWN_GROWTH', 1.7));
const RATE_LIMIT_COOLDOWN_DECAY_S = Math.max(0, parseNumberEnv('RATE_LIMIT_COOLDOWN_DECAY_S', 4));
const ATTEMPT_WAIT_JITTER_S = Math.max(0, parseNumberEnv('ATTEMPT_WAIT_JITTER_S', 0));

let adaptiveRateLimitCooldownS = 0;
let adaptiveRateLimitCooldownUntilMs = 0;

const SCORER_RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    scores: {
      type: 'OBJECT',
      properties: {
        identity: { type: 'NUMBER' },
        gaze: { type: 'NUMBER' },
        attireReplacement: { type: 'NUMBER' },
        edge: { type: 'NUMBER' },
        realism: { type: 'NUMBER' },
        physics: { type: 'NUMBER' },
        sceneAdherence: { type: 'NUMBER' },
        poseAdherence: { type: 'NUMBER' }
      },
      required: ['identity', 'gaze', 'attireReplacement', 'edge', 'realism', 'physics', 'sceneAdherence', 'poseAdherence']
    },
    physicsChecklist: {
      type: 'OBJECT',
      properties: {
        supportContact: { type: 'NUMBER' },
        nonPenetration: { type: 'NUMBER' },
        gravityDrape: { type: 'NUMBER' },
        lightShadowGeometry: { type: 'NUMBER' },
        materialResponse: { type: 'NUMBER' }
      },
      required: ['supportContact', 'nonPenetration', 'gravityDrape', 'lightShadowGeometry', 'materialResponse']
    },
    diagnostics: { type: 'STRING' },
    rescueDirectives: {
      type: 'ARRAY',
      items: { type: 'STRING' }
    },
    confidence: { type: 'NUMBER' }
  },
  required: ['scores', 'diagnostics', 'rescueDirectives', 'confidence']
};

const SCORE_FIELD_ALIASES = {
  identity: ['identity', 'identityMatch', 'identity_match'],
  gaze: ['gaze', 'directGaze', 'direct_camera_gaze'],
  attireReplacement: ['attireReplacement', 'attire_replacement', 'wardrobeReplacement'],
  edge: ['edge', 'editorialEdge', 'editorial_edge'],
  realism: ['realism', 'photorealism', 'photoRealism'],
  physics: ['physics', 'physicsConsistency', 'physics_consistency'],
  sceneAdherence: ['sceneAdherence', 'scene_adherence', 'sceneMatch', 'scene_match'],
  poseAdherence: ['poseAdherence', 'pose_adherence', 'poseMatch', 'pose_match']
};

const REQUIRED_SCORER_SCORE_FIELDS = Object.keys(SCORE_FIELD_ALIASES).length;

const auth = new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/cloud-platform'] });

async function getAccessToken() {
  if (STATIC_ACCESS_TOKEN) {
    return STATIC_ACCESS_TOKEN;
  }
  return auth.getAccessToken();
}

function log(message) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
}

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function timestampForPath(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');
  const ms = String(date.getMilliseconds()).padStart(3, '0');
  return `${y}${m}${d}-${hh}${mm}${ss}-${ms}-p${process.pid}`;
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitBeforeAttempt(seconds, label) {
  const baseSeconds = Math.max(0, Number(seconds) || 0);
  let effectiveSeconds = baseSeconds;

  if (RATE_LIMIT_ADAPTIVE_COOLDOWN) {
    const remainingCooldownMs = adaptiveRateLimitCooldownUntilMs - Date.now();
    if (remainingCooldownMs > 0) {
      const remainingCooldownS = Math.ceil(remainingCooldownMs / 1000);
      effectiveSeconds = Math.max(effectiveSeconds, remainingCooldownS);
    }
  }

  const jitterSeconds = ATTEMPT_WAIT_JITTER_S > 0
    ? Math.random() * ATTEMPT_WAIT_JITTER_S
    : 0;
  const totalSeconds = effectiveSeconds + jitterSeconds;

  const details = [];
  details.push(`base=${baseSeconds}s`);
  if (effectiveSeconds > baseSeconds) {
    details.push(`rateLimitCooldown=${effectiveSeconds}s`);
  }
  if (jitterSeconds > 0) {
    details.push(`jitter=+${jitterSeconds.toFixed(1)}s`);
  }
  log(`${label}: waiting ${totalSeconds.toFixed(1)}s before attempt (${details.join(', ')})`);
  await wait(Math.max(0, Math.round(totalSeconds * 1000)));
}

function parseRetryAfterMs(rawRetryAfter) {
  if (!rawRetryAfter) return null;
  const seconds = Number.parseFloat(rawRetryAfter);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.max(0, Math.round(seconds * 1000));
  }
  const retryDate = Date.parse(rawRetryAfter);
  if (!Number.isFinite(retryDate)) return null;
  return Math.max(0, retryDate - Date.now());
}

const CACHE_DIAGNOSTIC_HEADERS = [
  'age',
  'cache-control',
  'pragma',
  'etag',
  'x-cache',
  'x-cache-hit',
  'x-cache-lookup',
  'x-served-by',
  'via',
  'date'
];

function extractCacheDiagnosticHeaders(headersLike) {
  if (!headersLike || typeof headersLike.get !== 'function') {
    return null;
  }
  const diagnostics = {};
  for (const headerName of CACHE_DIAGNOSTIC_HEADERS) {
    const value = headersLike.get(headerName);
    if (typeof value === 'string' && value.trim()) {
      diagnostics[headerName] = value.trim();
    }
  }
  return Object.keys(diagnostics).length ? diagnostics : null;
}

function computeImageRetryDelayMs({ attempt, retryAfterHeader = null }) {
  const retryAfterMs = parseRetryAfterMs(retryAfterHeader);
  if (retryAfterMs !== null) {
    return Math.max(IMAGE_HTTP_BACKOFF_MIN_MS, Math.min(IMAGE_HTTP_BACKOFF_MAX_MS, retryAfterMs));
  }
  const exp = Math.max(0, attempt - 1);
  const exponentialMs = Math.min(IMAGE_HTTP_BACKOFF_MAX_MS, IMAGE_HTTP_BACKOFF_BASE_MS * (2 ** exp));
  const jitterMs = Math.floor(Math.random() * 750);
  return Math.max(IMAGE_HTTP_BACKOFF_MIN_MS, Math.min(IMAGE_HTTP_BACKOFF_MAX_MS, exponentialMs + jitterMs));
}

function armAdaptiveRateLimitCooldown({ label, status, retryAfterHeader = null }) {
  if (!RATE_LIMIT_ADAPTIVE_COOLDOWN || status !== 429) return;
  const retryAfterMs = parseRetryAfterMs(retryAfterHeader);
  const retryAfterS = retryAfterMs !== null ? Math.ceil(retryAfterMs / 1000) : 0;
  const grownCooldown = adaptiveRateLimitCooldownS > 0
    ? adaptiveRateLimitCooldownS * RATE_LIMIT_COOLDOWN_GROWTH
    : RATE_LIMIT_COOLDOWN_BASE_S;
  const nextCooldownS = Math.min(
    RATE_LIMIT_COOLDOWN_MAX_S,
    Math.max(RATE_LIMIT_COOLDOWN_BASE_S, Math.max(grownCooldown, retryAfterS))
  );
  adaptiveRateLimitCooldownS = nextCooldownS;
  adaptiveRateLimitCooldownUntilMs = Date.now() + (nextCooldownS * 1000);
  log(
    `${label}: adaptive 429 cooldown armed at ${nextCooldownS.toFixed(1)}s`
    + (retryAfterS > 0 ? ` (retry-after=${retryAfterS}s)` : '')
  );
}

function decayAdaptiveRateLimitCooldown() {
  if (!RATE_LIMIT_ADAPTIVE_COOLDOWN || adaptiveRateLimitCooldownS <= 0) return;
  adaptiveRateLimitCooldownS = Math.max(0, adaptiveRateLimitCooldownS - RATE_LIMIT_COOLDOWN_DECAY_S);
  adaptiveRateLimitCooldownUntilMs = adaptiveRateLimitCooldownS > 0
    ? Date.now() + (adaptiveRateLimitCooldownS * 1000)
    : 0;
}

function extToMime(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.png') return 'image/png';
  if (ext === '.webp') return 'image/webp';
  throw new Error(`Unsupported reference image extension: ${ext}`);
}

function mimeToExt(mimeType) {
  const normalized = String(mimeType || '').toLowerCase();
  if (normalized.includes('png')) return 'png';
  if (normalized.includes('jpeg') || normalized.includes('jpg')) return 'jpg';
  if (normalized.includes('webp')) return 'webp';
  return 'png';
}

function findImagePart(body) {
  const candidates = body?.candidates || [];
  for (const candidate of candidates) {
    const parts = candidate?.content?.parts || [];
    for (const part of parts) {
      if (part?.inlineData?.data) {
        return part;
      }
    }
  }
  return null;
}

function extractBlockReason(body) {
  const reasons = [];

  const promptFeedbackReason = body?.promptFeedback?.blockReason;
  if (promptFeedbackReason) reasons.push(`promptFeedback:${promptFeedbackReason}`);

  for (const candidate of body?.candidates || []) {
    if (candidate?.finishReason) {
      reasons.push(`finishReason:${candidate.finishReason}`);
    }
    const candidateBlock = candidate?.safetyFeedback?.blockReason;
    if (candidateBlock) {
      reasons.push(`candidateSafety:${candidateBlock}`);
    }
  }

  return reasons.length ? reasons.join(', ') : null;
}

function countWords(text) {
  const trimmed = String(text || '').trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

function shortHash(text, len = 16) {
  return crypto.createHash('sha256').update(String(text)).digest('hex').slice(0, len);
}

function buildRunNonce() {
  return crypto.randomBytes(16).toString('hex').slice(0, PROMPT_NONCE_LENGTH);
}

function buildAttireBoostBlock(variant, level) {
  const intensityLine = level >= 3
    ? 'Push extreme visual impact: daring couture cocktail architecture, body-contour precision, strong leg-line emphasis, and commanding editorial presence.'
    : level === 2
      ? 'Push clear visual impact: strong silhouette definition, richer contrast, and upscale statement styling.'
      : 'Add moderate visual impact: refined statement styling and cleaner silhouette emphasis.';

  const coverageLine = variant === 'safe'
    ? 'Keep safer coverage boundaries, but still push a high-cut, contour-forward, nightlife-couture silhouette through material behavior and lighting.'
    : 'Push the primary look to maximum non-explicit daring through contour fit, side geometry, and slit dynamics.';

  return [
    'ATTIRE IMPACT OVERRIDE (HIGH PRIORITY):',
    'Edge amplification target: elevated daring through geometry, tension mapping, and optical contouring (non-explicit).',
    intensityLine,
    coverageLine,
    'Wardrobe must immediately read as luxury, attention-grabbing cocktail couture via physically grounded rendering.',
    'Prioritize skin-forward but non-explicit couture geometry: open shoulder/back articulation, contour waist windows, and long leg-line presentation.',
    '',
    'PHYSICS-BASED ATTIRE ENFORCEMENT:',
    '- Drive a contour-max silhouette with high-fidelity seam tension maps, panel curvature, dart shaping, and edge stability under pose changes.',
    '- Use aggressive but plausible fabric response: gravity drape, compression folds at contact zones, torsion wrinkles from torso rotation, and wide slit response tied to leg angle.',
    '- Increase material richness: anisotropic highlight flow on satin, steep sheen gradients on hosiery, lace/mesh micro-shadowing, and realistic specular rolloff.',
    '- Push hosiery mechanics harder: denier-dependent translucency, thigh-band compression gradient, ankle/instep micro-bunching, and coherent stretch over quad/knee contours.',
    '- Use panel-strain differentials to create strategic reveal illusions (through tension and translucency behavior), never explicit framing.',
    '- Use edge-contact realism on exposed skin: cutline pressure transitions, support-point compression, and plausible friction hold at garment anchors.',
    '- Keep footwear-body interaction precise: heel load path, forefoot pressure, tendon cues at ankle, and clean contact shadows at floor/stool surfaces.',
    '',
    'COMPOSITION + LIGHTING PRIORITY FOR ATTIRE READABILITY:',
    '- Keep full outfit legible in frame; avoid crop choices that mute silhouette impact.',
    '- Shape light for maximum contour expression: controlled rim separation, strong specular accents on structural lines, and deep-but-clean shadow contrast.',
    '- Favor perspective and pose that elongate leg lines and reinforce couture geometry.',
    '- Maintain photoreal skin and identity while ensuring attire remains the visual focal anchor.',
    '',
    'SAFETY + QUALITY GUARDRAILS:',
    '- Adult subject only, no nudity, no explicit framing, no fetish framing.',
    '- No fabric clipping, no impossible seam geometry, no texture smearing, no broken anatomy.',
    '- Result must feel like premium Vegas fashion campaign photography.'
  ].join('\n');
}

function applyAttireBoost(promptText, variant) {
  if (!ATTIRE_BOLD_BOOST) {
    return promptText;
  }
  const boostBlock = buildAttireBoostBlock(variant, ATTIRE_BOLD_BOOST_LEVEL);
  return `${promptText.trim()}\n\n${boostBlock}`;
}

function buildSkinForwardEditorialBlock(variant, level) {
  const intensityLine = level >= 3
    ? 'Maximize tasteful skin-forward styling: shoulders, upper back, waist architecture, and leg line while remaining non-explicit.'
    : level === 2
      ? 'Increase tasteful skin-forward styling through open-back geometry, waist cut architecture, and stronger leg-line reveal.'
      : 'Add moderate skin-forward styling through selective open areas and stronger silhouette contrast.';

  const variantLine = variant === 'safe'
    ? 'Safe variant must keep coverage-critical zones secure while still reading as bold editorial nightlife styling.'
    : 'Primary variant should push daring fashion geometry with secure support and precise fit mechanics.';

  return [
    'SKIN-FORWARD EDITORIAL STYLING (NON-EXPLICIT, HARD):',
    intensityLine,
    variantLine,
    '',
    'STYLE TARGETS:',
    '- Favor cut architecture that reveals collarbone, shoulder line, upper back, side waist windows, and elongated leg line via slit dynamics.',
    '- Preserve coverage-critical zones with stable garment structure, secure anchoring, and no accidental exposure framing.',
    '- Keep the final look clearly adult, upscale, and fashion-editorial rather than explicit.',
    '',
    'PHYSICS REQUIREMENTS FOR SKIN-FORWARD GARMENTS:',
    '- Model support engineering: seam reinforcement, hidden structure/boning logic, and tension-balanced panel load paths.',
    '- Model contact mechanics at cut edges: compression transitions, skin-adjacent micro-shadowing, and believable friction hold.',
    '- Model slit behavior as a function of pose: hip rotation, stride angle, and gravity-driven opening/closing response.',
    '- Model sheer layering with angle-dependent opacity and coherent occlusion transitions (no synthetic transparency artifacts).',
    '- Keep body proportions realistic with anatomically valid posture and natural soft-tissue response under pose load.',
    '',
    'DISALLOWED:',
    '- No nudity, no explicit sexual framing, no fetish framing, no accidental exposure from unstable garment simulation.'
  ].join('\n');
}

function buildSensualEditorialBlock(variant, level) {
  const intensityLine = level >= 3
    ? 'Push an extreme sensual editorial silhouette via fit physics, strategic reveal dynamics, and high-tension couture geometry while remaining non-explicit.'
    : level === 2
      ? 'Push a clear sensual editorial silhouette through fit physics, contour definition, and controlled reveal dynamics.'
      : 'Add moderate sensual editorial emphasis through contour-aware fit and controlled reveal dynamics.';

  const variantLine = variant === 'safe'
    ? 'For safe fallback: keep coverage-forward structure but push sheer layering, open-back/shoulder geometry, high-cut leg lines, and tension-driven silhouette clarity.'
    : 'For primary: push daring geometry, body-skimming fit, skin-forward cut architecture, and pose-driven reveal behavior to the edge of non-explicit fashion editorial.';

  return [
    'SENSUAL EDITORIAL PHYSICS OVERRIDE (NON-EXPLICIT):',
    'Edge physics mode: increased contour intensity via strain gradients, slit kinematics, and sheer-layer optics.',
    intensityLine,
    variantLine,
    '',
    'REVEAL-BY-PHYSICS (NOT EXPLICIT LANGUAGE):',
    '- Drive perceived reveal through strain-field topography, panel geometry, and pose-dependent opening behavior rather than explicit wording.',
    '- Increase body-skimming fit realism: high-strain zones at waist/hip/upper leg with sharp compression transitions and credible seam load paths.',
    '- Increase tasteful exposed-area design: collarbone/shoulder/back emphasis, side-waist cut architecture, and elongated leg-line projection.',
    '- Use high-amplitude slit dynamics: opening angle responds to hip rotation, stride, gravity, and fabric stiffness; keep edge tension coherent and non-random.',
    '- Use sheer/mesh optical physics aggressively: denier-dependent translucency gradients, layered occlusion, directional sheen, and angle-dependent leg definition.',
    '- Preserve coverage-critical regions while maximizing silhouette intensity via contour highlights, shadow sculpting, and strategic material contrast.',
    '- Enforce garment stability in motion: anchor points, seam stiffness, and structural support logic prevent accidental exposure artifacts.',
    '',
    'POSE + LIGHT FOR SEXIER EDITORIAL IMPACT:',
    '- Favor confident posture with strong S-curve torso-leg flow, long leg-line projection, and clean shoulder-pelvis counter-rotation.',
    '- Keep direct eye contact with assertive expression, tight brow/eyelid control, and subtle facial asymmetry for editorial edge.',
    '- Use motivated key/rim/fill separation to aggressively emphasize garment contours, leg lines, and material depth without explicit framing.',
    '',
    'GUARDRAILS:',
    '- Adult subject only; no nudity, no explicit sexual framing, no fetish framing.',
    '- Keep premium fashion-campaign intent and physically plausible anatomy at all times.'
  ].join('\n');
}

function buildSensualVarianceBlock(variant, level, promptMeta = {}) {
  if (variant !== 'primary') {
    return '';
  }
  const intensityLine = level >= 3
    ? 'Require a clearly seductive but non-explicit pose read: stronger torso arc, leg-line extension, and expressive hand choreography.'
    : level === 2
      ? 'Require a distinct sensual pose read: clear torso-leg flow and expressive hand choreography.'
      : 'Require a mild sensual pose read with non-generic body language.';
  const titleLine = promptMeta?.title
    ? `Scene lock reminder: keep pose language specific to "${promptMeta.title}" rather than a generic lounge stance.`
    : 'Scene lock reminder: keep pose language specific to this prompt scene.';
  return [
    'ANTI-HOMOGENIZATION SENSUAL VARIANCE LOCK (PRIMARY, NON-EXPLICIT):',
    intensityLine,
    titleLine,
    '',
    'Pose constraints (must all be visible):',
    '- Include one active support contact (rail, table, chair, wall, ladder, or mic stand) with visible compression or grip tension.',
    '- Include one explicit torsion cue (shoulder-pelvis counter-rotation, hip-led stride, or seated twist).',
    '- Include one expressive hand action above waist level (collarbone trace, neckline touch, hair sweep, or frame interaction).',
    '- Include one leg-line emphasis cue (cross-step, knee lift, slit-driven extension, or weight-shift projection).',
    '',
    'Reject default template poses:',
    '- static hand-on-hip plus neutral crossed-leg only;',
    '- rigid front-facing mannequin stance with no support interaction;',
    '- repeated pose grammar from previous outputs when prompt anchors differ.',
    '',
    'Guardrails: adult subject only, no nudity, no explicit sexual framing.'
  ].join('\n');
}

function buildDaringEditorialBlock(variant, level) {
  const intensityLine = level >= 3
    ? 'Drive a boundary-pushing daring editorial silhouette: revealing but controlled cut architecture, dominant leg-line projection, and high-attitude nightlife styling.'
    : level === 2
      ? 'Drive a clearly daring editorial silhouette through stronger reveal geometry and assertive nightlife styling.'
      : 'Add a moderate daring editorial silhouette with cleaner reveal geometry and stronger attitude.';

  const variantLine = variant === 'safe'
    ? 'Safe variant: keep coverage-critical zones secure while preserving provocative visual energy through cut geometry, fit, and lighting.'
    : 'Primary variant: push to the edge of non-explicit revealing editorial fashion through confident fit, strategic cut lines, and dynamic slit behavior.';

  const featureTargets = [
    '- high-cut leg line with clear upper-thigh emphasis',
    '- deep side-waist cut architecture',
    '- open-back or low-back contour framing',
    '- sheer mesh/lace panel with controlled translucency',
    '- thigh-high slit with tension-stable edge behavior',
    '- structured corset-like contour support in top silhouette'
  ];

  return [
    'DARING EDITORIAL MODE (NON-EXPLICIT, HIGH PRIORITY):',
    intensityLine,
    variantLine,
    '',
    'STYLE DIRECTION:',
    '- Emphasize revealing-but-non-explicit architecture: open shoulder/back, side-waist cut windows, high-cut leg line, and precise two-piece contour separation.',
    '- Keep coverage-critical regions fully stable; use tension, layering, translucency gradients, and slit kinematics for controlled reveal.',
    '- Push stronger editorial attitude: lens-locked gaze, confident posture, long-leg projection, and clean shoulder-pelvis counter-rotation.',
    '- Light for daring contour readability: crisp rim separation, directional specular accents, and deep but clean shadow sculpting.',
    '',
    `MANDATORY REVEAL FEATURE COUNT: include at least ${DARING_EDITORIAL_FEATURE_COUNT_MIN} of the following in the final outfit (non-explicit):`,
    ...featureTargets,
    '- If previous attempt looked conservative, switch to a bolder nightlife couture archetype while keeping identity fixed.',
    '',
    'QUALITY GUARDRAILS:',
    '- Maintain premium fashion-campaign intent with physically plausible anatomy, fabric behavior, and contact mechanics.',
    '- Adult subject only; no nudity, no explicit sexual framing, no fetish framing.'
  ].join('\n');
}

function buildAntiAiRealismBlock(level) {
  const realismLine = level >= 10
    ? 'Enforce forensic plus adversarial capture authenticity: no synthetic smoothness, no tiling, no fake depth transitions, no composited edges, and no detached contact cues.'
    : level >= 9
      ? 'Enforce forensic-grade capture authenticity with cross-surface closure under close inspection.'
      : level >= 8
        ? 'Enforce forensic-grade capture authenticity: no synthetic smoothness, no tiling, no fake depth transitions, and no composited subject edges.'
        : level >= 6
          ? 'Enforce studio-camera authenticity with strict suppression of synthetic smoothness, tiled texture behavior, and fake depth cues.'
      : level >= 4
        ? 'Enforce documentary-grade capture authenticity with strict suppression of synthetic smoothness, tiled texture behavior, and fake depth cues.'
        : level >= 3
          ? 'Enforce near-photographic capture authenticity with zero synthetic-plastic rendering artifacts.'
          : level === 2
            ? 'Enforce strong photographic authenticity with strict artifact suppression.'
            : 'Enforce clear photographic realism and artifact suppression.';

  return [
    'ANTI-AI LOOK OVERRIDE (HARD):',
    'Realism amplification target: stronger camera-captured credibility cues and artifact suppression.',
    realismLine,
    '',
    'PHOTOGRAPHIC IMPERFECTION MODEL:',
    '- Add subtle real-camera behavior: mild lens vignetting, tiny focus falloff transitions, realistic highlight bloom, and non-uniform grain.',
    '- Keep skin truly lifelike: fine pore breakup, micro peach-fuzz catchlights, natural tonal variation, and zero waxy smoothing.',
    '- Keep hair lifelike: irregular strand clumping, flyaway distribution, and physically plausible moisture/frizz response.',
    '- Keep fabric lifelike: non-repeating microtexture, seam irregularity, edge fray micro-variance, and contact-pressure marks.',
    '- Keep makeup/jewelry/props slightly imperfect and asymmetrical to avoid CGI perfection.',
    '',
    'SCENE COHERENCE CHECKS:',
    '- Reflections must match scene geometry and lens angle; reject mirrored inconsistencies.',
    '- Shadows must match all practical light sources in direction, softness, and falloff.',
    '- Depth of field must be optically coherent (no cutout subject edges, no fake blur halos).',
    '- Hands, fingers, teeth, eyes, and hosiery textures must pass close-up realism scrutiny.',
    ...(level >= 7
      ? ['- Scene-anchor coherence must hold: location-defining props and materials remain consistent with prompt intent.']
      : []),
    ...(level >= 8
      ? ['- Cross-surface realism must hold simultaneously: skin, hair, hosiery, satin, and metal all react coherently to the same light model.']
      : []),
    ...(level >= 9
      ? ['- Micro-contact coherence must hold globally: slit edges, hosiery band, seams, and heel-floor contacts share one physically plausible cue system.']
      : []),
    ...(level >= 10
      ? ['- Adversarial realism check must pass: no zone can remain plausible only at thumbnail; close-view scrutiny must still hold.']
      : []),
    '',
    'REJECTION CRITERIA:',
    '- Reject outputs with over-smooth skin, rubbery fabric, repeated texture stamps, uncanny eyes, or composited-looking subject separation.'
  ].join('\n');
}

function buildDirectGazeRealismBlock(variant, level) {
  const realismLine = level >= 10
    ? 'Enforce cinema-grade plus adversarial realism: forensic eye optics, sub-surface skin breakup, subpixel textile contact behavior, and strict global lighting-material-contact causality.'
    : level >= 9
      ? 'Enforce forensic camera realism with cross-zone closure under close inspection.'
      : level >= 8
        ? 'Enforce cinema-grade realism fidelity with forensic eye optics, sub-surface skin breakup, subpixel textile contact behavior, and strict lighting-material causality.'
        : level >= 6
          ? 'Enforce advanced camera realism fidelity: lens-accurate eye optics, sub-surface skin variation, fabric microstructure, and contact-true shadow behavior.'
      : level >= 4
        ? 'Enforce cinema-camera realism fidelity: lens-accurate eye optics, sub-surface skin variation, fabric microstructure, and contact-true shadow behavior.'
        : level >= 3
          ? 'Enforce ultra-photoreal rendering fidelity: real-to-life skin, hair, optics, and cloth behavior with strict physical plausibility.'
          : level === 2
            ? 'Enforce strong photoreal rendering fidelity with physically coherent lighting, anatomy, and material response.'
            : 'Enforce clear photoreal behavior with realistic anatomy and lighting.';

  const riskLine = variant === 'safe'
    ? 'Maintain a conservative-coverage wardrobe profile while preserving a bold, risky editorial energy through pose, gaze, lighting, and styling.'
    : 'Maintain a daring, risky editorial energy through confident pose, strong eye contact, and cinematic nightlife styling.';

  return [
    'DIRECT CAMERA GAZE OVERRIDE (HARD RULE):',
    'Realism target: stronger face/eye authenticity under close inspection.',
    'Physics target: improved density of causally consistent material and contact cues.',
    '- Subject must always look directly into the camera lens.',
    '- Keep visible iris/pupil alignment toward lens center with believable vergence and head orientation.',
    '- No off-camera gaze, no downcast gaze, no profile-only eye direction in final frame.',
    '',
    'RISKY EDITORIAL INTENT (NON-EXPLICIT):',
    riskLine,
    '- Deliver a high-fashion Vegas editorial mood that feels provocative and premium without explicit content.',
    '',
    'PHYSICS + REALISM PRIORITY:',
    realismLine,
    '- Enforce mechanically valid posture: weight transfer, pelvis-shoulder counter-rotation, ankle load in heels, and natural hand articulation.',
    '- Enforce cloth simulation logic: gravity folds, seam tension, compression at contact, slit deformation under leg motion, and anisotropic highlight behavior.',
    '- Enforce hosiery realism: denier-dependent translucency, stretch maps over knee/quad, thigh-band compression transition, and micro-wrinkles near ankle/instep.',
    '- Enforce lighting physics: practical-source motivated shadows, Fresnel-consistent reflections, roughness-aware specular falloff, and atmospheric depth without haze washout.',
    '- Enforce camera realism: natural lens perspective, realistic depth of field, no synthetic warping, no AI texture artifacts.',
    ...(level >= 7
      ? ['- Enforce scene-anchor lock: environment-defining geometry and hero props from the prompt must be explicit and coherent.']
      : []),
    ...(level >= 8
      ? ['- Enforce cross-zone closure: slit boundary, hosiery band, knee, ankle, and heel contact all show mutually consistent strain, highlight, and shadow logic.']
      : []),
    ...(level >= 9
      ? ['- Enforce scene-wide closure: reflections, practical shadows, and contact micro-shadows must agree across subject and environment.']
      : []),
    ...(level >= 10
      ? ['- Enforce adversarial closure: if any zone fails close-view causality, treat the render as invalid and regenerate.']
      : []),
    '',
    'IDENTITY + QUALITY HARD GATES:',
    '- Preserve strict reference identity fidelity under all lighting and pose changes.',
    '- No extra limbs, no hand/foot distortion, no clipping fabrics, no plastic skin, no malformed facial features.',
    '- Adult subject only; no nudity, no explicit sexual framing, no fetish framing.'
  ].join('\n');
}

function buildFrontierPhysicsProtocolBlock(variant) {
  return [
    'FRONTIER PHYSICS + REALISM PROTOCOL (HARD):',
    '- Use constraint-coupled rendering: pose mechanics, cloth deformation, and lighting response must co-evolve as one physically coherent system.',
    '- Use force-flow language internally: load path -> tension ridge -> wrinkle orientation -> specular path -> shadow placement must remain causally linked.',
    '- Use material phase continuity: satin/mesh/hosiery transitions must maintain coherent optical behavior across seams and strain boundaries.',
    '- Use material parameter realism: anisotropic stretch, seam stiffness, friction coefficients, micro-roughness variation, and thickness-dependent drape.',
    '- Use skin-optics realism: subtle subsurface scattering gradients, pore-scale spec breakup, and local oil-sheen response under practical lighting.',
    '',
    'Per-zone physics density requirement:',
    '- For each major zone (torso panel, hip/slit zone, hosiery thigh band, knee contour, ankle/instep, heel-floor contact), render at least two distinct causally coherent cues.',
    '- Cues include: strain gradient, seam tension, compression fold, shear wrinkle, anisotropic highlight flow, contact shadow, friction-damped drape, translucency gradient, and support-anchor compression marks.',
    '',
    'Frame-level causality checks:',
    '- Pose -> load path -> tension map -> fold orientation -> highlight path must remain coherent.',
    '- Reflections and shadows must align with light source geometry and material roughness.',
    '- Eye direction must remain lens-locked and anatomically plausible.',
    '- Exposed-skin boundaries must show plausible garment-edge pressure and stable support behavior under motion.',
    '',
    'Innovative edge techniques via physics (non-explicit):',
    variant === 'safe'
      ? '- Keep safe-coverage boundaries, but preserve edgy silhouette through high-contrast contour lighting, high-cut line geometry, shear-driven textile memory, and controlled translucency windows.'
      : '- Maximize non-explicit daring using advanced slit kinematics, contour-fit strain topology, layered sheer optics, and seam-anchored reveal dynamics while preserving coverage-critical regions.',
    '',
    'Reject if any of the following occur:',
    '- AI-plastic skin, repeated textile patterns, impossible cloth folds, reflection mismatch, unstable anatomy, or muted silhouette definition.'
  ].join('\n');
}

function buildMicroPhysicsSolverBlock(variant, level) {
  const cueBudget = level >= 10
    ? '10 cues per zone'
    : level >= 9
      ? '9 cues per zone'
      : level >= 8
        ? '8 cues per zone'
        : level >= 7
          ? '7 cues per zone'
          : level >= 6
            ? '6 cues per zone'
        : level >= 5
          ? '5 cues per zone'
          : level >= 4
            ? '4 cues per zone'
            : level === 3
              ? '3 cues per zone'
              : level === 2
                ? '2-3 cues per zone'
                : '2 cues per zone';
  const variantBias = variant === 'safe'
    ? 'Maintain coverage-forward geometry, but keep contour intensity through physically coherent cutline pressure, translucency windows, and tension-balanced structure.'
    : 'Maximize non-explicit edge through physically coherent contour strain, slit kinematics, and support-stable reveal dynamics.';
  const ultraDensityLine = level >= 7
    ? 'Enforce multi-scale fold hierarchy per zone: macro drape, meso shear, micro-crease, and subpixel edge transitions must be causally consistent.'
    : level >= 5
      ? 'Enforce multi-scale fold hierarchy per zone: macro drape, meso shear, and micro-crease behavior must all be visible and causally consistent.'
      : null;
  const subpixelLine = level >= 6
    ? 'Enforce subpixel contact-shear realism at support edges, slit boundary, hosiery band, and heel contact with no painted-looking transitions.'
    : null;
  const forensicLine = level >= 8
    ? 'Enforce forensic consistency: no critical zone may rely on texture-only detail; every zone must show force-driven geometry and light response agreement.'
    : null;
  const adversarialLine = level >= 10
    ? 'Enforce adversarial micro-physics audit: each critical zone must remain physically coherent under close-view inspection and cross-zone comparison.'
    : null;

  return [
    'MICRO-PHYSICS SOLVER CONTRACT (HARD):',
    `Physics density target: ${cueBudget}.`,
    variantBias,
    ...(ultraDensityLine ? [ultraDensityLine] : []),
    ...(subpixelLine ? [subpixelLine] : []),
    ...(forensicLine ? [forensicLine] : []),
    ...(adversarialLine ? [adversarialLine] : []),
    '',
    'Solve this causality chain explicitly for the final frame:',
    '- Pose/load vector -> strain field -> fold orientation -> specular elongation -> penumbra geometry.',
    '- If any link is visually inconsistent, treat the render as invalid and regenerate.',
    '',
    'Mandatory zones for cue placement:',
    '- top edge/support zone',
    '- waist transition (top hem to skirt waistband)',
    '- slit and upper-leg boundary',
    '- thigh-band hosiery transition',
    '- knee contour stretch zone',
    '- ankle/instep crease zone',
    '- heel-floor contact zone',
    '- hand-to-prop/surface contact zone',
    '',
    'Allowed cues per zone (choose at least the required budget):',
    '- strain gradient',
    '- seam-ridge relief',
    '- compression/indentation shadow',
    '- shear wrinkle directionality',
    '- anisotropic highlight flow',
    '- denier translucency gradient',
    '- friction-damped drape',
    '- support-anchor pressure mark',
    '',
    'Numerical realism hints (visual target, not literal on-screen text):',
    '- micro wrinkle wavelength appears short near constrained seams, longer in free drape zones.',
    '- compression transitions are narrow and continuous, never hard-painted bands.',
    '- specular response widens with roughness and narrows with smooth tensioned material.',
    ...(level >= 5
      ? ['- cue continuity rule: seam relief, pressure shadow, and translucency shifts must agree at every support boundary.']
      : []),
    ...(level >= 6
      ? ['- closure rule: no zone may show isolated cues; strain, highlight, and shadow must reinforce each other in every critical area.']
      : []),
    ...(level >= 7
      ? ['- scene coupling rule: local cue behavior must remain compatible with global pose, camera angle, and practical light direction.']
      : []),
    ...(level >= 8
      ? ['- forensic closure rule: critical zones must show mutually consistent macro silhouette, meso folds, microtexture, and subpixel edge-pressure behavior.']
      : []),
    ...(level >= 9
      ? ['- global coupling rule: cue behavior in one zone cannot contradict geometry, lighting, or contact logic in any adjacent zone.']
      : []),
    ...(level >= 10
      ? ['- adversarial reject rule: if any zone relies on texture-only detail or disconnected highlights, the render is invalid.']
      : []),
    '',
    'Failure rejects:',
    '- one-piece topology collapse when two-piece is required.',
    '- texture-only fake folds with no matching light/shadow response.',
    '- detached highlights, non-motivated shadows, or unstable contact edges.',
    '- waxy skin, repeated textile stamps, or composited-looking subject separation.'
  ].join('\n');
}

function buildRevolutionaryPhysicsKernelBlock(variant, level) {
  const cueBudget = level >= 10
    ? '11 cues per critical zone'
    : level >= 9
      ? '10 cues per critical zone'
      : level >= 8
        ? '9 cues per critical zone'
        : level >= 7
          ? '8 cues per critical zone'
          : level >= 6
            ? '7 cues per critical zone'
        : level >= 5
          ? '6 cues per critical zone'
          : level >= 4
            ? '5 cues per critical zone'
            : level === 3
              ? '4 cues per critical zone'
              : level === 2
                ? '3 cues per critical zone'
                : '2 cues per critical zone';
  const stabilityEnvelope = variant === 'safe'
    ? 'Safe variant: prioritize boundary stability while preserving aggressive silhouette energy.'
    : 'Primary variant: maximize non-explicit edge with high-strain contour behavior and strict support integrity.';
  const ultraPass = level >= 5
    ? '- Pass 5 Microstructure: solve stitch continuity, fiber directionality, pore breakup, and anti-tiling variance under directional light.'
    : null;
  const subpixelPass = level >= 6
    ? '- Pass 6 Subpixel Contact: solve edge pressure gradients and contact-shear transitions with no floating highlights or painted bands.'
    : null;
  const scenePass = level >= 7
    ? '- Pass 7 Scene Coupling: enforce prompt-anchored environment coherence so subject physics and scene surfaces share one lighting model.'
    : null;
  const forensicPass = level >= 8
    ? '- Pass 8 Forensic Closure: enforce cross-zone agreement of strain, texture, translucency, and shadow behavior under close inspection.'
    : null;
  const adversarialPass = level >= 9
    ? '- Pass 9 Adversarial QA: stress-test all critical zones for texture-only fakery, detached highlights, and non-causal shadow behavior.'
    : null;
  const masterPass = level >= 10
    ? '- Pass 10 Master Closure: require full-scene causality consistency between subject mechanics, garment behavior, and environment lighting/reflection logic.'
    : null;

  return [
    'REVOLUTIONARY PHYSICS KERNEL (HARD):',
    `Kernel density target: ${cueBudget}.`,
    stabilityEnvelope,
    '',
    'PASS ORDER (DO NOT SKIP):',
    '- Pass 1 Geometry: solve pose, balance, and joint plausibility with heel-ground load path continuity.',
    '- Pass 2 Tension: solve seam stiffness, panel strain, slit kinematics, and wrinkle wavelength hierarchy.',
    '- Pass 3 Contact/Occlusion: solve skin-garment pressure transitions, friction hold, and contact-shadow depth.',
    '- Pass 4 Optics: solve BRDF/BTDF coherence, roughness gradients, Fresnel response, and penumbra realism.',
    ...(ultraPass ? [ultraPass] : []),
    ...(subpixelPass ? [subpixelPass] : []),
    ...(scenePass ? [scenePass] : []),
    ...(forensicPass ? [forensicPass] : []),
    ...(adversarialPass ? [adversarialPass] : []),
    ...(masterPass ? [masterPass] : []),
    '',
    'CRITICAL ZONES:',
    '- neckline/support edge',
    '- underbust and waist transition',
    '- side seam and hip apex',
    '- slit boundary and upper-leg interface',
    '- thigh-band hosiery transition',
    '- knee stretch field',
    '- ankle/instep crease field',
    '- heel-floor contact + reflected bounce',
    '',
    'PHYSICS CLOSURE RULES:',
    '- Every visible fold must map to a plausible force origin (load, torque, contact, drag, or gravity).',
    '- Every specular highlight must map to fold orientation and light source geometry.',
    '- Every shadow must map to contact depth and source direction with coherent softness.',
    '- Every translucent region must map to thickness and stretch state, never flat alpha behavior.',
    ...(level >= 5
      ? ['- Every critical zone must exhibit cross-scale agreement: macro silhouette, meso fold fields, and microtexture response align under the same light model.']
      : []),
    ...(level >= 6
      ? ['- Contact closure must hold at subpixel level: edge pressure, specular breakup, and micro-shadowing cohere at slit and hosiery transitions.']
      : []),
    ...(level >= 7
      ? ['- Scene closure must hold: environment reflections and shadows must reinforce the same geometry and light directions as garment physics.']
      : []),
    ...(level >= 8
      ? ['- Forensic closure must hold: no critical zone can pass with isolated detail; all zones must show consistent force, optics, and contact evidence.']
      : []),
    ...(level >= 9
      ? ['- Adversarial closure must hold: no critical zone may fake causality through texture without matching contact, shadow, and highlight evidence.']
      : []),
    ...(level >= 10
      ? ['- Master closure must hold: subject and environment must share one coherent physical narrative at macro, meso, micro, and subpixel scales.']
      : []),
    '',
    'FAIL IF:',
    '- any zone lacks causal cues;',
    '- two-piece topology collapses;',
    '- reflections detach from geometry;',
    '- skin/fabric boundaries look composited or airbrushed.'
  ].join('\n');
}

function buildHyperMicroDetailBlock(variant, level) {
  const cueBudget = level >= 10
    ? '12 cues per micro-zone'
    : level >= 9
      ? '11 cues per micro-zone'
      : level >= 8
        ? '10 cues per micro-zone'
        : level >= 7
          ? '9 cues per micro-zone'
          : level >= 6
            ? '8 cues per micro-zone'
        : level >= 5
          ? '7 cues per micro-zone'
          : level >= 4
            ? '6 cues per micro-zone'
            : level === 3
              ? '5 cues per micro-zone'
              : level === 2
                ? '4 cues per micro-zone'
                : '3 cues per micro-zone';
  const variantGuard = variant === 'safe'
    ? 'Safe variant must preserve coverage-critical boundaries while still exhibiting dense physically coherent micro-detail.'
    : 'Primary variant should maximize physically plausible micro-detail density while remaining non-explicit.';
  const ultraLine = level >= 7
    ? 'Enforce cross-scale continuity: micro-detail must reinforce meso folds and macro silhouette direction, never read as cosmetic noise.'
    : level >= 5
      ? 'Enforce cross-scale continuity: micro-detail must reinforce meso folds and macro silhouette direction, never read as cosmetic noise.'
      : null;
  const subpixelLine = level >= 6
    ? 'Enforce subpixel detail stability in eye-line, stitch lines, hosiery transitions, and heel-floor contacts under all key light angles.'
    : null;
  const forensicLine = level >= 8
    ? 'Enforce forensic micro-detail closure: skin pores, fiber threads, seam stitches, and contact-shadow pockets must remain coherent under close inspection.'
    : null;
  const adversarialLine = level >= 10
    ? 'Enforce adversarial micro-detail stress check: no denoised-flat patches, no tiled thread patterns, and no detached micro-highlights.'
    : null;

  return [
    'HYPER MICRO-DETAIL ENFORCEMENT (HARD):',
    `Micro-detail target: ${cueBudget}.`,
    variantGuard,
    ...(ultraLine ? [ultraLine] : []),
    ...(subpixelLine ? [subpixelLine] : []),
    ...(forensicLine ? [forensicLine] : []),
    ...(adversarialLine ? [adversarialLine] : []),
    '',
    'Required micro-zones:',
    '- facial micro-geometry (brow ridge, eyelid crease, lip-edge specularity)',
    '- hairline flyaway behavior at rim-light transition',
    '- garment stitch continuity and seam puckering near load paths',
    '- edge pressure transitions at support boundaries',
    '- hosiery denier variation across curvature and stretch state',
    '- hand-to-prop contact deformation and micro-shadowing',
    '- heel-floor compression pocket with secondary reflected bounce',
    '',
    'Optical micro-detail requirements:',
    '- preserve pore-scale skin texture without plastic smoothing',
    '- preserve fiber-scale textile directionality without tiled repetition',
    '- preserve roughness gradients across satin/mesh/hosiery with coherent specular width',
    '- preserve small occlusion pockets where layers overlap',
    ...(level >= 5
      ? ['- preserve iris-sclera-lash micro-contrast without over-sharpening or synthetic halos']
      : []),
    ...(level >= 6
      ? ['- preserve anti-tiling variance in fabric fibers and seam threads across all visible panels']
      : []),
    ...(level >= 7
      ? ['- preserve micro-shadow continuity at garment edges, slit lines, and hosiery transitions with no halo artifacts']
      : []),
    ...(level >= 8
      ? ['- preserve contact-driven micro-roughness shifts where skin, fabric, and metal surfaces meet']
      : []),
    ...(level >= 9
      ? ['- preserve cross-zone micro-consistency so edge pressure and fiber response remain coherent between adjacent materials']
      : []),
    ...(level >= 10
      ? ['- preserve forensic continuity in all micro-zones with zero synthetic haloing, tiling, or over-smoothed texture islands']
      : []),
    '',
    'Reject if:',
    '- micro-detail appears airbrushed or denoised-flat;',
    '- seam or stitch lines break continuity;',
    '- contact zones lack compression cues;',
    '- highlights do not follow local surface orientation.'
  ].join('\n');
}

function buildIdentitySupremacyBlock(variant, level) {
  const priorityLine = level >= 9
    ? 'Identity is the highest-priority constraint. If any instruction conflicts, preserve reference identity first.'
    : 'Prioritize exact identity fidelity over stylization shifts.';
  const variantLine = variant === 'safe'
    ? 'Safe variant must keep the same face identity and smile dynamics while strengthening wardrobe stability.'
    : 'Primary variant must keep the same face identity under all pose/lighting changes.';
  return [
    'IDENTITY SUPREMACY LOCK (HARD):',
    priorityLine,
    variantLine,
    '- Preserve same person from reference: age band, ethnicity, facial proportions, and asymmetry signatures.',
    '- Preserve landmark geometry: eye spacing, brow-to-orbit relation, nose bridge/width, philtrum length, lip contour, jaw taper, and chin projection.',
    '- Preserve expression family: smile shape, cheek lift pattern, and eye-crinkle behavior must stay identity-consistent.',
    '- Preserve hair identity cues: base color family, part direction, and root pattern continuity.',
    '',
    'Identity fail conditions:',
    '- Different-looking face, altered age impression, altered ethnicity cues, cartoon symmetry, or over-smoothed synthetic skin.'
  ].join('\n');
}

function buildForensicRealismTargetBlock(level) {
  return [
    'FORENSIC REALISM + DETAIL TARGET (HARD):',
    '- Prioritize camera-authentic realism over stylized smoothness.',
    '- Require high-frequency detail in skin pores, flyaway hair, seam threads, hosiery denier gradients, and contact-shadow pockets.',
    '- Maintain coherent light transport across skin, fabric, glass, metal, and background surfaces.',
    ...(level >= 9
      ? ['- Enforce close-view realism: no halo edges, no tiled textures, no detached highlights, no fake depth-of-field cutouts.']
      : []),
    ...(level >= 10
      ? ['- Enforce adversarial detail closure: macro silhouette, meso folds, microtexture, and subpixel contact cues must all agree simultaneously.']
      : []),
    '',
    'Reject if:',
    '- plastic skin, repeated microtexture stamps, composited subject edges, or non-causal shadow/reflection behavior.'
  ].join('\n');
}

function buildPhysicsRealismPriorityBlock(variant, multiplier, density) {
  const variantLine = variant === 'safe'
    ? 'Safe variant: keep coverage-safe framing while preserving high-impact contour realism.'
    : 'Primary variant: maximize non-explicit editorial edge while preserving physically plausible rendering.';
  const densityLine = density >= 3
    ? 'Use dense multi-scale cues per critical zone: macro silhouette, meso folds, microtexture, and subpixel contact behavior.'
    : density === 2
      ? 'Use clear multi-scale cues per critical zone: silhouette, fold fields, and micro-contact transitions.'
      : 'Use clean causal cues in all critical zones.';
  const strictnessLine = multiplier >= 4
    ? 'Treat any realism or physics artifact as a hard failure and regenerate.'
    : multiplier >= 3
      ? 'Treat realism/physics as the top quality priority and suppress all synthetic-looking artifacts.'
      : 'Prioritize physically coherent realism over stylized smoothness.';

  return [
    'PHYSICS + REALISM PRIORITY LOCK (HARD):',
    strictnessLine,
    variantLine,
    densityLine,
    '',
    'Causal chain must hold globally:',
    '- Pose/load path -> garment strain -> fold orientation -> highlight trajectory -> shadow/contact geometry.',
    '- If any link breaks, treat render as invalid.',
    '',
    'Critical zones (all must pass):',
    '- slit boundary and upper-leg interface',
    '- hosiery thigh-band compression transition',
    '- knee contour stretch and ankle/instep crease behavior',
    '- heel-floor contact compression and reflected bounce',
    '- garment-edge pressure transitions on exposed skin',
    '',
    'Artifact suppression:',
    '- no wax/plastic skin, no tiled textile patterns, no detached highlights, no fake depth halos, no composited cutout edges.',
    '- keep camera-authentic texture and coherent lighting across skin, fabric, metal, glass, and floor surfaces.'
  ].join('\n');
}

function buildGoalMaximizerBlock(variant, level) {
  const floors = level >= 10
    ? { identity: 9.6, gaze: 9.4, attire: 9.8, edge: 9.5, realism: 9.5, physics: 9.5, scene: 9.5, pose: 9.45 }
    : level >= 8
      ? { identity: 9.5, gaze: 9.3, attire: 9.6, edge: 9.4, realism: 9.4, physics: 9.4, scene: 9.35, pose: 9.3 }
      : { identity: 9.4, gaze: 9.2, attire: 9.4, edge: 9.3, realism: 9.3, physics: 9.3, scene: 9.25, pose: 9.2 };

  return [
    'ALL-GOAL PERFORMANCE MAXIMIZER (HARD):',
    `Target score floors: identity>=${floors.identity}, gaze>=${floors.gaze}, attireReplacement>=${floors.attire}, edge>=${floors.edge}, realism>=${floors.realism}, physics>=${floors.physics}, sceneAdherence>=${floors.scene}, poseAdherence>=${floors.pose}.`,
    variant === 'safe'
      ? '- Safe variant: preserve the same identity and edge mood with stronger boundary stability.'
      : '- Primary variant: maximize edge and realism simultaneously while remaining non-explicit.',
    '- Keep lens-locked gaze: both irises fully visible, plausible vergence, and coherent catchlight placement.',
    '- Keep strict two-piece topology: explicit top/skirt split with visible waist separation and non-random slit mechanics.',
    '- Enforce multi-surface realism closure across skin, fabric, glass, metal, and floor reflections in one shared lighting model.',
    '- Enforce three causal contact closures: hand-to-surface, garment-to-skin pressure transitions, and heel-to-floor compression.',
    '- For complex scenes (mirror, smoke, rain, reflective metal), maintain geometry-consistent reflections/refractions/haze depth.',
    '',
    'Fail if:',
    '- any goal falls visibly below target intent;',
    '- gaze drifts off-lens;',
    '- outfit topology collapses to one-piece;',
    '- realism or physics rely on texture-only fakery.'
  ].join('\n');
}

function buildIdentityOnlyAttireReplacementLock(variant) {
  return [
    'REFERENCE INTERPRETATION LOCK (HARD):',
    '- Use the reference image only for identity, facial geometry, body proportions, and natural skin/hair cues.',
    '- Do not preserve or copy source outfit, source pose, or source background from the reference image.',
    '',
    'WARDROBE REPLACEMENT LOCK (HARD):',
    variant === 'safe'
      ? '- Render the safe cocktail variant only, but still replace all source clothing completely.'
      : '- Render the primary cocktail variant only, and replace all source clothing completely.',
    '- Forbidden carryover from reference: casual tops, tanks/tees, denim jeans, streetwear silhouettes, original reference clothing color/material blocks.',
    '- Output must show a clearly transformed nightlife editorial wardrobe with coherent cocktail silhouette and visible hosiery physics.',
    '',
    'FAIL CONDITION:',
    '- If source/reference clothing appears in final output, treat result as invalid and regenerate with stricter garment replacement.'
  ].join('\n');
}

function buildSceneDirectorBlueprint(promptId, promptTitle, variant) {
  if (!SCENE_DIRECTOR_BLUEPRINT_MODE) {
    return '';
  }
  const id = String(promptId || '').padStart(2, '0');
  const blueprints = {
    '01': {
      signature: 'Emerald banquette dominance with luxury lounge tension.',
      wardrobe: 'liquid-emerald asym crop + razor-slit skirt + black thigh-high sheers + patent stilettos',
      pose: 'seated edge pose with crossed-leg torque and one hand on lamp-side table edge',
      light: 'warm practical lamp key, cool cyan rim, dense emerald bounce',
      camera: 'full body 4:5, eye-level to slight low angle, 50mm look'
    },
    '02': {
      signature: 'Piano-side control with performer authority.',
      wardrobe: 'black velvet corseted crop + burgundy slit skirt + black sheers + lacquer heels',
      pose: 'hip-to-piano lean with weighted hand pressure on keybed rim',
      light: 'candle-warm key with narrow rim on hair and shoulder',
      camera: 'full body 4:5, three-quarter angle, 45-55mm look'
    },
    '03': {
      signature: 'Roulette-table power stance and casino momentum.',
      wardrobe: 'jet-black sequin cutout crop + crimson slit skirt + black sheers + sharp pumps',
      pose: 'rail-contact stance with torso twist toward lens and long-leg projection',
      light: 'warm practical pools with green-felt bounce and crisp specular control',
      camera: 'full body 4:5, slight diagonal framing, 50mm look'
    },
    '04': {
      signature: 'Onyx-atrium architectural silhouette read.',
      wardrobe: 'graphite metallic crop + smoke-silver slit skirt + black sheers + pointed patent heels',
      pose: 'forward-step stride with shoulder-pelvis counter-rotation',
      light: 'warm sconces + cool side-rim for column depth separation',
      camera: 'full body 4:5, long-axis architectural framing'
    },
    '05': {
      signature: 'Vault-door mechanical glamour with metal pressure cues.',
      wardrobe: 'gunmetal structured crop + black satin slit skirt + black sheers + mirrored stilettos',
      pose: 'one-hand vault-wheel grip with controlled torso twist',
      light: 'amber tungsten key with steel-blue bounce on metal surfaces',
      camera: 'full body 4:5, hero-prop-forward composition'
    },
    '06': {
      signature: 'Backbar caustic elegance and glass/metal precision.',
      wardrobe: 'black mesh-bonded crop + charcoal-silver slit skirt + black sheers + chrome heels',
      pose: 'bar-lean compression pose with hip-offset line',
      light: 'warm pendant key with reflective backbar accents and glass caustics',
      camera: 'full body 4:5, bar-depth perspective with clear subject isolation'
    },
    '07': {
      signature: 'Rain-alley noir with wet-surface drama.',
      wardrobe: 'black coated halter crop + matching slit pencil skirt + black sheers + black pumps',
      pose: 'forward stride in wet alley with doorway-hand contact',
      light: 'warm doorway key plus cool neon spill on wet cobblestones',
      camera: 'full body 4:5, street-depth vanishing lines'
    },
    '08': {
      signature: 'Wine-cellar runway cadence in narrow corridor.',
      wardrobe: 'deep-burgundy lace-structured crop + matching satin slit skirt + black sheers + burgundy stilettos',
      pose: 'walk-in approach with hip-led motion and lifted posture',
      light: 'warm bottle-backlight and low cool fill for depth layering',
      camera: 'full body 4:5, corridor perspective compression'
    },
    '09': {
      signature: 'Cigar-lounge smoke layering with velvet richness.',
      wardrobe: 'midnight-plum velvet crop + black satin slit skirt + black sheers + plum heels',
      pose: 'chair-edge seated pose with one knee elevated for line separation',
      light: 'warm table-lamp key with controlled haze bloom and shadow carve',
      camera: 'full body 4:5, intimate lounge framing with smoke depth planes'
    },
    '10': {
      signature: 'Rooftop crosswind tension and skyline confidence.',
      wardrobe: 'champagne metallic crop + matching slit skirt + black sheers + metallic stilettos',
      pose: 'standing rail-contact pose with wind-reactive hair and hem response',
      light: 'city practicals + cool night ambient with warm skin key',
      camera: 'full body 4:5, skyline backplate prominence'
    },
    '11': {
      signature: 'Stage-edge resonance with performer control.',
      wardrobe: 'black structured crop + deep-red slit skirt + black sheers + stage-ready pumps',
      pose: 'stage-front stance with one hand near stand or riser anchor',
      light: 'warm spot key with cool back haze and controlled flare',
      camera: 'full body 4:5, subtle low-angle performer framing'
    },
    '12': {
      signature: 'Mirror-corridor multiplicity with hard reflection discipline.',
      wardrobe: 'silver reflective crop + charcoal slit skirt + black sheers + mirror-finish heels',
      pose: 'centerline stance with angular shoulder line to reflection planes',
      light: 'high-contrast practicals with reflection-consistent shadow logic',
      camera: 'full body 4:5, mirror-axis alignment'
    },
    '13': {
      signature: 'Stairwell kinetic load and vertical geometry.',
      wardrobe: 'black satin halter crop + graphite slit skirt + black sheers + pointed heels',
      pose: 'mid-step stair pose with clear load transfer into front foot',
      light: 'top practical key and side fill for riser depth',
      camera: 'full body 4:5, vertical ascent composition'
    },
    '14': {
      signature: 'Elevator brass modern noir minimalism.',
      wardrobe: 'gunmetal wrap crop + black slit skirt + black sheers + metallic heels',
      pose: 'doorframe-supported stance with one arm on brass rail',
      light: 'warm brass reflections with controlled cool edge-light',
      camera: 'full body 4:5, tight architectural symmetry'
    },
    '15': {
      signature: 'Neon booth refraction and saturated nightlife gloss.',
      wardrobe: 'black sparkle crop + jewel-tone slit skirt + black sheers + glitter pumps',
      pose: 'booth-edge lean with confident lens-forward posture',
      light: 'multi-neon practicals balanced by warm face key',
      camera: 'full body 4:5, booth lines framing subject'
    },
    '16': {
      signature: 'Record-room diffusion with analog texture richness.',
      wardrobe: 'plum velvet crop + black slit skirt + black sheers + tonal heels',
      pose: 'aisle stance with one hand to shelf edge and hip-offset line',
      light: 'warm tungsten shelf pools with soft atmospheric falloff',
      camera: 'full body 4:5, aisle depth compression'
    },
    '17': {
      signature: 'Craps-rail momentum and crowd-energy framing.',
      wardrobe: 'black beaded crop + red slit skirt + black sheers + black stilettos',
      pose: 'rail-adjacent angular stance with dynamic shoulder lead',
      light: 'casino practical highlights with warm skin priority',
      camera: 'full body 4:5, table-edge perspective'
    },
    '18': {
      signature: 'Library-annex tension between classic and daring.',
      wardrobe: 'forest-satin one-shoulder crop + matching slit skirt + black sheers + patent heels',
      pose: 'bookcase-side pose with elevated chin and long-leg extension',
      light: 'warm lamp pools with cooler shelf-depth falloff',
      camera: 'full body 4:5, literary architecture emphasis'
    },
    '19': {
      signature: 'Backbar prism pressure with reflective depth control.',
      wardrobe: 'silver prism-texture crop + black slit skirt + black sheers + mirrored heels',
      pose: 'bar-corner stance with hand-contact compression on counter edge',
      light: 'warm bar key + colored reflective accents with strict consistency',
      camera: 'full body 4:5, reflective-surface orchestration'
    },
    '20': {
      signature: 'Doorway vector coda with exit-scene authority.',
      wardrobe: 'deep-garnet structured crop + matching slit skirt + black sheers + garnet heels',
      pose: 'doorway transition stride with rear-foot push-off clarity',
      light: 'warm doorway key and cool ambient edge for final-scene contrast',
      camera: 'full body 4:5, doorway framing with forward motion intent'
    }
  };
  const blueprint = blueprints[id];
  if (!blueprint) {
    return '';
  }
  const variantConstraint = variant === 'safe'
    ? 'Safe mode: keep same scene identity and silhouette family with controlled cut depth and stable boundaries.'
    : 'Primary mode: maximize daring editorial intensity within non-explicit constraints.';
  return [
    `SCENE DIRECTOR BLUEPRINT (PROMPT ${id} - ${promptTitle || 'Untitled'}):`,
    variantConstraint,
    `Signature mood: ${blueprint.signature}`,
    `Wardrobe archetype: ${blueprint.wardrobe}`,
    `Pose choreography: ${blueprint.pose}`,
    `Lighting recipe: ${blueprint.light}`,
    `Camera grammar: ${blueprint.camera}`,
    'Do not reuse a generic look from other prompts; this frame must read as a distinct scene identity.'
  ].join('\n');
}

function buildEditorialEdgeRebuildCore(variant) {
  const minFeatureCount = variant === 'safe'
    ? Math.max(3, DARING_EDITORIAL_FEATURE_COUNT_MIN - 1)
    : Math.max(4, DARING_EDITORIAL_FEATURE_COUNT_MIN);
  const variantMode = variant === 'safe'
    ? 'Safe mode: keep coverage-critical boundaries stable while maintaining clearly daring nightlife editorial styling.'
    : 'Primary mode: push revealing editorial intensity to the edge of non-explicit fashion.'
  return [
    'EDITORIAL EDGE REBUILD CORE (HIGHEST PRIORITY):',
    variantMode,
    '- Do not generate conservative, casual, or office-like styling.',
    '- Keep the outfit explicitly high-fashion nightlife: bold cut geometry, body-skimming fit, and strong leg-line projection.',
    '- Maintain two-piece topology with unmistakable top/skirt separation and slit-driven silhouette dynamics.',
    '- Ensure daring cues are visually obvious in final framing: side-waist architecture and upper-thigh line must read clearly.',
    `- Include at least ${minFeatureCount} daring features in final wardrobe: high-cut leg line, deep side-waist cut, open-back/low-back framing, sheer panel layering, aggressive slit geometry, structured corset contouring.`,
    '- Keep lens-locked gaze and assertive pose attitude; no passive or timid styling.',
    '- Use hard contour lighting with crisp rim separation and high-contrast specular shape to emphasize silhouette edge.',
    '',
    'EDGE FAILURE CONDITIONS:',
    '- If wardrobe reads restrained/conservative, or daring features are missing, treat output as invalid and regenerate.',
    '- If silhouette collapses toward generic cocktail look, regenerate with stronger cut architecture and higher tension mapping.'
  ].join('\n');
}

function collectPromptAnchorBullets(promptText) {
  const lines = String(promptText || '')
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean);
  const buckets = {
    scene: [],
    wardrobe: [],
    pose: []
  };
  const headingMatchers = {
    scene: /^(scene(?:\s+lock)?|setting(?:\s+lock)?)\s*:/i,
    wardrobe: /^(wardrobe(?:\s+lock)?|attire(?:\s+lock)?)\s*:/i,
    pose: /^(pose(?:\s+and\s+(?:framing|composition))?(?:\s+lock)?)\s*:/i
  };
  let activeKey = '';
  for (const line of lines) {
    if (headingMatchers.scene.test(line)) {
      activeKey = 'scene';
      continue;
    }
    if (headingMatchers.wardrobe.test(line)) {
      activeKey = 'wardrobe';
      continue;
    }
    if (headingMatchers.pose.test(line)) {
      activeKey = 'pose';
      continue;
    }
    if (/^[A-Za-z][A-Za-z0-9\s\-+/()]{2,40}:\s*$/i.test(line)) {
      activeKey = '';
      continue;
    }
    if (!activeKey) {
      continue;
    }
    const normalized = line.startsWith('- ') ? line.slice(2).trim() : line.trim();
    if (!normalized) {
      continue;
    }
    buckets[activeKey].push(normalized);
  }
  return {
    scene: buckets.scene.slice(0, 4),
    wardrobe: buckets.wardrobe.slice(0, 4),
    pose: buckets.pose.slice(0, 5)
  };
}

function buildPrimaryAnchorTransferBlock(primaryPromptText) {
  const anchors = collectPromptAnchorBullets(primaryPromptText);
  const lines = [
    'PRIMARY ANCHOR TRANSFER (SAFE FIDELITY BRIDGE):',
    '- Use these anchors to preserve scene and pose fidelity while keeping policy-safe wording.'
  ];
  if (anchors.scene.length) {
    lines.push('Scene anchors to preserve:');
    lines.push(...anchors.scene.map(item => `- ${item}`));
  }
  if (anchors.wardrobe.length) {
    lines.push('Wardrobe topology anchors to preserve:');
    lines.push(...anchors.wardrobe.map(item => `- ${item}`));
  }
  if (anchors.pose.length) {
    lines.push('Pose choreography anchors to preserve:');
    lines.push(...anchors.pose.map(item => `- ${item}`));
  }
  lines.push('- Keep final styling high-fashion, non-explicit, and physically coherent.');
  return lines.join('\n');
}

function buildPromptDirectionSupremacyBlock(promptText, promptMeta = {}, variant = 'primary') {
  if (!PROMPT_DIRECTION_SUPREMACY_MODE) {
    return '';
  }
  const anchors = collectPromptAnchorBullets(promptText);
  const variantLine = variant === 'safe'
    ? 'Safe variant: keep the same scene/pose anchors and wardrobe topology with safer coverage boundaries.'
    : 'Primary variant: keep the same scene/pose anchors while maximizing non-explicit editorial intensity.';
  const titleLine = promptMeta?.title
    ? `Prompt title anchor: ${promptMeta.title}`
    : 'Prompt title anchor: current prompt section';
  const section = [
    'PROMPT DIRECTION SUPREMACY (FINAL AUTHORITY):',
    'If any global lock conflicts with prompt-specific scene/wardrobe/pose anchors, follow the prompt anchors.',
    titleLine,
    variantLine,
    'Setting invariant: private intimate luxury suite only; never generic public venue substitution.',
    variant === 'safe'
      ? 'Wardrobe invariant: high-fashion two-piece lace cocktail-set topology (not conservative evening wear), with clear top/skirt separation.'
      : 'Wardrobe invariant: sexy two-piece lace "evening-gown" attire (not conservative evening wear), with clear top/skirt separation.',
    'Anti-template invariant: do not reuse a generic pose or styling template from other prompts.'
  ];
  if (anchors.scene.length) {
    section.push('Scene anchors (must remain visible):');
    section.push(...anchors.scene.map(item => `- ${item}`));
  }
  if (anchors.wardrobe.length) {
    section.push('Wardrobe anchors (must remain visible):');
    section.push(...anchors.wardrobe.map(item => `- ${item}`));
  }
  if (anchors.pose.length) {
    section.push('Pose anchors (must remain visible):');
    section.push(...anchors.pose.map(item => `- ${item}`));
  }
  return section.join('\n');
}

function buildSafePolicyGuardrailBlock() {
  return [
    'POLICY-SAFE FASHION GUARDRAILS (SAFE VARIANT, MANDATORY):',
    '- Keep the subject clearly adult and fully non-explicit.',
    '- Keep high-fashion editorial tone, never explicit sexual framing.',
    '- Favor elegant cocktail styling language over provocative wording.',
    '- Keep camera-facing confidence and couture detail while maintaining compliant coverage.',
    '- Keep identity lock, scene lock, and photoreal microphysics lock unchanged.'
  ].join('\n');
}

const SAFE_LEXICON_REPLACEMENTS = [
  { pattern: /\bsexy\b/gi, replacement: 'high-fashion' },
  { pattern: /\bseductive\b/gi, replacement: 'confident' },
  { pattern: /\bprovocative\b/gi, replacement: 'assertive' },
  { pattern: /\brevealing\b/gi, replacement: 'bold' },
  { pattern: /\bskin-forward\b/gi, replacement: 'contour-forward' },
  { pattern: /thigh-high hosiery/gi, replacement: 'sheer black stockings' },
  { pattern: /intimate luxury-suite/gi, replacement: 'private luxury-suite' },
  { pattern: /sexy editorial mood/gi, replacement: 'high-fashion editorial mood' },
  { pattern: /sexy attire/gi, replacement: 'fashion-forward attire' }
];

function applySafePolicyHardening(promptText, variant) {
  if (!SAFE_POLICY_HARDENING || variant !== 'safe') {
    return promptText;
  }
  let hardened = String(promptText || '');
  for (const { pattern, replacement } of SAFE_LEXICON_REPLACEMENTS) {
    hardened = hardened.replace(pattern, replacement);
  }
  return `${hardened.trim()}\n\n${buildSafePolicyGuardrailBlock()}`;
}

function buildResearchMicrodetailFoundationBlock(variant, promptMeta = {}) {
  const titleLine = promptMeta?.title
    ? `Prompt anchor: ${promptMeta.title}`
    : 'Prompt anchor: current section title';
  const variantLine = variant === 'safe'
    ? 'Safe variant strategy: preserve couture impact with policy-safe wording and compliant coverage geometry.'
    : 'Primary variant strategy: maximize couture impact and photorealism while remaining non-explicit.';
  return [
    'RESEARCH-INFORMED MICRO-DETAIL STACK (GENERATION PROGRAM):',
    titleLine,
    variantLine,
    'Use a staged generation plan inspired by recent multimodal research trends:',
    '1) Layout-first planning: lock scene graph, support contacts, and camera-object geometry before texture detail.',
    '2) Identity-first rendering: preserve craniofacial geometry, eye spacing, smile asymmetry, and hairline continuity before wardrobe stylization.',
    '3) Pose-dynamics solve: enforce load-bearing contacts, center-of-mass plausibility, and torsion-driven fabric response.',
    '4) Material-physics solve: model cloth strain fields, seam tension, drape directionality, and friction locks at body/garment boundaries.',
    '5) Light-transport solve: maintain key/rim/fill consistency, physically plausible cast shadows, and coherent specular flow across skin, fabric, and metal.',
    '6) Sensor realism solve: emulate camera pipeline cues (micro-contrast, realistic noise floor, depth falloff, highlight rolloff) rather than synthetic over-smoothing.',
    '',
    'Prompting approach (new technique synthesis):',
    '- Constraint lattice prompting: express each requirement as a measurable invariant with explicit fail conditions.',
    '- Causal chain prompting: for every visual claim, bind cause to effect (pose -> tension -> fold -> shadow).',
    '- Micro-cue density prompting: require multiple independent realism cues per critical region (face, hands, slit edge, hosiery band, ankle, heel-floor contact).',
    '- Counterfactual rejection prompting: explicitly reject known synthetic artifacts and conservative template regressions.',
    '- Anchor persistence prompting: reassert scene hero props, wardrobe topology, and pose choreography at the end of the prompt to prevent drift.',
    '',
    'Human-perception quality gates:',
    '- Prioritize facial believability, eye contact integrity, hand anatomy, and contact-shadow attachment.',
    '- Avoid CGI signatures: waxy skin, tiled textures, detached speculars, edge halos, and implausible fold fields.',
    '- Preserve physically plausible asymmetry: tiny left/right differences in expression, hair strands, and fabric micro-folds.',
    '',
    'Output objective:',
    '- Deliver premium editorial photorealism with stable identity, coherent physics, and prompt-faithful scene execution.',
    '- Keep the result visibly distinct per prompt title; do not collapse to a repeated template composition.'
  ].join('\n');
}

function buildResearchMicrodetailModules(variant, promptMeta = {}) {
  const promptAnchor = promptMeta?.title || 'prompt title';
  const coverageCue = variant === 'safe'
    ? 'Maintain policy-safe coverage while preserving contour clarity and couture readability.'
    : 'Push contour definition and silhouette intensity while remaining non-explicit.';
  return [
    [
      'MICRO-DETAIL MODULE A: FACE, EYES, AND IDENTITY STABILITY',
      '- Keep iris geometry round and stable, with coherent corneal highlights from the dominant key light.',
      '- Preserve eyelid thickness, lash direction, and subtle brow asymmetry for natural expression.',
      '- Preserve nasolabial shape, philtrum depth, and tooth/lip contact geometry during smile expression.',
      '- Preserve skin microstructure variation across forehead, cheeks, nose bridge, and jawline.',
      '- Keep hair-part direction, flyaway distribution, and strand clumping physically plausible.',
      '- Reject face drift, age drift, and ethnicity drift across lighting/viewpoint changes.',
      coverageCue
    ].join('\n'),
    [
      'MICRO-DETAIL MODULE B: GARMENT TOPOLOGY AND STRAIN FIELDS',
      '- Preserve explicit two-piece topology and clear waist separation under all pose changes.',
      '- Enforce seam continuity, stitch direction, and tension gradients near high-strain regions.',
      '- Map fold hierarchy from macro drape to micro creases; avoid random fold inversions.',
      '- At slit boundaries, show pressure transitions, controlled opening mechanics, and coherent shadow pockets.',
      '- For stockings/hosiery, model denier-dependent translucency, band compression gradients, and angle-dependent sheen.',
      '- Keep material response consistent with satin/lace/mesh optics and local curvature.',
      '- Reject texture smear, clipping, and cloth-body interpenetration.'
    ].join('\n'),
    [
      'MICRO-DETAIL MODULE C: KINEMATICS, CONTACTS, AND BALANCE',
      '- Show one explicit support contact with visible compression and force direction.',
      '- Align pelvis-shoulder counter-rotation with leg projection and hand placement intent.',
      '- Keep weight-bearing foot mechanics credible: heel load path, toe-box angle, and ankle tension cues.',
      '- Keep fingers anatomically consistent: joint lengths, natural bends, and believable tendon hints.',
      '- Preserve center-of-mass plausibility relative to support polygon.',
      '- Reject floating footwear, impossible balance, and disconnected limb trajectories.',
      `- Keep choreography specific to "${promptAnchor}", not a generic fallback stance.`
    ].join('\n'),
    [
      'MICRO-DETAIL MODULE D: LIGHTING, SHADOWS, AND REFLECTIONS',
      '- Maintain single coherent key-light direction with plausible fill and rim contributions.',
      '- Keep cast shadows attached to contact points with physically valid softness gradients.',
      '- Keep reflection geometry coherent on marble, glass, lacquer, and metallic props.',
      '- Preserve specular anisotropy where material demands it (satin, polished leather, brushed metal).',
      '- Maintain plausible exposure: recoverable highlights and non-crushed shadow detail.',
      '- Reject mismatched shadow vectors, mirror-space errors, and over-processed glow artifacts.'
    ].join('\n'),
    [
      'MICRO-DETAIL MODULE E: CAMERA PIPELINE REALISM',
      '- Emulate real-lens depth behavior: subject-priority sharpness and physically plausible falloff.',
      '- Keep grain/noise subtle and sensor-like, not uniform synthetic dithering.',
      '- Maintain natural skin tone transitions under mixed warm/cool practicals.',
      '- Preserve micro-contrast on textiles and edges without artificial sharpening halos.',
      '- Keep chromatic behavior physically plausible; avoid rainbow fringing and plastic color clipping.',
      '- Reject over-smoothed skin, over-denoised textures, and flat dynamic range.'
    ].join('\n'),
    [
      'MICRO-DETAIL MODULE F: FAILURE-MODE FIREWALL',
      '- Reject conservative wardrobe downgrade, merged garments, or topology collapse into one-piece styling.',
      '- Reject scene drift away from private luxury-suite anchors and hero props.',
      '- Reject pose drift that removes support contact, torsion, expressive hand action, or leg-line mechanic.',
      '- Reject synthetic signatures: repeated pore maps, mirrored asymmetry artifacts, detached contact shadows.',
      '- Reject geometry defects: fused digits, twisted ankles, broken perspective, and floating objects.',
      '- If any hard rejection is detected, re-solve from scene graph and kinematics before texture refinement.'
    ].join('\n')
  ];
}

function enforcePromptWordTarget(promptText, variant, promptMeta = {}) {
  if (!ENABLE_RESEARCH_MICRODETAIL_EXPANSION) {
    return promptText;
  }
  let expanded = String(promptText || '').trim();
  if (!expanded) {
    return expanded;
  }

  expanded = `${expanded}\n\n${buildResearchMicrodetailFoundationBlock(variant, promptMeta)}`;
  if (countWords(expanded) >= PROMPT_TARGET_WORDS) {
    return expanded;
  }

  const modules = buildResearchMicrodetailModules(variant, promptMeta);
  if (!modules.length) {
    return expanded;
  }

  let pass = 0;
  while (countWords(expanded) < PROMPT_TARGET_WORDS && pass < 4) {
    pass += 1;
    for (const moduleText of modules) {
      const passHeader = pass === 1 ? '' : `\nMICRO-DETAIL REINFORCEMENT PASS ${pass}:\n`;
      expanded = `${expanded}${passHeader}\n${moduleText}`;
      if (countWords(expanded) >= PROMPT_TARGET_WORDS) {
        break;
      }
    }
  }

  return expanded;
}

function applyPromptOverrides(promptText, variant, promptMeta = {}) {
  const sceneDirectorBlueprint = buildSceneDirectorBlueprint(promptMeta.promptId, promptMeta.title, variant);
  if (EDITORIAL_EDGE_REBUILD_MODE) {
    const rebuilt = [];
    if (sceneDirectorBlueprint) {
      rebuilt.push(sceneDirectorBlueprint);
    } else if (promptMeta?.title) {
      rebuilt.push([
        'SCENE DIRECTOR FALLBACK (TITLE-DERIVED):',
        `Distinct scene identity: ${promptMeta.title}.`,
        'Do not collapse to a generic lounge render; preserve the title-defined setting, mood, and framing intent.'
      ].join('\n'));
    }
    rebuilt.push(buildEditorialEdgeRebuildCore(variant));
    if (DARING_EDITORIAL_MODE) {
      rebuilt.push(buildDaringEditorialBlock(variant, DARING_EDITORIAL_LEVEL));
    }
    if (SENSUAL_VARIANCE_GUARD) {
      const sensualVarianceBlock = buildSensualVarianceBlock(variant, SENSUAL_VARIANCE_LEVEL, promptMeta);
      if (sensualVarianceBlock) {
        rebuilt.push(sensualVarianceBlock);
      }
    }
    if (ENABLE_IDENTITY_SUPREMACY_LOCK) {
      rebuilt.push(buildIdentitySupremacyBlock(variant, IDENTITY_SUPREMACY_LEVEL));
    }
    if (REFERENCE_IDENTITY_ONLY_LOCK || ATTIRE_REPLACEMENT_LOCK) {
      rebuilt.push(buildIdentityOnlyAttireReplacementLock(variant));
    }
    if (PHYSICS_REALISM_PROMPT_HARD_MODE && PHYSICS_REALISM_PRIORITY_MULTIPLIER >= 2) {
      rebuilt.push(buildPhysicsRealismPriorityBlock(
        variant,
        PHYSICS_REALISM_PRIORITY_MULTIPLIER,
        PHYSICS_REALISM_PROMPT_DENSITY
      ));
    }
    if (DIRECT_CAMERA_GAZE_OVERRIDE) {
      rebuilt.push(buildDirectGazeRealismBlock(variant, PHYSICS_REALISM_OVERRIDE_LEVEL));
    }
    if (promptText?.trim()) {
      rebuilt.push([
        'PROMPT-SPECIFIC DIRECTIVES (MANDATORY):',
        promptText.trim()
      ].join('\n'));
    }
    const directionSupremacy = buildPromptDirectionSupremacyBlock(promptText, promptMeta, variant);
    if (directionSupremacy) {
      rebuilt.push(directionSupremacy);
    }
    let rebuiltPrompt = rebuilt.join('\n\n');
    rebuiltPrompt = applySafePolicyHardening(rebuiltPrompt, variant);
    rebuiltPrompt = enforcePromptWordTarget(rebuiltPrompt, variant, promptMeta);
    return rebuiltPrompt;
  }

  let updated = promptText.trim();
  if (PROMPT_FIRST_PRIORITY_MODE) {
    if (ENABLE_IDENTITY_SUPREMACY_LOCK) {
      updated = `${updated}\n\n${buildIdentitySupremacyBlock(variant, IDENTITY_SUPREMACY_LEVEL)}`;
    }
    if (PHYSICS_REALISM_PROMPT_HARD_MODE && PHYSICS_REALISM_PRIORITY_MULTIPLIER >= 2) {
      updated = `${updated}\n\n${buildPhysicsRealismPriorityBlock(
        variant,
        PHYSICS_REALISM_PRIORITY_MULTIPLIER,
        PHYSICS_REALISM_PROMPT_DENSITY
      )}`;
    }
    if (DARING_EDITORIAL_MODE) {
      updated = `${updated}\n\n${buildDaringEditorialBlock(variant, DARING_EDITORIAL_LEVEL)}`;
    }
    if (REFERENCE_IDENTITY_ONLY_LOCK || ATTIRE_REPLACEMENT_LOCK) {
      updated = `${updated}\n\n${buildIdentityOnlyAttireReplacementLock(variant)}`;
    }
  } else {
    if (ENABLE_IDENTITY_SUPREMACY_LOCK) {
      updated = `${buildIdentitySupremacyBlock(variant, IDENTITY_SUPREMACY_LEVEL)}\n\n${updated}`;
    }
    if (PHYSICS_REALISM_PROMPT_HARD_MODE && PHYSICS_REALISM_PRIORITY_MULTIPLIER >= 2) {
      updated = `${buildPhysicsRealismPriorityBlock(
        variant,
        PHYSICS_REALISM_PRIORITY_MULTIPLIER,
        PHYSICS_REALISM_PROMPT_DENSITY
      )}\n\n${updated}`;
    }
    if (DARING_EDITORIAL_MODE) {
      updated = `${buildDaringEditorialBlock(variant, DARING_EDITORIAL_LEVEL)}\n\n${updated}`;
    }
    if (REFERENCE_IDENTITY_ONLY_LOCK || ATTIRE_REPLACEMENT_LOCK) {
      updated = `${buildIdentityOnlyAttireReplacementLock(variant)}\n\n${updated}`;
    }
  }
  if (ENABLE_FORENSIC_REALISM_TARGET) {
    updated = `${updated.trim()}\n\n${buildForensicRealismTargetBlock(FORENSIC_REALISM_TARGET_LEVEL)}`;
  }
  if (ENABLE_GOAL_MAXIMIZER) {
    updated = `${updated.trim()}\n\n${buildGoalMaximizerBlock(variant, GOAL_MAXIMIZER_LEVEL)}`;
  }
  updated = applyAttireBoost(updated, variant);
  if (SKIN_FORWARD_STYLING) {
    updated = `${updated.trim()}\n\n${buildSkinForwardEditorialBlock(variant, SKIN_FORWARD_LEVEL)}`;
  }
  if (SENSUAL_EDITORIAL_BOOST) {
    updated = `${updated.trim()}\n\n${buildSensualEditorialBlock(variant, SENSUAL_EDITORIAL_LEVEL)}`;
  }
  if (SENSUAL_VARIANCE_GUARD) {
    const sensualVarianceBlock = buildSensualVarianceBlock(variant, SENSUAL_VARIANCE_LEVEL, promptMeta);
    if (sensualVarianceBlock) {
      updated = `${updated.trim()}\n\n${sensualVarianceBlock}`;
    }
  }
  if (DIRECT_CAMERA_GAZE_OVERRIDE) {
    updated = `${updated.trim()}\n\n${buildDirectGazeRealismBlock(variant, PHYSICS_REALISM_OVERRIDE_LEVEL)}`;
  }
  if (ANTI_AI_REALISM_BOOST) {
    updated = `${updated.trim()}\n\n${buildAntiAiRealismBlock(ANTI_AI_REALISM_LEVEL)}`;
  }
  if (ENABLE_MICRO_PHYSICS_SOLVER) {
    updated = `${updated.trim()}\n\n${buildMicroPhysicsSolverBlock(variant, MICRO_PHYSICS_SOLVER_LEVEL)}`;
  }
  const shouldApplyFrontier = ENABLE_FRONTIER_PROTOCOL && (!ENABLE_MICRO_PHYSICS_SOLVER || FRONTIER_WITH_SOLVER);
  if (shouldApplyFrontier) {
    const frontierProtocol = buildFrontierPhysicsProtocolBlock(variant);
    if (frontierProtocol) {
      updated = `${updated.trim()}\n\n${frontierProtocol}`;
    }
  }
  if (ENABLE_REVOLUTIONARY_PHYSICS_KERNEL) {
    updated = `${updated.trim()}\n\n${buildRevolutionaryPhysicsKernelBlock(variant, REVOLUTIONARY_PHYSICS_KERNEL_LEVEL)}`;
  }
  if (ENABLE_HYPER_MICRO_DETAIL) {
    updated = `${updated.trim()}\n\n${buildHyperMicroDetailBlock(variant, HYPER_MICRO_DETAIL_LEVEL)}`;
  }
  if (sceneDirectorBlueprint) {
    updated = `${sceneDirectorBlueprint}\n\n${updated.trim()}`;
  }
  const directionSupremacy = buildPromptDirectionSupremacyBlock(promptText, promptMeta, variant);
  if (directionSupremacy) {
    updated = `${updated.trim()}\n\n${directionSupremacy}`;
  }
  updated = applySafePolicyHardening(updated, variant);
  updated = enforcePromptWordTarget(updated, variant, promptMeta);
  return updated;
}

function applyPromptNonce(promptText, meta) {
  if (!PROMPT_NONCE_ENABLED) {
    return promptText;
  }
  const nonceBlock = [
    'RUN UNIQUENESS TOKEN (DO NOT RENDER AS TEXT IN SCENE):',
    `token=${meta.runNonce}-${meta.promptId}-${meta.variant}-${meta.attemptIndex}`,
    'Use this token only as generation-uniqueness metadata. Never place token characters on signage, clothing, props, or background surfaces.'
  ].join('\n');
  return `${promptText.trim()}\n\n${nonceBlock}`;
}

function collectTextParts(body) {
  const texts = [];
  for (const candidate of body?.candidates || []) {
    for (const part of candidate?.content?.parts || []) {
      if (typeof part?.text === 'string' && part.text.trim()) {
        texts.push(part.text.trim());
      }
    }
  }
  return texts;
}

function findTextPart(body) {
  const texts = collectTextParts(body);
  if (!texts.length) return null;
  return texts.join('\n').trim() || null;
}

function extractJsonCandidate(text) {
  const raw = String(text || '').trim();
  if (!raw) return '';
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) {
    return fenced[1].trim();
  }
  return raw;
}

function parseLooseJson(text) {
  const candidate = extractJsonCandidate(text);
  if (!candidate) return null;
  try {
    return JSON.parse(candidate);
  } catch {
    const start = candidate.indexOf('{');
    const end = candidate.lastIndexOf('}');
    if (start !== -1 && end > start) {
      try {
        return JSON.parse(candidate.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

function extractRegexNumber(text, patterns) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      const score = toScore(match[1]);
      if (score !== null) {
        return score;
      }
    }
  }
  return null;
}

function parseHeuristicQualityPayload(text, minFields = SCORER_HEURISTIC_MIN_FIELDS) {
  const raw = String(text || '');
  if (!raw.trim()) {
    return null;
  }

  const scores = {
    identity: extractRegexNumber(raw, [/"identity"\s*:\s*([0-9]+(?:\.[0-9]+)?)/i, /identity\s*[:=]\s*([0-9]+(?:\.[0-9]+)?)/i]),
    gaze: extractRegexNumber(raw, [/"gaze"\s*:\s*([0-9]+(?:\.[0-9]+)?)/i, /direct[_\s-]*camera[_\s-]*gaze\s*[:=]\s*([0-9]+(?:\.[0-9]+)?)/i]),
    attireReplacement: extractRegexNumber(raw, [
      /"attireReplacement"\s*:\s*([0-9]+(?:\.[0-9]+)?)/i,
      /"attire_replacement"\s*:\s*([0-9]+(?:\.[0-9]+)?)/i,
      /attire[_\s-]*replacement\s*[:=]\s*([0-9]+(?:\.[0-9]+)?)/i
    ]),
    edge: extractRegexNumber(raw, [/"edge"\s*:\s*([0-9]+(?:\.[0-9]+)?)/i, /editorial[_\s-]*edge\s*[:=]\s*([0-9]+(?:\.[0-9]+)?)/i]),
    realism: extractRegexNumber(raw, [
      /"realism"\s*:\s*([0-9]+(?:\.[0-9]+)?)/i,
      /"photorealism"\s*:\s*([0-9]+(?:\.[0-9]+)?)/i,
      /photo[_\s-]*realism\s*[:=]\s*([0-9]+(?:\.[0-9]+)?)/i
    ]),
    physics: extractRegexNumber(raw, [/"physics"\s*:\s*([0-9]+(?:\.[0-9]+)?)/i, /physics[_\s-]*consistency\s*[:=]\s*([0-9]+(?:\.[0-9]+)?)/i]),
    sceneAdherence: extractRegexNumber(raw, [
      /"sceneAdherence"\s*:\s*([0-9]+(?:\.[0-9]+)?)/i,
      /"scene_adherence"\s*:\s*([0-9]+(?:\.[0-9]+)?)/i,
      /scene[_\s-]*adherence\s*[:=]\s*([0-9]+(?:\.[0-9]+)?)/i
    ]),
    poseAdherence: extractRegexNumber(raw, [
      /"poseAdherence"\s*:\s*([0-9]+(?:\.[0-9]+)?)/i,
      /"pose_adherence"\s*:\s*([0-9]+(?:\.[0-9]+)?)/i,
      /pose[_\s-]*adherence\s*[:=]\s*([0-9]+(?:\.[0-9]+)?)/i
    ])
  };

  const foundCount = Object.values(scores).filter(value => value !== null).length;
  if (foundCount < minFields) {
    return null;
  }

  const diagnosticsMatch = raw.match(/"diagnostics"\s*:\s*"([\s\S]*?)"/i);
  const confidenceMatch = raw.match(/"confidence"\s*:\s*([0-9]+(?:\.[0-9]+)?)/i);
  const directives = [];
  const directivesBlock = raw.match(/"rescueDirectives"\s*:\s*\[([\s\S]*?)\]/i);
  if (directivesBlock?.[1]) {
    const directiveMatches = directivesBlock[1].match(/"([^"]+)"/g) || [];
    for (const token of directiveMatches) {
      const cleaned = token.replace(/^"|"$/g, '').trim();
      if (cleaned) directives.push(cleaned);
    }
  }

  return {
    scores,
    diagnostics: diagnosticsMatch?.[1]?.trim() || null,
    rescueDirectives: directives.slice(0, 8),
    confidence: confidenceMatch?.[1] ? clamp(Number(confidenceMatch[1]), 0, 1) : 0.5
  };
}

function countParsedScoreFields(payload) {
  const scoreRoot = payload?.scores || payload || {};
  let count = 0;
  for (const aliases of Object.values(SCORE_FIELD_ALIASES)) {
    const matched = aliases.some(alias => toScore(scoreRoot[alias]) !== null);
    if (matched) {
      count += 1;
    }
  }
  return count;
}

function tryParseQualityPayload(text) {
  const parsed = parseLooseJson(text);
  if (parsed) {
    return {
      parsed,
      parser: 'json',
      scoreFieldCount: countParsedScoreFields(parsed)
    };
  }

  const heuristic = parseHeuristicQualityPayload(text, SCORER_HEURISTIC_MIN_FIELDS);
  if (heuristic) {
    return {
      parsed: heuristic,
      parser: 'heuristic',
      scoreFieldCount: countParsedScoreFields(heuristic)
    };
  }

  return null;
}

function buildScorerRepairPrompt({ scorerPrompt, invalidResponseText, attempt }) {
  return [
    'You are repairing invalid/truncated JSON from a visual QA scorer.',
    'Return ONLY one valid compact JSON object with this exact schema:',
    '{"scores":{"identity":0,"gaze":0,"attireReplacement":0,"edge":0,"realism":0,"physics":0,"sceneAdherence":0,"poseAdherence":0},"diagnostics":"max 18 words","rescueDirectives":["max 12 words"],"confidence":0.0}',
    '',
    'Rules:',
    '- Keep all score values numeric in [0,10].',
    '- If any field is missing in the invalid text, infer conservatively from available evidence.',
    '- No markdown, no prose, no code fences.',
    '- Close all braces and brackets.',
    '',
    `Repair attempt: ${attempt}`,
    '',
    'Original scoring prompt context:',
    scorerPrompt,
    '',
    'Invalid/truncated scorer output to repair:',
    '---BEGIN_INVALID_OUTPUT---',
    String(invalidResponseText || '').slice(0, 7000),
    '---END_INVALID_OUTPUT---'
  ].join('\n');
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function qualityDimensionWeights() {
  const baseWeights = {
    identity: 0.24,
    gaze: 0.14,
    attireReplacement: 0.08,
    edge: 0.08,
    realism: 0.14,
    physics: 0.14,
    sceneAdherence: 0.10,
    poseAdherence: 0.08
  };
  return {
    ...baseWeights,
    edge: baseWeights.edge * EDGE_PRIORITY_MULTIPLIER,
    realism: baseWeights.realism * PHYSICS_REALISM_PRIORITY_MULTIPLIER,
    physics: baseWeights.physics * PHYSICS_REALISM_PRIORITY_MULTIPLIER
  };
}

function choiceDimensionWeights() {
  const baseWeights = {
    identity: 0.34,
    gaze: 0.12,
    attireReplacement: 0.10,
    edge: 0.10,
    realism: 0.10,
    physics: 0.10,
    sceneAdherence: 0.08,
    poseAdherence: 0.06
  };
  return {
    ...baseWeights,
    edge: baseWeights.edge * EDGE_PRIORITY_MULTIPLIER,
    realism: baseWeights.realism * PHYSICS_REALISM_PRIORITY_MULTIPLIER,
    physics: baseWeights.physics * PHYSICS_REALISM_PRIORITY_MULTIPLIER
  };
}

function toScore(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string' && !value.trim()) return null;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  return clamp(numeric, 0, 10);
}

function qualityThresholds() {
  return {
    identity: QUALITY_THRESHOLD_IDENTITY,
    gaze: QUALITY_THRESHOLD_GAZE,
    attireReplacement: QUALITY_THRESHOLD_ATTIRE_REPLACEMENT,
    edge: QUALITY_THRESHOLD_EDGE,
    realism: QUALITY_THRESHOLD_REALISM,
    physics: QUALITY_THRESHOLD_PHYSICS,
    sceneAdherence: QUALITY_THRESHOLD_SCENE_ADHERENCE,
    poseAdherence: QUALITY_THRESHOLD_POSE_ADHERENCE
  };
}

function upliftTargets() {
  return {
    overall: UPLIFT_TARGET_OVERALL,
    identity: UPLIFT_TARGET_IDENTITY,
    gaze: UPLIFT_TARGET_GAZE,
    attireReplacement: UPLIFT_TARGET_ATTIRE,
    edge: UPLIFT_TARGET_EDGE,
    realism: UPLIFT_TARGET_REALISM,
    physics: UPLIFT_TARGET_PHYSICS,
    sceneAdherence: UPLIFT_TARGET_SCENE,
    poseAdherence: UPLIFT_TARGET_POSE
  };
}

function collectUpliftDeficiencies(quality) {
  if (!quality?.scorerAvailable || !quality?.pass) {
    return [];
  }
  const targets = upliftTargets();
  const scores = quality.scores || {};
  const deficiencies = [];
  const overall = Number.isFinite(quality.overallScore) ? quality.overallScore : 0;

  if (overall < targets.overall) {
    deficiencies.push(`overall<${targets.overall}`);
  }
  if (clamp(Number(scores.identity) || 0, 0, 10) < targets.identity) {
    deficiencies.push(`identity<${targets.identity}`);
  }
  if (clamp(Number(scores.gaze) || 0, 0, 10) < targets.gaze) {
    deficiencies.push(`gaze<${targets.gaze}`);
  }
  if (clamp(Number(scores.attireReplacement) || 0, 0, 10) < targets.attireReplacement) {
    deficiencies.push(`attireReplacement<${targets.attireReplacement}`);
  }
  if (clamp(Number(scores.edge) || 0, 0, 10) < targets.edge) {
    deficiencies.push(`edge<${targets.edge}`);
  }
  if (clamp(Number(scores.realism) || 0, 0, 10) < targets.realism) {
    deficiencies.push(`realism<${targets.realism}`);
  }
  if (clamp(Number(scores.physics) || 0, 0, 10) < targets.physics) {
    deficiencies.push(`physics<${targets.physics}`);
  }
  if (clamp(Number(scores.sceneAdherence) || 0, 0, 10) < targets.sceneAdherence) {
    deficiencies.push(`sceneAdherence<${targets.sceneAdherence}`);
  }
  if (clamp(Number(scores.poseAdherence) || 0, 0, 10) < targets.poseAdherence) {
    deficiencies.push(`poseAdherence<${targets.poseAdherence}`);
  }
  return deficiencies;
}

function pickFirstScore(source, keys) {
  for (const key of keys) {
    const value = source?.[key];
    const score = toScore(value);
    if (score !== null) {
      return score;
    }
  }
  return null;
}

const PHYSICS_CHECKLIST_KEYS = [
  'supportContact',
  'nonPenetration',
  'gravityDrape',
  'lightShadowGeometry',
  'materialResponse'
];

function parsePhysicsChecklist(value) {
  const root = value && typeof value === 'object' ? value : {};
  const checklist = {};
  let found = 0;
  for (const key of PHYSICS_CHECKLIST_KEYS) {
    const score = toScore(root[key]);
    if (score !== null) {
      checklist[key] = score;
      found += 1;
    }
  }
  return found > 0 ? checklist : null;
}

function findPhysicsChecklistFailures(checklist, minScore = PHYSICS_CHECKLIST_MIN) {
  if (!checklist || typeof checklist !== 'object') {
    return [];
  }
  const failures = [];
  for (const key of PHYSICS_CHECKLIST_KEYS) {
    const value = checklist[key];
    if (Number.isFinite(value) && clamp(value, 0, 10) < minScore) {
      failures.push({ key, score: clamp(value, 0, 10), threshold: minScore });
    }
  }
  return failures;
}

function normalizeRescueDirectives(value) {
  if (Array.isArray(value)) {
    return value
      .map(item => String(item || '').trim())
      .filter(Boolean)
      .slice(0, 12);
  }
  if (typeof value === 'string' && value.trim()) {
    return value
      .split(/\n|;/)
      .map(item => item.replace(/^[-*\s]+/, '').trim())
      .filter(Boolean)
      .slice(0, 12);
  }
  return [];
}

function scoreQuality(qualityScores) {
  const thresholds = qualityThresholds();
  const weights = qualityDimensionWeights();
  const labelMap = {
    identity: 'identity',
    gaze: 'gaze',
    attireReplacement: 'attireReplacement',
    edge: 'edge',
    realism: 'realism',
    physics: 'physics',
    sceneAdherence: 'sceneAdherence',
    poseAdherence: 'poseAdherence'
  };

  const failedDimensions = [];
  let weightedTotal = 0;
  let weightTotal = 0;

  for (const [dimension, threshold] of Object.entries(thresholds)) {
    const score = qualityScores?.[dimension];
    const normalized = Number.isFinite(score) ? clamp(score, 0, 10) : 0;
    if (!Number.isFinite(score) || normalized < threshold) {
      failedDimensions.push({
        key: dimension,
        label: labelMap[dimension],
        score: normalized,
        threshold
      });
    }
    weightedTotal += normalized * weights[dimension];
    weightTotal += weights[dimension];
  }

  const overallScore = weightTotal > 0 ? weightedTotal / weightTotal : 0;
  return {
    pass: failedDimensions.length === 0,
    overallScore,
    failedDimensions
  };
}

function buildQualityScorerPrompt({ promptId, title, variant, promptIntentDigest }) {
  const thresholds = qualityThresholds();
  if (SCORER_COMPACT_PROMPT) {
    return [
      'Strict visual QA. Return ONE compact JSON object only.',
      'Score GENERATED image against REFERENCE identity and prompt intent.',
      'Dimensions (0-10): identity, gaze, attireReplacement, edge, realism, physics, sceneAdherence, poseAdherence.',
      'Checklist (0-10): supportContact, nonPenetration, gravityDrape, lightShadowGeometry, materialResponse.',
      'Hard rules:',
      '- If face mismatch is noticeable, identity <= 8.5.',
      '- Penalize conservative outfit outcomes, scene drift, pose drift, and synthetic artifacts.',
      '- If scene/hero props miss prompt anchors, cap sceneAdherence <= 8.2.',
      '- If body language ignores prompt choreography, cap poseAdherence <= 8.2.',
      '- If any checklist item clearly fails, cap physics <= 8.4 and realism <= 8.8.',
      `Thresholds: identity>=${thresholds.identity}, gaze>=${thresholds.gaze}, attireReplacement>=${thresholds.attireReplacement}, edge>=${thresholds.edge}, realism>=${thresholds.realism}, physics>=${thresholds.physics}, sceneAdherence>=${thresholds.sceneAdherence}, poseAdherence>=${thresholds.poseAdherence}.`,
      `Prompt metadata: id=${promptId}, title=${title}, variant=${variant}.`,
      'Prompt intent digest:',
      promptIntentDigest || '- unavailable',
      'Output keys required: scores, physicsChecklist, diagnostics, rescueDirectives, confidence.',
      'Keep response under 180 tokens.'
    ].join('\n');
  }
  return [
    'You are a strict visual QA evaluator for photoreal editorial portrait generation.',
    'Return ONLY compact JSON. No markdown, no prose outside JSON.',
    'Output exactly one JSON object and always close all braces/brackets.',
    'Never echo schema text. Emit only filled values.',
    '',
    'Evaluate the GENERATED image against the REFERENCE identity and the prompt intent.',
    '',
    'Scoring rubric (0-10, decimals allowed):',
    '- identity: facial identity fidelity vs reference image (person match, not outfit/background).',
    '- gaze: direct camera eye contact quality and plausibility.',
    '- attireReplacement: how fully the generated wardrobe replaces source/reference clothing.',
    '- edge: bold, skin-forward editorial styling impact while remaining non-explicit and fashion-forward.',
    '- realism: looks like real camera photography, not synthetic CGI.',
    '- physics: cloth/pose/lighting/material causality consistency, including stable garment-edge contact on exposed skin.',
    '- sceneAdherence: prompt-specific setting and hero-prop match, including private intimate luxury-suite constraints.',
    '- poseAdherence: prompt-specific pose choreography match (support contact, torsion cue, expressive hand action, leg-line mechanics).',
    '- physicsChecklist: first-principles subscores for supportContact, nonPenetration, gravityDrape, lightShadowGeometry, materialResponse.',
    '',
    'Strict enforcement:',
    '- Identity is highest priority: if face mismatch is noticeable, score identity <= 8.5 and mark fail.',
    `- Physics/realism strictness factor is ${PHYSICS_REALISM_PRIORITY_MULTIPLIER}x; penalize subtle defects in these dimensions aggressively.`,
    '- If identity is below threshold, cap realism and physics at <= 8.9.',
    '- Penalize any age/ethnicity/face-shape drift from the reference identity.',
    '- Penalize scene drift: if location/hero-prop intent is missed, reduce edge and realism scores.',
    '- Penalize conservative wardrobe outcomes: if the look lacks clear revealing editorial cues (high-cut line, side-waist cut, open-back/shoulder, sheer panel, or high slit), cap edge at <= 8.2.',
    '- Penalize pose drift: if prompt-specific support-contact and limb choreography are missing, cap edge at <= 8.1 and physics at <= 8.8.',
    '- Penalize wardrobe drift: if prompt-specific silhouette/cutline details are missing, cap attireReplacement at <= 8.8 and edge at <= 8.2.',
    '- Penalize generic homogenization: if output defaults to a generic neutral stance not matching prompt intent, cap edge at <= 8.0.',
    '- Penalize weak scene match: if prompt-specific suite location and hero props are missing/substituted, cap sceneAdherence at <= 8.2.',
    '- Penalize weak pose match: if support-contact/torsion/expressive-hand/leg-line anchors are absent, cap poseAdherence at <= 8.2.',
    '- Penalize missing micro-cues in critical zones (slit boundary, hosiery band, knee contour, ankle/instep, heel-floor contact).',
    '- First-principles checklist gate: if any checklist item clearly fails, cap physics <= 8.4 and realism <= 8.8.',
    '- Cap realism/physics below 9.0 when textures look smoothed, tiled, or detached from lighting/contact behavior.',
    '',
    `Prompt metadata: id=${promptId}, title=${title}, variant=${variant}`,
    'Prompt intent digest (scene, wardrobe, and pose anchors that must be visible):',
    promptIntentDigest || '- Intent digest unavailable; infer cautiously from metadata.',
    'Thresholds:',
    `- identity >= ${thresholds.identity}`,
    `- gaze >= ${thresholds.gaze}`,
    `- attireReplacement >= ${thresholds.attireReplacement}`,
    `- edge >= ${thresholds.edge}`,
    `- realism >= ${thresholds.realism}`,
    `- physics >= ${thresholds.physics}`,
    `- sceneAdherence >= ${thresholds.sceneAdherence}`,
    `- poseAdherence >= ${thresholds.poseAdherence}`,
    '',
    'Output schema (single object only):',
    '{',
    '  "scores": {',
    '    "identity": 0,',
    '    "gaze": 0,',
    '    "attireReplacement": 0,',
    '    "edge": 0,',
    '    "realism": 0,',
    '    "physics": 0,',
    '    "sceneAdherence": 0,',
    '    "poseAdherence": 0',
    '  },',
    '  "physicsChecklist": {',
    '    "supportContact": 0,',
    '    "nonPenetration": 0,',
    '    "gravityDrape": 0,',
    '    "lightShadowGeometry": 0,',
    '    "materialResponse": 0',
    '  },',
    '  "diagnostics": "max 18 words",',
    '  "rescueDirectives": ["max 12 words", "max 12 words", "max 12 words"],',
    '  "confidence": 0.0',
    '}',
    '',
    'Example valid output:',
    '{"scores":{"identity":9.2,"gaze":9.0,"attireReplacement":9.4,"edge":9.1,"realism":9.0,"physics":9.1,"sceneAdherence":9.2,"poseAdherence":9.1},"physicsChecklist":{"supportContact":9.1,"nonPenetration":9.0,"gravityDrape":9.2,"lightShadowGeometry":8.9,"materialResponse":9.0},"diagnostics":"Strong identity and coherent scene physics.","rescueDirectives":["tighten lens-locked gaze","increase slit-edge pressure cues","reduce synthetic smoothing"],"confidence":0.93}',
    '',
    'Directives must be non-explicit and physics-driven.',
    'Keep total response under 220 tokens.',
    'If uncertain, still emit conservative numeric scores and complete JSON.'
  ].join('\n');
}

async function requestScorerApi({
  accessToken,
  parts,
  maxOutputTokens,
  temperature = 0,
  responseMimeType = 'application/json',
  responseSchema = null
}) {
  const payload = {
    contents: [
      {
        role: 'user',
        parts
      }
    ],
    generationConfig: {
      temperature,
      maxOutputTokens,
      responseMimeType
    }
  };
  if (responseSchema) {
    payload.generationConfig.responseSchema = responseSchema;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let response;
  let responseText = '';
  let responseHeaders = null;

  try {
    response = await fetch(SCORER_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
        ...(HTTP_CACHE_BYPASS
          ? {
              'Cache-Control': 'no-cache, no-store, max-age=0',
              Pragma: 'no-cache'
            }
          : {})
      },
      body: JSON.stringify(payload),
        ...(HTTP_CACHE_BYPASS ? { cache: 'no-store' } : {}),
      signal: controller.signal
    });
    responseHeaders = extractCacheDiagnosticHeaders(response.headers);
    responseText = await response.text();
  } catch (error) {
    return {
      ok: false,
      errorType: 'network',
      message: error instanceof Error ? error.message : String(error),
      responseHeaders
    };
  } finally {
    clearTimeout(timeout);
  }

  let body = null;
  if (responseText) {
    try {
      body = JSON.parse(responseText);
    } catch {
      body = null;
    }
  }

  if (!response.ok) {
    return {
      ok: false,
      errorType: 'http',
      status: response.status,
      statusText: response.statusText,
      responseSnippet: responseText.slice(0, 4000),
      responseHeaders
    };
  }

  return {
    ok: true,
    body,
    responseText,
    responseHeaders
  };
}

async function callScorerModel({ scorerPrompt, referenceInlineData, generatedImagePart }) {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return {
      ok: false,
      errorType: 'auth',
      message: 'Failed to obtain Google access token for scorer'
    };
  }

  const primaryRequest = await requestScorerApi({
    accessToken,
    parts: [
      { text: scorerPrompt },
      { inlineData: referenceInlineData },
      { inlineData: generatedImagePart.inlineData }
    ],
    maxOutputTokens: QUALITY_GATE_MAX_OUTPUT_TOKENS,
    temperature: 0,
    responseSchema: SCORER_FORCE_SCHEMA ? SCORER_RESPONSE_SCHEMA : null
  });

  if (!primaryRequest.ok) {
    return primaryRequest;
  }

  let deferredHeuristic = null;
  let workingText = '';
  const maybeStoreHeuristic = (candidate, rawText, parserName) => {
    if (candidate.parser !== 'heuristic') return null;
    const scoreFieldCount = Number.isFinite(candidate.scoreFieldCount) ? candidate.scoreFieldCount : 0;
    if (scoreFieldCount >= REQUIRED_SCORER_SCORE_FIELDS) {
      return {
        ok: true,
        parsed: candidate.parsed,
        rawText,
        parser: parserName
      };
    }
    if (!deferredHeuristic || scoreFieldCount > deferredHeuristic.scoreFieldCount) {
      deferredHeuristic = {
        parsed: candidate.parsed,
        rawText,
        parser: parserName,
        scoreFieldCount
      };
    }
    return null;
  };

  const resolveParsedFromRequest = (request, parserPrefix = '') => {
    const withPrefix = (parserName) => (parserPrefix ? `${parserPrefix}-${parserName}` : parserName);
    let localWorkingText = '';
    const texts = collectTextParts(request.body);
    for (const text of texts) {
      const parsedCandidate = tryParseQualityPayload(text);
      if (!parsedCandidate) continue;
      if (parsedCandidate.parser === 'json') {
        if ((parsedCandidate.scoreFieldCount || 0) < REQUIRED_SCORER_SCORE_FIELDS) {
          if (!localWorkingText) {
            localWorkingText = text;
          }
          continue;
        }
        return {
          ok: true,
          parsed: parsedCandidate.parsed,
          rawText: text,
          parser: withPrefix('json'),
          responseHeaders: request.responseHeaders || null
        };
      }
      const completeHeuristic = maybeStoreHeuristic(parsedCandidate, text, withPrefix('heuristic'));
      if (completeHeuristic) {
        return {
          ...completeHeuristic,
          responseHeaders: request.responseHeaders || null
        };
      }
    }

    if (!localWorkingText) {
      localWorkingText = texts.join('\n').trim() || request.responseText || '';
    }
    if (localWorkingText) {
      workingText = localWorkingText;
    }
    const parsedFallback = tryParseQualityPayload(localWorkingText);
    if (!parsedFallback) {
      return null;
    }
    if (parsedFallback.parser === 'json') {
      if ((parsedFallback.scoreFieldCount || 0) < REQUIRED_SCORER_SCORE_FIELDS) {
        return null;
      }
      return {
        ok: true,
        parsed: parsedFallback.parsed,
        rawText: localWorkingText,
        parser: withPrefix('json'),
        responseHeaders: request.responseHeaders || null
      };
    }
    const completeHeuristic = maybeStoreHeuristic(parsedFallback, localWorkingText, withPrefix('heuristic'));
    if (completeHeuristic) {
      return {
        ...completeHeuristic,
        responseHeaders: request.responseHeaders || null
      };
    }
    return null;
  };

  const primaryResolved = resolveParsedFromRequest(primaryRequest);
  if (primaryResolved) {
    return primaryResolved;
  }

  if (SCORER_PARSE_REQUERY_ON_FAIL) {
    const requeryPrompt = [
      scorerPrompt,
      '',
      'REQUERY MODE:',
      '- Emit exactly one valid compact JSON object with required keys.',
      '- No prose, no markdown, no code fences.',
      '- Keep diagnostics short and directives concise.'
    ].join('\n');
    const requeryRequest = await requestScorerApi({
      accessToken,
      parts: [
        { text: requeryPrompt },
        { inlineData: referenceInlineData },
        { inlineData: generatedImagePart.inlineData }
      ],
      maxOutputTokens: SCORER_PARSE_REQUERY_MAX_OUTPUT_TOKENS,
      temperature: 0,
      responseSchema: null
    });
    if (requeryRequest.ok) {
      const requeryResolved = resolveParsedFromRequest(requeryRequest, 'requery');
      if (requeryResolved) {
        return requeryResolved;
      }
    } else if (!workingText && requeryRequest.responseSnippet) {
      workingText = String(requeryRequest.responseSnippet);
    }
  }

  for (let attempt = 1; attempt <= SCORER_PARSE_REPAIR_RETRIES; attempt += 1) {
    const repairPrompt = buildScorerRepairPrompt({
      scorerPrompt,
      invalidResponseText: workingText,
      attempt
    });

    const repairRequest = await requestScorerApi({
      accessToken,
      parts: [{ text: repairPrompt }],
      maxOutputTokens: SCORER_REPAIR_MAX_OUTPUT_TOKENS,
      temperature: 0,
      responseSchema: SCORER_FORCE_SCHEMA ? SCORER_RESPONSE_SCHEMA : null
    });

    if (!repairRequest.ok) {
      continue;
    }

    const repairTexts = collectTextParts(repairRequest.body);
    for (const repairText of repairTexts) {
      const repaired = tryParseQualityPayload(repairText);
      if (!repaired) continue;
      if (repaired.parser === 'json') {
        if ((repaired.scoreFieldCount || 0) < REQUIRED_SCORER_SCORE_FIELDS) {
          if (repairText) {
            workingText = repairText;
          }
          continue;
        }
        return {
          ok: true,
          parsed: repaired.parsed,
          rawText: repairText,
          parser: 'repair-json',
          responseHeaders: repairRequest.responseHeaders || null
        };
      }
      const completeHeuristic = maybeStoreHeuristic(repaired, repairText, 'repair-heuristic');
      if (completeHeuristic) {
        return {
          ...completeHeuristic,
          responseHeaders: repairRequest.responseHeaders || null
        };
      }
    }

    const joinedRepairText = repairTexts.join('\n').trim() || repairRequest.responseText || '';
    const repairedFallback = tryParseQualityPayload(joinedRepairText);
    if (repairedFallback) {
      if (repairedFallback.parser === 'json') {
        if ((repairedFallback.scoreFieldCount || 0) < REQUIRED_SCORER_SCORE_FIELDS) {
          if (joinedRepairText) {
            workingText = joinedRepairText;
          }
        } else {
          return {
            ok: true,
            parsed: repairedFallback.parsed,
            rawText: joinedRepairText,
            parser: 'repair-json',
            responseHeaders: repairRequest.responseHeaders || null
          };
        }
      } else {
        const completeHeuristic = maybeStoreHeuristic(repairedFallback, joinedRepairText, 'repair-heuristic');
        if (completeHeuristic) {
          return {
            ...completeHeuristic,
            responseHeaders: repairRequest.responseHeaders || null
          };
        }
      }
    }

    if (joinedRepairText) {
      workingText = joinedRepairText;
    }
  }

  if (deferredHeuristic?.rawText && !workingText) {
    workingText = deferredHeuristic.rawText;
  }

  return {
    ok: false,
    errorType: 'parse',
    responseSnippet: String(workingText || primaryRequest.responseText || '').slice(0, 2000),
    responseHeaders: primaryRequest.responseHeaders || null
  };
}

async function evaluateImageQuality({
  promptId,
  title,
  variant,
  promptIntentDigest,
  referenceInlineData,
  imagePart
}) {
  if (!ENABLE_QUALITY_GATE) {
    return {
      enabled: false,
      pass: true,
      scorerAvailable: false,
      scores: null,
      failedDimensions: [],
      overallScore: null,
      diagnostics: null,
      rescueDirectives: [],
      physicsChecklist: null,
      physicsChecklistFailures: []
    };
  }

  const scorerPrompt = buildQualityScorerPrompt({ promptId, title, variant, promptIntentDigest });
  const scoreResult = await callScorerModel({
    scorerPrompt,
    referenceInlineData,
    generatedImagePart: imagePart
  });

  if (!scoreResult.ok) {
    return {
      enabled: true,
      pass: false,
      scorerAvailable: false,
      scorerError: {
        errorType: scoreResult.errorType,
        status: scoreResult.status || null,
        statusText: scoreResult.statusText || null,
        message: scoreResult.message || null,
        responseSnippet: scoreResult.responseSnippet || null,
        responseHeaders: scoreResult.responseHeaders || null
      },
      scores: null,
      failedDimensions: [],
      overallScore: null,
      diagnostics: 'scorer unavailable',
      rescueDirectives: [],
      physicsChecklist: null,
      physicsChecklistFailures: []
    };
  }

  const parsed = scoreResult.parsed || {};
  const scoresRoot = parsed.scores || parsed;
  const scores = {
    identity: pickFirstScore(scoresRoot, SCORE_FIELD_ALIASES.identity),
    gaze: pickFirstScore(scoresRoot, SCORE_FIELD_ALIASES.gaze),
    attireReplacement: pickFirstScore(scoresRoot, SCORE_FIELD_ALIASES.attireReplacement),
    edge: pickFirstScore(scoresRoot, SCORE_FIELD_ALIASES.edge),
    realism: pickFirstScore(scoresRoot, SCORE_FIELD_ALIASES.realism),
    physics: pickFirstScore(scoresRoot, SCORE_FIELD_ALIASES.physics),
    sceneAdherence: pickFirstScore(scoresRoot, SCORE_FIELD_ALIASES.sceneAdherence),
    poseAdherence: pickFirstScore(scoresRoot, SCORE_FIELD_ALIASES.poseAdherence)
  };

  const missingScoreKeys = Object.entries(scores)
    .filter(([, value]) => value === null)
    .map(([key]) => key);
  if (missingScoreKeys.length > 0) {
    return {
      enabled: true,
      pass: false,
      scorerAvailable: false,
      scorerParser: scoreResult.parser || 'unknown',
      scorerError: {
        errorType: 'parse',
        message: `Incomplete scorer payload (missing score fields): ${missingScoreKeys.join(', ')}`,
        responseSnippet: scoreResult.rawText ? String(scoreResult.rawText).slice(0, 2000) : null,
        responseHeaders: scoreResult.responseHeaders || null
      },
      scores,
      failedDimensions: [],
      overallScore: null,
      diagnostics: 'scorer incomplete',
      rescueDirectives: [],
      physicsChecklist: null,
      physicsChecklistFailures: [],
      confidence: clamp(Number(parsed.confidence) || 0, 0, 1),
      raw: parsed
    };
  }

  const scoreValues = Object.values(scores).map(value => Number(value));
  const allZeroScores = scoreValues.length > 0 && scoreValues.every(value => Number.isFinite(value) && value <= 0.01);
  if (allZeroScores) {
    return {
      enabled: true,
      pass: false,
      scorerAvailable: false,
      scorerParser: scoreResult.parser || 'unknown',
      scorerError: {
        errorType: 'parse',
        message: 'Rejected scorer payload with all-zero scores (likely repair artifact)',
        responseSnippet: scoreResult.rawText ? String(scoreResult.rawText).slice(0, 2000) : null,
        responseHeaders: scoreResult.responseHeaders || null
      },
      scores,
      failedDimensions: [],
      overallScore: null,
      diagnostics: 'scorer invalid',
      rescueDirectives: [],
      physicsChecklist: null,
      physicsChecklistFailures: [],
      confidence: clamp(Number(parsed.confidence) || 0, 0, 1),
      raw: parsed
    };
  }

  const minScore = Math.min(...scoreValues);
  const maxScore = Math.max(...scoreValues);
  const nearUniformScores = Number.isFinite(minScore) && Number.isFinite(maxScore) && (maxScore - minScore) <= 0.15;
  const looksLikeRepairArtifact = String(scoreResult.parser || '').startsWith('repair');
  if (nearUniformScores && looksLikeRepairArtifact) {
    return {
      enabled: true,
      pass: false,
      scorerAvailable: false,
      scorerParser: scoreResult.parser || 'unknown',
      scorerError: {
        errorType: 'parse',
        message: 'Rejected near-uniform repaired scores (likely repair artifact)',
        responseSnippet: scoreResult.rawText ? String(scoreResult.rawText).slice(0, 2000) : null,
        responseHeaders: scoreResult.responseHeaders || null
      },
      scores,
      failedDimensions: [],
      overallScore: null,
      diagnostics: 'scorer invalid',
      rescueDirectives: [],
      physicsChecklist: null,
      physicsChecklistFailures: [],
      confidence: clamp(Number(parsed.confidence) || 0, 0, 1),
      raw: parsed
    };
  }

  const physicsChecklist = parsePhysicsChecklist(parsed.physicsChecklist || parsed.physics_checklist);
  const physicsChecklistFailures = PHYSICS_CHECKLIST_ENFORCE
    ? findPhysicsChecklistFailures(physicsChecklist, PHYSICS_CHECKLIST_MIN)
    : [];
  const quality = scoreQuality(scores);
  if (physicsChecklistFailures.length) {
    const minChecklistScore = Math.min(...physicsChecklistFailures.map(item => item.score));
    quality.pass = false;
    quality.failedDimensions.push({
      key: 'physicsChecklist',
      label: 'physicsChecklist',
      score: Number.isFinite(minChecklistScore) ? minChecklistScore : 0,
      threshold: PHYSICS_CHECKLIST_MIN
    });
  }
  const rescueDirectives = normalizeRescueDirectives(parsed.rescueDirectives || parsed.rescue_directives);
  return {
    enabled: true,
    pass: quality.pass,
    scorerAvailable: true,
    scorerParser: scoreResult.parser || 'unknown',
    scores,
    failedDimensions: quality.failedDimensions,
    overallScore: quality.overallScore,
    diagnostics: typeof parsed.diagnostics === 'string' ? parsed.diagnostics.trim() : null,
    rescueDirectives,
    physicsChecklist,
    physicsChecklistFailures,
    confidence: clamp(Number(parsed.confidence) || 0, 0, 1),
    raw: parsed
  };
}

async function evaluateImageQualityWithSelfHealing({
  promptId,
  title,
  variant,
  promptIntentDigest,
  referenceInlineData,
  imagePart,
  logLabel
}) {
  let quality = await evaluateImageQuality({
    promptId,
    title,
    variant,
    promptIntentDigest,
    referenceInlineData,
    imagePart
  });

  if (!ENABLE_QUALITY_GATE || quality.scorerAvailable || SCORER_SELF_HEAL_RETRIES <= 0) {
    return quality;
  }

  let retriesRemaining = SCORER_SELF_HEAL_RETRIES;
  while (
    retriesRemaining > 0
    && !quality.scorerAvailable
    && quality.scorerError?.errorType === 'parse'
  ) {
    const attemptNumber = (SCORER_SELF_HEAL_RETRIES - retriesRemaining) + 1;
    if (logLabel) {
      log(`${logLabel}: scorer parse issue, self-heal retry ${attemptNumber}/${SCORER_SELF_HEAL_RETRIES}`);
    }

    const rescored = await evaluateImageQuality({
      promptId,
      title,
      variant,
      promptIntentDigest,
      referenceInlineData,
      imagePart
    });

    quality = rescored;
    if (quality.scorerAvailable) {
      if (logLabel) {
        log(`${logLabel}: scorer self-heal recovered`);
      }
      break;
    }

    retriesRemaining -= 1;
  }

  return quality;
}

function buildPrimaryRescuePrompt({ basePrompt, qualityEvaluation, rescueRound = 1 }) {
  const failingLabels = qualityEvaluation.failedDimensions.map(item => item.label);
  const checklistFailureKeys = Array.isArray(qualityEvaluation.physicsChecklistFailures)
    ? qualityEvaluation.physicsChecklistFailures.map(item => item.key)
    : [];
  if (checklistFailureKeys.length) {
    failingLabels.push(`physicsChecklist(${checklistFailureKeys.join(',')})`);
  }
  const fallbackDirectives = [
    'Tighten identity lock to the reference face geometry and expression micro-details.',
    'Force unmistakable direct lens-locked eye alignment with natural vergence.',
    'Lock the explicit prompt scene anchor (location and hero props) so the final frame clearly matches the intended set.',
    'Honor prompt-specific wardrobe descriptors exactly; avoid generic template substitutions.',
    'Honor prompt-specific pose choreography (support contact, torsion, expressive hand, leg-line mechanics).',
    'Increase skin-forward but non-explicit cut architecture: shoulders, upper back, waist windows, and leg-line clarity.',
    'Increase physical causality in cloth strain, seam tension, support anchors, and material highlights at slit, hosiery band, knee, ankle, and heel contact zones.',
    'Increase micro-detail density by one tier: stitch continuity, pore breakup, hair flyaways, and contact-shadow pockets must all be visible.',
    'Suppress synthetic artifacts: wax skin, repeated textures, and composited edges.'
  ];
  const failingKeys = new Set(qualityEvaluation.failedDimensions.map(item => item.key));
  const targetedDirectives = [];
  if (PHYSICS_REALISM_PRIORITY_MULTIPLIER >= 3) {
    targetedDirectives.push(
      'Triple-priority realism: eliminate wax skin, tiled textures, and synthetic depth transitions.',
      'Triple-priority physics: enforce load-path to fold to shadow coherence across slit edge, hosiery band, knees, ankles, and heel contact.'
    );
  }
  if (rescueRound >= 2) {
    targetedDirectives.push(
      'Escalate realism closure: enforce visibly stronger camera-authentic texture and zero halo/composite edges.',
      'Escalate physics closure: increase cue density per critical zone and reject texture-only detail.',
      'Escalate daring styling by one tier: stronger revealing editorial geometry and clearer nightlife couture attitude while staying non-explicit.'
    );
  }
  if (failingKeys.has('physics')) {
    targetedDirectives.push(
      'Re-solve pose to load path to fold direction to specular path to shadow geometry with no broken causal links.',
      'Ensure every critical zone has dense contact cues, not texture-only detail.'
    );
  }
  if (checklistFailureKeys.includes('supportContact')) {
    targetedDirectives.push(
      'Fix support-contact mechanics: center of mass projection must land on true support with visible compression cues.'
    );
  }
  if (checklistFailureKeys.includes('nonPenetration')) {
    targetedDirectives.push(
      'Eliminate all interpenetration and float errors at limbs, garment boundaries, and contact surfaces.'
    );
  }
  if (checklistFailureKeys.includes('gravityDrape')) {
    targetedDirectives.push(
      'Recompute gravity-consistent drape so slit, hem, and hosiery deformation follow one gravity vector.'
    );
  }
  if (checklistFailureKeys.includes('lightShadowGeometry')) {
    targetedDirectives.push(
      'Align key-light direction, catchlights, and cast-shadow geometry across face, torso, legs, and environment.'
    );
  }
  if (checklistFailureKeys.includes('materialResponse')) {
    targetedDirectives.push(
      'Correct material optics so sheen and roughness response match satin, mesh, hosiery, and metal surfaces.'
    );
  }
  if (failingKeys.has('realism')) {
    targetedDirectives.push(
      'Increase camera-authentic detail: natural skin texture, non-repeating fabric fibers, and coherent depth-of-field transitions.'
    );
  }
  if (failingKeys.has('gaze')) {
    targetedDirectives.push('Keep irises and head orientation locked to lens center; both irises remain fully visible.');
  }
  if (failingKeys.has('identity')) {
    targetedDirectives.push(
      'Identity supremacy: preserve exact face geometry and smile pattern from reference.',
      'Do not alter apparent age, ethnicity cues, jawline, or eye spacing.',
      'Match hair color family and part direction to reference identity cues.'
    );
  }
  if (failingKeys.has('attireReplacement')) {
    targetedDirectives.push(
      'Force complete wardrobe replacement with clear two-piece topology and no carryover from source casual clothing.'
    );
  }
  if (failingKeys.has('sceneAdherence')) {
    targetedDirectives.push(
      'Rebuild exact prompt scene anchors (intimate luxury-suite location, hero props, and light logic); do not substitute generic venues.'
    );
  }
  if (failingKeys.has('poseAdherence')) {
    targetedDirectives.push(
      'Rebuild exact prompt pose choreography: one active support contact, one torsion cue, one expressive hand action, and one leg-line mechanic.'
    );
  }
  if (failingKeys.has('edge')) {
    targetedDirectives.push(
      'Increase daring reveal intensity while staying non-explicit: stronger high-cut leg line, clearer side-waist architecture, and sharper contour separation.',
      'Increase provocative editorial attitude through assertive pose-light geometry and stronger silhouette tension cues.',
      'Switch to a bolder outfit archetype (structured bodice + aggressive slit/cut architecture + controlled sheer layering) while preserving coverage-critical stability.'
    );
  }
  const directivesBase = qualityEvaluation.rescueDirectives.length
    ? qualityEvaluation.rescueDirectives
    : fallbackDirectives;
  const directives = [...directivesBase, ...targetedDirectives].slice(0, 12);

  return [
    basePrompt.trim(),
    '',
    `PRIMARY QUALITY RESCUE PROTOCOL (ATTEMPT ${rescueRound + 1}, HARD):`,
    'Regenerate with materially stronger realism and style fidelity while staying non-explicit.',
    `Targeted deficiencies to correct: ${failingLabels.join(', ') || 'general quality consistency'}.`,
    'Apply these rescue directives:',
    ...directives.map(item => `- ${item}`),
    '',
    'Hard rescue constraints:',
    '- Keep adult high-fashion editorial framing only; no nudity or explicit framing.',
    '- Preserve identity fidelity, lens-locked gaze, and physically coherent wardrobe behavior.',
    '- Deliver a visibly different render from attempt 1 using improved pose-light-material coherence.'
  ].join('\n');
}

function compareQualityForChoice(candidateA, candidateB) {
  if (!candidateB) return candidateA;
  const aPass = candidateA?.quality?.pass ? 1 : 0;
  const bPass = candidateB?.quality?.pass ? 1 : 0;
  if (aPass !== bPass) {
    return bPass > aPass ? candidateB : candidateA;
  }
  const weights = choiceDimensionWeights();
  const aScores = candidateA?.quality?.scores || {};
  const bScores = candidateB?.quality?.scores || {};
  const aIdentity = clamp(Number(aScores.identity) || 0, 0, 10);
  const bIdentity = clamp(Number(bScores.identity) || 0, 0, 10);
  const aGaze = clamp(Number(aScores.gaze) || 0, 0, 10);
  const bGaze = clamp(Number(bScores.gaze) || 0, 0, 10);
  const aEdge = clamp(Number(aScores.edge) || 0, 0, 10);
  const bEdge = clamp(Number(bScores.edge) || 0, 0, 10);
  const aScene = clamp(Number(aScores.sceneAdherence) || 0, 0, 10);
  const bScene = clamp(Number(bScores.sceneAdherence) || 0, 0, 10);
  const aPose = clamp(Number(aScores.poseAdherence) || 0, 0, 10);
  const bPose = clamp(Number(bScores.poseAdherence) || 0, 0, 10);
  const identityDrop = aIdentity - bIdentity;
  const gazeDrop = aGaze - bGaze;
  const scenePoseGain = (bScene + bPose) - (aScene + aPose);
  if (scenePoseGain >= 0.3 && identityDrop <= 0.15 && gazeDrop <= 0.15) {
    return candidateB;
  }
  if (PHYSICS_REALISM_PRIORITY_MULTIPLIER >= 3) {
    const aRealism = clamp(Number(aScores.realism) || 0, 0, 10);
    const aPhysics = clamp(Number(aScores.physics) || 0, 0, 10);
    const bRealism = clamp(Number(bScores.realism) || 0, 0, 10);
    const bPhysics = clamp(Number(bScores.physics) || 0, 0, 10);

    const realismPhysicsGain = (bRealism + bPhysics) - (aRealism + aPhysics);
    if (realismPhysicsGain >= 0.35 && identityDrop <= 0.15 && gazeDrop <= 0.2) {
      return candidateB;
    }
  }
  if (EDGE_PRIORITY_MULTIPLIER >= 1.5) {
    const edgeGain = bEdge - aEdge;
    const strongEdgeCandidate = bEdge >= EDGE_FIRST_ACCEPTANCE_EDGE_MIN
      && bIdentity >= EDGE_FIRST_ACCEPTANCE_IDENTITY_MIN - 0.1
      && bGaze >= EDGE_FIRST_ACCEPTANCE_GAZE_MIN - 0.1
      && edgeGain >= 0.05;
    if (strongEdgeCandidate) {
      return candidateB;
    }
    if (edgeGain >= 0.12 && identityDrop <= 0.3 && gazeDrop <= 0.35) {
      return candidateB;
    }
  }
  const aGoalPriority = clamp(Number(aScores.identity) || 0, 0, 10) * weights.identity
    + clamp(Number(aScores.gaze) || 0, 0, 10) * weights.gaze
    + clamp(Number(aScores.attireReplacement) || 0, 0, 10) * weights.attireReplacement
    + clamp(Number(aScores.edge) || 0, 0, 10) * weights.edge
    + clamp(Number(aScores.realism) || 0, 0, 10) * weights.realism
    + clamp(Number(aScores.physics) || 0, 0, 10) * weights.physics
    + clamp(Number(aScores.sceneAdherence) || 0, 0, 10) * weights.sceneAdherence
    + clamp(Number(aScores.poseAdherence) || 0, 0, 10) * weights.poseAdherence;
  const bGoalPriority = clamp(Number(bScores.identity) || 0, 0, 10) * weights.identity
    + clamp(Number(bScores.gaze) || 0, 0, 10) * weights.gaze
    + clamp(Number(bScores.attireReplacement) || 0, 0, 10) * weights.attireReplacement
    + clamp(Number(bScores.edge) || 0, 0, 10) * weights.edge
    + clamp(Number(bScores.realism) || 0, 0, 10) * weights.realism
    + clamp(Number(bScores.physics) || 0, 0, 10) * weights.physics
    + clamp(Number(bScores.sceneAdherence) || 0, 0, 10) * weights.sceneAdherence
    + clamp(Number(bScores.poseAdherence) || 0, 0, 10) * weights.poseAdherence;
  if (bGoalPriority > aGoalPriority + 0.035) {
    return candidateB;
  }
  const aScore = Number.isFinite(candidateA?.quality?.overallScore) ? candidateA.quality.overallScore : -1;
  const bScore = Number.isFinite(candidateB?.quality?.overallScore) ? candidateB.quality.overallScore : -1;
  if (bScore > aScore + 0.05) {
    return candidateB;
  }
  return candidateA;
}

function recordQualityTotals(summary, quality) {
  if (!quality?.enabled) {
    return;
  }
  summary.totals.qualityEvaluated += 1;
  if (!quality.scorerAvailable) {
    summary.totals.qualityScorerUnavailable += 1;
    return;
  }
  if (quality.pass) {
    summary.totals.qualityPass += 1;
  } else {
    summary.totals.qualityFail += 1;
  }
}

function isEdgeFirstAcceptable(quality) {
  if (!EDGE_FIRST_ACCEPTANCE_MODE) {
    return false;
  }
  const scores = quality?.scores || {};
  const edge = clamp(Number(scores.edge) || 0, 0, 10);
  const identity = clamp(Number(scores.identity) || 0, 0, 10);
  const gaze = clamp(Number(scores.gaze) || 0, 0, 10);
  const attireReplacement = clamp(Number(scores.attireReplacement) || 0, 0, 10);
  const sceneAdherence = clamp(Number(scores.sceneAdherence) || 0, 0, 10);
  const poseAdherence = clamp(Number(scores.poseAdherence) || 0, 0, 10);
  return (
    edge >= EDGE_FIRST_ACCEPTANCE_EDGE_MIN
    && identity >= EDGE_FIRST_ACCEPTANCE_IDENTITY_MIN
    && gaze >= EDGE_FIRST_ACCEPTANCE_GAZE_MIN
    && attireReplacement >= EDGE_FIRST_ACCEPTANCE_ATTIRE_MIN
    && sceneAdherence >= EDGE_FIRST_ACCEPTANCE_SCENE_MIN
    && poseAdherence >= EDGE_FIRST_ACCEPTANCE_POSE_MIN
  );
}

function isQualityAcceptableForFinal(quality, variant = 'primary') {
  if (!ENABLE_QUALITY_GATE) {
    return true;
  }
  if (!quality?.enabled) {
    return true;
  }
  if (!quality.scorerAvailable) {
    return SCORER_UNAVAILABLE_POLICY === 'soft_accept';
  }
  if (variant === 'primary' && isEdgeFirstAcceptable(quality)) {
    return true;
  }
  return Boolean(quality.pass);
}

function parsePromptSections(markdown) {
  const headingRegex = /^## Prompt\s+(\d{2,3})\s+-\s+(.+)$/gm;
  const headings = [];
  let match;
  while ((match = headingRegex.exec(markdown)) !== null) {
    headings.push({
      id: match[1],
      title: match[2].trim(),
      start: match.index,
      headingEnd: headingRegex.lastIndex
    });
  }

  const sections = [];
  for (let i = 0; i < headings.length; i += 1) {
    const current = headings[i];
    const next = headings[i + 1];
    const sectionEnd = next ? next.start : markdown.length;
    const sectionText = markdown.slice(current.headingEnd, sectionEnd);

    const primaryMarker = '### Primary Prompt';
    const safeMarker = '### Safe Backup Prompt';
    const primaryIdx = sectionText.indexOf(primaryMarker);
    const safeIdx = sectionText.indexOf(safeMarker);

    if (primaryIdx === -1 || safeIdx === -1 || safeIdx <= primaryIdx) {
      continue;
    }

    const primaryPrompt = sectionText
      .slice(primaryIdx + primaryMarker.length, safeIdx)
      .trim();
    const safePrompt = sectionText
      .slice(safeIdx + safeMarker.length)
      .trim();

    if (!primaryPrompt || !safePrompt) {
      continue;
    }

    sections.push({
      id: current.id,
      title: current.title,
      primaryPrompt,
      safePrompt,
      primaryWordCount: countWords(primaryPrompt),
      safeWordCount: countWords(safePrompt)
    });
  }

  return sections;
}

function extractPromptIntentDigest(promptText, maxChars = SCORER_INTENT_DIGEST_MAX_CHARS) {
  const rawLines = String(promptText || '')
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean);
  if (!rawLines.length) {
    return '';
  }

  const sectionRules = [
    { key: 'scene', regex: /^scene\s*:/i },
    { key: 'wardrobe', regex: /^wardrobe\s*:/i },
    { key: 'pose', regex: /^pose(?:\s+and\s+framing)?\s*:/i },
    {
      key: 'physics',
      regex: /^(?:micro-physics(?:\s+realism\s+checks)?|physics(?:\s+and\s+micro(?:detail|[-\s]detail))?\s+checks?|first-principles physics checklist)\s*:/i
    },
    {
      key: 'lightTransport',
      regex: /^(?:light-transport checks|lighting physics checks|shadow coherence checks)\s*:/i
    },
    {
      key: 'failureHotspots',
      regex: /^failure hotspots(?:\s+to\s+avoid)?\s*:/i
    },
    { key: 'reject', regex: /^reject\s*:/i }
  ];
  const ignorePatterns = [
    /^performance patch/i,
    /^safe performance patch/i,
    /^devils-advocate/i,
    /^adult subject only/i,
    /^identity(?:\s+lock|\s+and\s+gaze)?\s*:/i,
    /^camera\s*:/i,
    /^run uniqueness token/i,
    /^token=/i,
    /^---$/
  ];

  let activeSection = '';
  const picked = [];
  for (const rawLine of rawLines) {
    const line = rawLine.replace(/\s+/g, ' ').trim();
    if (!line || ignorePatterns.some(pattern => pattern.test(line))) {
      continue;
    }

    const sectionMatch = sectionRules.find(rule => rule.regex.test(line));
    if (sectionMatch) {
      activeSection = sectionMatch.key;
      picked.push(line);
      continue;
    }

    if (/^#+\s+/.test(line)) {
      activeSection = '';
      continue;
    }

    if (line.startsWith('- ')) {
      if (activeSection) {
        picked.push(line);
      }
      continue;
    }

    if (activeSection) {
      picked.push(`- ${line}`);
    }
  }

  const deduped = [];
  const seen = new Set();
  for (const line of picked) {
    const key = line.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(line);
    }
  }

  const digest = deduped.slice(0, 30).join('\n');
  if (!digest) {
    return '';
  }
  if (digest.length <= maxChars) {
    return digest;
  }
  return `${digest.slice(0, maxChars - 3)}...`;
}

async function loadReferenceInlineData(referenceImagePath) {
  const buffer = await fs.readFile(referenceImagePath);
  const mimeType = extToMime(referenceImagePath);
  return {
    mimeType,
    data: buffer.toString('base64')
  };
}

async function callImageModel({ promptText, referenceInlineData, label }) {
  await waitBeforeAttempt(WAIT_BEFORE_ATTEMPT_S, label);

  const accessToken = await getAccessToken();
  if (!accessToken) {
    return {
      ok: false,
      errorType: 'auth',
      message: 'Failed to obtain Google access token'
    };
  }

  const maxHttpAttempts = IMAGE_HTTP_RETRIES + 1;
  const payload = {
    contents: [
      {
        role: 'user',
        parts: [
          { inlineData: referenceInlineData },
          { text: promptText }
        ]
      }
    ],
    generationConfig: {
      responseModalities: ['IMAGE'],
      imageConfig: {
        aspectRatio: OUTPUT_ASPECT_RATIO,
        imageSize: OUTPUT_IMAGE_SIZE
      }
    }
  };

  for (let requestAttempt = 1; requestAttempt <= maxHttpAttempts; requestAttempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    let response;
    let responseText = '';
    let body = null;
    let responseHeaders = null;

    try {
      response = await fetch(ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
          ...(HTTP_CACHE_BYPASS
            ? {
                'Cache-Control': 'no-cache, no-store, max-age=0',
                Pragma: 'no-cache'
              }
            : {})
        },
        body: JSON.stringify(payload),
        ...(HTTP_CACHE_BYPASS ? { cache: 'no-store' } : {}),
        signal: controller.signal
      });
      responseHeaders = extractCacheDiagnosticHeaders(response.headers);

      responseText = await response.text();
      if (responseText) {
        try {
          body = JSON.parse(responseText);
        } catch {
          body = null;
        }
      }
    } catch (error) {
      clearTimeout(timeout);
      const message = error instanceof Error ? error.message : String(error);
      if (requestAttempt < maxHttpAttempts) {
        const retryDelayMs = computeImageRetryDelayMs({ attempt: requestAttempt });
        log(
          `${label}: network error on request attempt ${requestAttempt}/${maxHttpAttempts} (${message}); retrying in ${Math.ceil(retryDelayMs / 1000)}s`
        );
        await wait(retryDelayMs);
        continue;
      }
      return {
        ok: false,
        errorType: 'network',
        message
      };
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      const shouldRetry = requestAttempt < maxHttpAttempts && IMAGE_HTTP_RETRYABLE_STATUSES.has(response.status);
      armAdaptiveRateLimitCooldown({
        label,
        status: response.status,
        retryAfterHeader: response.headers.get('retry-after')
      });
      if (shouldRetry) {
        const retryDelayMs = computeImageRetryDelayMs({
          attempt: requestAttempt,
          retryAfterHeader: response.headers.get('retry-after')
        });
        log(
          `${label}: HTTP ${response.status} on request attempt ${requestAttempt}/${maxHttpAttempts}; retrying in ${Math.ceil(retryDelayMs / 1000)}s`
        );
        await wait(retryDelayMs);
        continue;
      }
      return {
        ok: false,
        errorType: 'http',
        status: response.status,
        statusText: response.statusText,
        blockReason: extractBlockReason(body),
        responseSnippet: responseText.slice(0, 4000),
        responseHeaders
      };
    }

    const imagePart = findImagePart(body);
    if (!imagePart?.inlineData?.data) {
      decayAdaptiveRateLimitCooldown();
      return {
        ok: false,
        errorType: 'no_image',
        blockReason: extractBlockReason(body),
        responseSnippet: responseText.slice(0, 4000),
        responseHeaders
      };
    }

    decayAdaptiveRateLimitCooldown();
    return {
      ok: true,
      imagePart,
      responseHeaders
    };
  }

  return {
    ok: false,
    errorType: 'retry_exhausted',
    message: 'Image request exhausted retry budget'
  };
}

async function saveImagePart(imagePart, outputWithoutExt) {
  const mimeType = imagePart.inlineData.mimeType || 'image/png';
  const ext = mimeToExt(mimeType);
  const outputPath = `${outputWithoutExt}.${ext}`;
  const imageBuffer = Buffer.from(imagePart.inlineData.data, 'base64');
  await fs.writeFile(outputPath, imageBuffer);
  return {
    outputPath,
    mimeType,
    bytes: imageBuffer.length
  };
}

async function writeJson(filePath, value) {
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

async function main() {
  const promptMarkdown = await fs.readFile(PROMPT_FILE, 'utf8');
  const parsedPrompts = parsePromptSections(promptMarkdown).slice(0, MAX_PROMPTS);

  if (!parsedPrompts.length) {
    throw new Error(`No prompt sections parsed from: ${PROMPT_FILE}`);
  }

  await fs.access(REFERENCE_IMAGE);
  const referenceInlineData = await loadReferenceInlineData(REFERENCE_IMAGE);

  const runStamp = timestampForPath();
  const runNonce = buildRunNonce();
  const runDir = path.join(OUTPUT_BASE, `speakeasy-safe-fallback-${runStamp}`);
  await fs.mkdir(runDir, { recursive: true });

  const summaryPath = path.join(runDir, 'summary.json');

  const runInfo = {
    createdAt: new Date().toISOString(),
    promptFile: PROMPT_FILE,
    referenceImage: REFERENCE_IMAGE,
    model: MODEL,
    scorerModel: SCORER_MODEL,
    projectId: PROJECT_ID,
    location: LOCATION,
    endpoint: ENDPOINT,
    scorerEndpoint: SCORER_ENDPOINT,
    endpointOverride: Boolean(process.env.IMAGE_ENDPOINT),
    scorerEndpointOverride: Boolean(process.env.SCORER_ENDPOINT),
    authMode: STATIC_ACCESS_TOKEN ? 'static_token' : 'google_auth',
    waitBeforeAttemptSeconds: WAIT_BEFORE_ATTEMPT_S,
    imageHttpRetries: IMAGE_HTTP_RETRIES,
    imageHttpBackoffBaseMs: IMAGE_HTTP_BACKOFF_BASE_MS,
    imageHttpBackoffMaxMs: IMAGE_HTTP_BACKOFF_MAX_MS,
    rateLimitAdaptiveCooldown: RATE_LIMIT_ADAPTIVE_COOLDOWN,
    rateLimitCooldownBaseSeconds: RATE_LIMIT_COOLDOWN_BASE_S,
    rateLimitCooldownMaxSeconds: RATE_LIMIT_COOLDOWN_MAX_S,
    rateLimitCooldownGrowth: RATE_LIMIT_COOLDOWN_GROWTH,
    rateLimitCooldownDecaySeconds: RATE_LIMIT_COOLDOWN_DECAY_S,
    attemptWaitJitterSeconds: ATTEMPT_WAIT_JITTER_S,
    outputImageSize: OUTPUT_IMAGE_SIZE,
    outputAspectRatio: OUTPUT_ASPECT_RATIO,
    httpCacheBypass: HTTP_CACHE_BYPASS,
    promptNonceEnabled: PROMPT_NONCE_ENABLED,
    runNonce,
    enableIdentitySupremacyLock: ENABLE_IDENTITY_SUPREMACY_LOCK,
    identitySupremacyLevel: IDENTITY_SUPREMACY_LEVEL,
    referenceIdentityOnlyLock: REFERENCE_IDENTITY_ONLY_LOCK,
    attireReplacementLock: ATTIRE_REPLACEMENT_LOCK,
    enableForensicRealismTarget: ENABLE_FORENSIC_REALISM_TARGET,
    forensicRealismTargetLevel: FORENSIC_REALISM_TARGET_LEVEL,
    enableGoalMaximizer: ENABLE_GOAL_MAXIMIZER,
    goalMaximizerLevel: GOAL_MAXIMIZER_LEVEL,
    attireBoldBoost: ATTIRE_BOLD_BOOST,
    attireBoldBoostLevel: ATTIRE_BOLD_BOOST_LEVEL,
    skinForwardStyling: SKIN_FORWARD_STYLING,
    skinForwardLevel: SKIN_FORWARD_LEVEL,
    daringEditorialMode: DARING_EDITORIAL_MODE,
    daringEditorialLevel: DARING_EDITORIAL_LEVEL,
    daringEditorialFeatureCountMin: DARING_EDITORIAL_FEATURE_COUNT_MIN,
    sceneDirectorBlueprintMode: SCENE_DIRECTOR_BLUEPRINT_MODE,
    editorialEdgeRebuildMode: EDITORIAL_EDGE_REBUILD_MODE,
    promptFirstPriorityMode: PROMPT_FIRST_PRIORITY_MODE,
    promptDirectionSupremacyMode: PROMPT_DIRECTION_SUPREMACY_MODE,
    skipSafeFallbackOnPrimaryReject: SKIP_SAFE_FALLBACK_ON_PRIMARY_REJECT,
    sensualEditorialBoost: SENSUAL_EDITORIAL_BOOST,
    sensualEditorialLevel: SENSUAL_EDITORIAL_LEVEL,
    sensualVarianceGuard: SENSUAL_VARIANCE_GUARD,
    sensualVarianceLevel: SENSUAL_VARIANCE_LEVEL,
    enableResearchMicrodetailExpansion: ENABLE_RESEARCH_MICRODETAIL_EXPANSION,
    promptTargetWords: PROMPT_TARGET_WORDS,
    safePolicyHardening: SAFE_POLICY_HARDENING,
    safeFallbackSource: SAFE_FALLBACK_SOURCE_NORMALIZED,
    safeTransferPrimaryAnchors: SAFE_TRANSFER_PRIMARY_ANCHORS,
    scorerIntentDigestMaxChars: SCORER_INTENT_DIGEST_MAX_CHARS,
    scorerUnavailablePolicy: SCORER_UNAVAILABLE_POLICY,
    scorerForceSchema: SCORER_FORCE_SCHEMA,
    scorerCompactPrompt: SCORER_COMPACT_PROMPT,
    scorerParseRequeryOnFail: SCORER_PARSE_REQUERY_ON_FAIL,
    scorerParseRequeryMaxOutputTokens: SCORER_PARSE_REQUERY_MAX_OUTPUT_TOKENS,
    physicsChecklistEnforce: PHYSICS_CHECKLIST_ENFORCE,
    physicsChecklistMin: PHYSICS_CHECKLIST_MIN,
    edgePriorityMultiplier: EDGE_PRIORITY_MULTIPLIER,
    edgeFirstAcceptanceMode: EDGE_FIRST_ACCEPTANCE_MODE,
    edgeFirstAcceptanceThresholds: {
      edge: EDGE_FIRST_ACCEPTANCE_EDGE_MIN,
      identity: EDGE_FIRST_ACCEPTANCE_IDENTITY_MIN,
      gaze: EDGE_FIRST_ACCEPTANCE_GAZE_MIN,
      attireReplacement: EDGE_FIRST_ACCEPTANCE_ATTIRE_MIN,
      sceneAdherence: EDGE_FIRST_ACCEPTANCE_SCENE_MIN,
      poseAdherence: EDGE_FIRST_ACCEPTANCE_POSE_MIN
    },
    directCameraGazeOverride: DIRECT_CAMERA_GAZE_OVERRIDE,
    physicsRealismOverrideLevel: PHYSICS_REALISM_OVERRIDE_LEVEL,
    physicsRealismPriorityMultiplier: PHYSICS_REALISM_PRIORITY_MULTIPLIER,
    physicsRealismPromptHardMode: PHYSICS_REALISM_PROMPT_HARD_MODE,
    physicsRealismPromptDensity: PHYSICS_REALISM_PROMPT_DENSITY,
    antiAiRealismBoost: ANTI_AI_REALISM_BOOST,
    antiAiRealismLevel: ANTI_AI_REALISM_LEVEL,
    enableMicroPhysicsSolver: ENABLE_MICRO_PHYSICS_SOLVER,
    microPhysicsSolverLevel: MICRO_PHYSICS_SOLVER_LEVEL,
    enableFrontierProtocol: ENABLE_FRONTIER_PROTOCOL,
    frontierWithSolver: FRONTIER_WITH_SOLVER,
    enableRevolutionaryPhysicsKernel: ENABLE_REVOLUTIONARY_PHYSICS_KERNEL,
    revolutionaryPhysicsKernelLevel: REVOLUTIONARY_PHYSICS_KERNEL_LEVEL,
    enableHyperMicroDetail: ENABLE_HYPER_MICRO_DETAIL,
    hyperMicroDetailLevel: HYPER_MICRO_DETAIL_LEVEL,
    enableQualityGate: ENABLE_QUALITY_GATE,
    enablePrimaryRescue: ENABLE_PRIMARY_RESCUE,
    primaryRescueMaxAttempts: PRIMARY_RESCUE_MAX_ATTEMPTS,
    enablePrimaryUpliftRescue: ENABLE_PRIMARY_UPLIFT_RESCUE,
    scorerSelfHealRetries: SCORER_SELF_HEAL_RETRIES,
    scorerParseRepairRetries: SCORER_PARSE_REPAIR_RETRIES,
    scorerHeuristicMinFields: SCORER_HEURISTIC_MIN_FIELDS,
    scorerRepairMaxOutputTokens: SCORER_REPAIR_MAX_OUTPUT_TOKENS,
    qualityThresholds: qualityThresholds(),
    upliftTargets: upliftTargets(),
    qualityGateMaxOutputTokens: QUALITY_GATE_MAX_OUTPUT_TOKENS,
    promptCount: parsedPrompts.length,
    outputDirectory: runDir
  };
  await writeJson(path.join(runDir, 'run-info.json'), runInfo);

  const summary = {
    runInfo,
    totals: {
      prompts: parsedPrompts.length,
      primarySuccess: 0,
      safeSuccess: 0,
      failed: 0,
      qualityEvaluated: 0,
      qualityPass: 0,
      qualityFail: 0,
      qualityScorerUnavailable: 0,
      primaryRescueTriggered: 0,
      primaryRescueSuccess: 0,
      primaryRescueChosen: 0
    },
    prompts: []
  };
  await writeJson(summaryPath, summary);

  log(`Run directory: ${runDir}`);
  log(`Loaded ${parsedPrompts.length} prompt pairs from ${PROMPT_FILE}`);
  log(`Reference image: ${REFERENCE_IMAGE}`);
  log(`Model: ${MODEL}`);
  log(
    `Image HTTP retries: retries=${IMAGE_HTTP_RETRIES}, backoffBaseMs=${IMAGE_HTTP_BACKOFF_BASE_MS}, backoffMaxMs=${IMAGE_HTTP_BACKOFF_MAX_MS}`
  );
  log(
    `Adaptive 429 cooldown: ${RATE_LIMIT_ADAPTIVE_COOLDOWN
      ? `enabled (base=${RATE_LIMIT_COOLDOWN_BASE_S}s, max=${RATE_LIMIT_COOLDOWN_MAX_S}s, growth=${RATE_LIMIT_COOLDOWN_GROWTH}x, decay=${RATE_LIMIT_COOLDOWN_DECAY_S}s)`
      : 'disabled'}`
  );
  log(`Attempt wait jitter: ${ATTEMPT_WAIT_JITTER_S > 0 ? `enabled (0-${ATTEMPT_WAIT_JITTER_S}s)` : 'disabled'}`);
  log(`Output config: imageSize=${OUTPUT_IMAGE_SIZE} aspectRatio=${OUTPUT_ASPECT_RATIO}`);
  log(`HTTP cache bypass: ${HTTP_CACHE_BYPASS ? 'enabled' : 'disabled'}`);
  log(`Prompt nonce: ${PROMPT_NONCE_ENABLED ? `enabled (${runNonce})` : 'disabled'}`);
  log(`Identity supremacy lock: ${ENABLE_IDENTITY_SUPREMACY_LOCK ? `enabled (level ${IDENTITY_SUPREMACY_LEVEL})` : 'disabled'}`);
  log(`Reference identity-only lock: ${REFERENCE_IDENTITY_ONLY_LOCK ? 'enabled' : 'disabled'}`);
  log(`Attire replacement lock: ${ATTIRE_REPLACEMENT_LOCK ? 'enabled' : 'disabled'}`);
  log(`Forensic realism target: ${ENABLE_FORENSIC_REALISM_TARGET ? `enabled (level ${FORENSIC_REALISM_TARGET_LEVEL})` : 'disabled'}`);
  log(`Goal maximizer: ${ENABLE_GOAL_MAXIMIZER ? `enabled (level ${GOAL_MAXIMIZER_LEVEL})` : 'disabled'}`);
  log(
    `Frontier protocol: ${ENABLE_FRONTIER_PROTOCOL ? 'enabled' : 'disabled'}`
    + `${ENABLE_MICRO_PHYSICS_SOLVER ? ` (with solver=${FRONTIER_WITH_SOLVER ? 'on' : 'off'})` : ''}`
  );
  log(`Micro-physics solver: ${ENABLE_MICRO_PHYSICS_SOLVER ? `enabled (level ${MICRO_PHYSICS_SOLVER_LEVEL})` : 'disabled'}`);
  log(
    `Revolutionary physics kernel: ${ENABLE_REVOLUTIONARY_PHYSICS_KERNEL
      ? `enabled (level ${REVOLUTIONARY_PHYSICS_KERNEL_LEVEL})`
      : 'disabled'}`
  );
  log(`Hyper micro-detail enforcement: ${ENABLE_HYPER_MICRO_DETAIL ? `enabled (level ${HYPER_MICRO_DETAIL_LEVEL})` : 'disabled'}`);
  log(`Attire bold boost: ${ATTIRE_BOLD_BOOST ? `enabled (level ${ATTIRE_BOLD_BOOST_LEVEL})` : 'disabled'}`);
  log(`Skin-forward styling: ${SKIN_FORWARD_STYLING ? `enabled (level ${SKIN_FORWARD_LEVEL})` : 'disabled'}`);
  log(
    `Daring editorial mode: ${DARING_EDITORIAL_MODE
      ? `enabled (level ${DARING_EDITORIAL_LEVEL}, minFeatures=${DARING_EDITORIAL_FEATURE_COUNT_MIN})`
      : 'disabled'}`
  );
  log(`Scene director blueprints: ${SCENE_DIRECTOR_BLUEPRINT_MODE ? 'enabled' : 'disabled'}`);
  log(`Editorial edge rebuild mode: ${EDITORIAL_EDGE_REBUILD_MODE ? 'enabled' : 'disabled'}`);
  log(`Prompt-first priority mode: ${PROMPT_FIRST_PRIORITY_MODE ? 'enabled' : 'disabled'}`);
  log(`Prompt direction supremacy mode: ${PROMPT_DIRECTION_SUPREMACY_MODE ? 'enabled' : 'disabled'}`);
  log(`Skip safe fallback on primary reject: ${SKIP_SAFE_FALLBACK_ON_PRIMARY_REJECT ? 'enabled' : 'disabled'}`);
  log(`Sensual editorial boost: ${SENSUAL_EDITORIAL_BOOST ? `enabled (level ${SENSUAL_EDITORIAL_LEVEL})` : 'disabled'}`);
  log(`Sensual variance guard: ${SENSUAL_VARIANCE_GUARD ? `enabled (level ${SENSUAL_VARIANCE_LEVEL})` : 'disabled'}`);
  log(
    `Research microdetail expansion: ${ENABLE_RESEARCH_MICRODETAIL_EXPANSION
      ? `enabled (targetWords=${PROMPT_TARGET_WORDS})`
      : 'disabled'}`
  );
  log(`Safe policy hardening: ${SAFE_POLICY_HARDENING ? 'enabled' : 'disabled'}`);
  log(`Safe fallback source: ${SAFE_FALLBACK_SOURCE_NORMALIZED}`);
  log(`Safe transfer primary anchors: ${SAFE_TRANSFER_PRIMARY_ANCHORS ? 'enabled' : 'disabled'}`);
  log(`Edge priority multiplier: ${EDGE_PRIORITY_MULTIPLIER}x`);
  log(
    `Edge-first acceptance: ${EDGE_FIRST_ACCEPTANCE_MODE
      ? `enabled (edge>=${EDGE_FIRST_ACCEPTANCE_EDGE_MIN}, id>=${EDGE_FIRST_ACCEPTANCE_IDENTITY_MIN}, gaze>=${EDGE_FIRST_ACCEPTANCE_GAZE_MIN}, attire>=${EDGE_FIRST_ACCEPTANCE_ATTIRE_MIN}, scene>=${EDGE_FIRST_ACCEPTANCE_SCENE_MIN}, pose>=${EDGE_FIRST_ACCEPTANCE_POSE_MIN})`
      : 'disabled'}`
  );
  log(
    `Direct camera gaze override: ${DIRECT_CAMERA_GAZE_OVERRIDE ? `enabled (realism level ${PHYSICS_REALISM_OVERRIDE_LEVEL})` : 'disabled'}`
  );
  log(`Physics/realism priority multiplier: ${PHYSICS_REALISM_PRIORITY_MULTIPLIER}x`);
  log(
    `Physics/realism prompt hard mode: ${PHYSICS_REALISM_PROMPT_HARD_MODE
      ? `enabled (density ${PHYSICS_REALISM_PROMPT_DENSITY})`
      : 'disabled'}`
  );
  log(`Anti-AI realism boost: ${ANTI_AI_REALISM_BOOST ? `enabled (level ${ANTI_AI_REALISM_LEVEL})` : 'disabled'}`);
  log(`Quality gate: ${ENABLE_QUALITY_GATE ? `enabled (scorer=${SCORER_MODEL})` : 'disabled'}`);
  log(`Scorer unavailable policy: ${SCORER_UNAVAILABLE_POLICY}`);
  log(`Scorer schema enforcement: ${SCORER_FORCE_SCHEMA ? 'enabled' : 'disabled'}`);
  log(`Scorer compact prompt: ${SCORER_COMPACT_PROMPT ? 'enabled' : 'disabled'}`);
  log(
    `Physics checklist gate: ${PHYSICS_CHECKLIST_ENFORCE
      ? `enabled (min ${PHYSICS_CHECKLIST_MIN})`
      : 'disabled'}`
  );
  log(
    `Scorer parse repair: retries=${SCORER_PARSE_REPAIR_RETRIES}, heuristicMinFields=${SCORER_HEURISTIC_MIN_FIELDS}, repairMaxTokens=${SCORER_REPAIR_MAX_OUTPUT_TOKENS}`
  );
  log(
    `Scorer parse requery: ${SCORER_PARSE_REQUERY_ON_FAIL
      ? `enabled (maxTokens=${SCORER_PARSE_REQUERY_MAX_OUTPUT_TOKENS})`
      : 'disabled'}`
  );
  log(`Scorer self-heal retries: ${SCORER_SELF_HEAL_RETRIES}`);
  log(`Primary rescue: ${ENABLE_PRIMARY_RESCUE ? `enabled (maxAttempts=${PRIMARY_RESCUE_MAX_ATTEMPTS})` : 'disabled'}`);
  log(
    `Primary uplift rescue: ${ENABLE_PRIMARY_UPLIFT_RESCUE
      ? `enabled (overall>=${UPLIFT_TARGET_OVERALL}, id>=${UPLIFT_TARGET_IDENTITY}, gaze>=${UPLIFT_TARGET_GAZE}, attire>=${UPLIFT_TARGET_ATTIRE}, edge>=${UPLIFT_TARGET_EDGE}, realism>=${UPLIFT_TARGET_REALISM}, physics>=${UPLIFT_TARGET_PHYSICS})`
      : 'disabled'}`
  );

  for (let i = 0; i < parsedPrompts.length; i += 1) {
    const prompt = parsedPrompts[i];
    const promptLabel = `${prompt.id} ${prompt.title}`;
    const promptSlug = `${prompt.id}-${slugify(prompt.title)}`;
    const primaryIntentDigest = extractPromptIntentDigest(prompt.primaryPrompt);
    const safePromptBaseSource = SAFE_FALLBACK_SOURCE_NORMALIZED === 'primary_prompt'
      ? prompt.primaryPrompt
      : prompt.safePrompt;
    const primaryAnchorTransferBlock = (
      SAFE_FALLBACK_SOURCE_NORMALIZED === 'safe_prompt'
      && SAFE_TRANSFER_PRIMARY_ANCHORS
    )
      ? buildPrimaryAnchorTransferBlock(prompt.primaryPrompt)
      : '';
    const safeIntentSourceText = primaryAnchorTransferBlock
      ? `${safePromptBaseSource}\n\n${primaryAnchorTransferBlock}`
      : safePromptBaseSource;
    const safeIntentDigest = extractPromptIntentDigest(safeIntentSourceText);
    const primaryPromptTextBase = applyPromptOverrides(prompt.primaryPrompt, 'primary', {
      promptId: prompt.id,
      title: prompt.title
    });
    const safePromptSourceText = safeIntentSourceText;
    const safePromptTextBase = applyPromptOverrides(safePromptSourceText, 'safe', {
      promptId: prompt.id,
      title: prompt.title
    });
    const primaryPromptText = applyPromptNonce(primaryPromptTextBase, {
      runNonce,
      promptId: prompt.id,
      variant: 'primary',
      attemptIndex: 1
    });
    const safePromptText = applyPromptNonce(safePromptTextBase, {
      runNonce,
      promptId: prompt.id,
      variant: 'safe',
      attemptIndex: 1
    });
    const primaryPromptHash = shortHash(primaryPromptText, 24);
    const safePromptHash = shortHash(safePromptText, 24);

    let primaryRescuePromptText = null;
    let primaryRescuePromptHash = null;

    log(`[${i + 1}/${parsedPrompts.length}] ${promptLabel}: primary attempt`);
    log(`[${i + 1}/${parsedPrompts.length}] ${promptLabel}: primary promptHash=${primaryPromptHash}`);

    const primaryResult = await callImageModel({
      promptText: primaryPromptText,
      referenceInlineData,
      label: `Prompt ${prompt.id} primary`
    });

    const promptRecord = {
      id: prompt.id,
      title: prompt.title,
      primaryWordCount: prompt.primaryWordCount,
      safeWordCount: prompt.safeWordCount,
      primaryWordCountEffective: countWords(primaryPromptText),
      safeWordCountEffective: countWords(safePromptText),
      primaryPromptHash,
      safePromptHash,
      attempts: [],
      finalStatus: 'failed',
      chosenVariant: null,
      outputFile: null,
      qualityFinal: null
    };

    if (primaryResult.ok) {
      const primarySaved = await saveImagePart(primaryResult.imagePart, path.join(runDir, `${promptSlug}-primary-a1`));
      const primaryQuality = await evaluateImageQualityWithSelfHealing({
        promptId: prompt.id,
        title: prompt.title,
        variant: 'primary',
        promptIntentDigest: primaryIntentDigest,
        referenceInlineData,
        imagePart: primaryResult.imagePart,
        logLabel: `[${i + 1}/${parsedPrompts.length}] ${promptLabel}: primary quality`
      });
      recordQualityTotals(summary, primaryQuality);

      promptRecord.attempts.push({
        variant: 'primary',
        attemptIndex: 1,
        success: true,
        promptHash: primaryPromptHash,
        outputFile: primarySaved.outputPath,
        mimeType: primarySaved.mimeType,
        bytes: primarySaved.bytes,
        responseHeaders: primaryResult.responseHeaders || null,
        quality: primaryQuality
      });

      let chosenPrimary = {
        variant: 'primary',
        attemptIndex: 1,
        promptHash: primaryPromptHash,
        outputFile: primarySaved.outputPath,
        quality: primaryQuality
      };

      const upliftDeficiencies = ENABLE_QUALITY_GATE && ENABLE_PRIMARY_UPLIFT_RESCUE
        ? collectUpliftDeficiencies(primaryQuality)
        : [];
      const shouldRunPrimaryRescue = ENABLE_QUALITY_GATE && ENABLE_PRIMARY_RESCUE && (
        (primaryQuality.scorerAvailable && !primaryQuality.pass)
        || upliftDeficiencies.length > 0
        || (!primaryQuality.scorerAvailable && primaryQuality.scorerError?.errorType === 'parse')
      );

      if (shouldRunPrimaryRescue) {
        summary.totals.primaryRescueTriggered += 1;
        const rescueReason = primaryQuality.scorerAvailable
          ? (primaryQuality.pass
            ? `primary passed but below uplift targets (${upliftDeficiencies.join(', ')})`
            : 'primary quality below threshold')
          : 'primary score parse failure';
        log(`[${i + 1}/${parsedPrompts.length}] ${promptLabel}: ${rescueReason}`);

        for (let rescueRound = 1; rescueRound <= PRIMARY_RESCUE_MAX_ATTEMPTS; rescueRound += 1) {
          const rescueAttemptIndex = rescueRound + 1;
          const rescueVariant = rescueRound === 1 ? 'primary-rescue' : `primary-rescue-${rescueRound}`;
          const qualityForRescue = chosenPrimary.quality || primaryQuality;
          const rescuePromptBase = buildPrimaryRescuePrompt({
            basePrompt: primaryPromptTextBase,
            qualityEvaluation: qualityForRescue,
            rescueRound
          });
          primaryRescuePromptText = applyPromptNonce(rescuePromptBase, {
            runNonce,
            promptId: prompt.id,
            variant: rescueVariant,
            attemptIndex: rescueAttemptIndex
          });
          primaryRescuePromptHash = shortHash(primaryRescuePromptText, 24);
          log(
            `[${i + 1}/${parsedPrompts.length}] ${promptLabel}: running ${rescueVariant}`
            + ` ${rescueRound}/${PRIMARY_RESCUE_MAX_ATTEMPTS} (promptHash=${primaryRescuePromptHash})`
          );

          const primaryRescueResult = await callImageModel({
            promptText: primaryRescuePromptText,
            referenceInlineData,
            label: `Prompt ${prompt.id} ${rescueVariant}`
          });

          if (primaryRescueResult.ok) {
            summary.totals.primaryRescueSuccess += 1;
            const rescueSaved = await saveImagePart(
              primaryRescueResult.imagePart,
              path.join(runDir, `${promptSlug}-primary-a${rescueAttemptIndex}`)
            );
            const rescueQuality = await evaluateImageQualityWithSelfHealing({
              promptId: prompt.id,
              title: prompt.title,
              variant: 'primary',
              promptIntentDigest: primaryIntentDigest,
              referenceInlineData,
              imagePart: primaryRescueResult.imagePart,
              logLabel: `[${i + 1}/${parsedPrompts.length}] ${promptLabel}: ${rescueVariant} quality`
            });
            recordQualityTotals(summary, rescueQuality);

            promptRecord.attempts.push({
              variant: rescueVariant,
              attemptIndex: rescueAttemptIndex,
              success: true,
              promptHash: primaryRescuePromptHash,
              outputFile: rescueSaved.outputPath,
              mimeType: rescueSaved.mimeType,
              bytes: rescueSaved.bytes,
              responseHeaders: primaryRescueResult.responseHeaders || null,
              quality: rescueQuality
            });

            const rescueCandidate = {
              variant: 'primary',
              attemptIndex: rescueAttemptIndex,
              promptHash: primaryRescuePromptHash,
              outputFile: rescueSaved.outputPath,
              quality: rescueQuality
            };
            const chosenAfterRescue = compareQualityForChoice(chosenPrimary, rescueCandidate);
            if (chosenAfterRescue === rescueCandidate) {
              chosenPrimary = rescueCandidate;
              summary.totals.primaryRescueChosen += 1;
              log(
                `[${i + 1}/${parsedPrompts.length}] ${promptLabel}: ${rescueVariant} selected as best primary output`
              );
            } else {
              log(
                `[${i + 1}/${parsedPrompts.length}] ${promptLabel}: kept prior best output after ${rescueVariant}`
              );
            }
          } else {
            promptRecord.attempts.push({
              variant: rescueVariant,
              attemptIndex: rescueAttemptIndex,
              success: false,
              promptHash: primaryRescuePromptHash,
              errorType: primaryRescueResult.errorType,
              status: primaryRescueResult.status || null,
              statusText: primaryRescueResult.statusText || null,
              blockReason: primaryRescueResult.blockReason || null,
              message: primaryRescueResult.message || null,
              responseSnippet: primaryRescueResult.responseSnippet || null,
              responseHeaders: primaryRescueResult.responseHeaders || null
            });
            log(
              `[${i + 1}/${parsedPrompts.length}] ${promptLabel}: ${rescueVariant} failed (${primaryRescueResult.errorType})`
            );
          }

          if (rescueRound >= PRIMARY_RESCUE_MAX_ATTEMPTS) {
            break;
          }

          const currentQuality = chosenPrimary.quality;
          const rescueUpliftDeficiencies = ENABLE_QUALITY_GATE && ENABLE_PRIMARY_UPLIFT_RESCUE
            ? collectUpliftDeficiencies(currentQuality)
            : [];
          const continueDueToFail = ENABLE_QUALITY_GATE && currentQuality?.scorerAvailable && !currentQuality.pass;
          const continueDueToUplift = ENABLE_QUALITY_GATE && ENABLE_PRIMARY_UPLIFT_RESCUE
            && currentQuality?.scorerAvailable && currentQuality.pass && rescueUpliftDeficiencies.length > 0;
          const continueDueToParse = ENABLE_QUALITY_GATE
            && !currentQuality?.scorerAvailable
            && currentQuality?.scorerError?.errorType === 'parse';
          if (continueDueToFail || continueDueToUplift || continueDueToParse) {
            const continuationReason = continueDueToFail
              ? 'still below quality thresholds'
              : continueDueToUplift
                ? `still below uplift targets (${rescueUpliftDeficiencies.join(', ')})`
                : 'scorer parse issue persisted';
            log(
              `[${i + 1}/${parsedPrompts.length}] ${promptLabel}: running another rescue because ${continuationReason}`
            );
            continue;
          }
          break;
        }
      }

      const primaryQualityAccepted = isQualityAcceptableForFinal(chosenPrimary.quality, 'primary');
      if (primaryQualityAccepted) {
        promptRecord.finalStatus = 'success';
        promptRecord.chosenVariant = 'primary';
        promptRecord.outputFile = chosenPrimary.outputFile;
        promptRecord.qualityFinal = chosenPrimary.quality || null;
        summary.totals.primarySuccess += 1;
        log(`[${i + 1}/${parsedPrompts.length}] ${promptLabel}: primary success`);
      } else if (SKIP_SAFE_FALLBACK_ON_PRIMARY_REJECT) {
        summary.totals.failed += 1;
        promptRecord.chosenVariant = 'primary';
        promptRecord.outputFile = chosenPrimary.outputFile;
        promptRecord.qualityFinal = chosenPrimary.quality || null;
        log(
          `[${i + 1}/${parsedPrompts.length}] ${promptLabel}: primary image rejected by quality gate; safe fallback skipped by config`
        );
      } else {
        log(
          `[${i + 1}/${parsedPrompts.length}] ${promptLabel}: primary image rejected by quality gate, trying safe fallback`
        );
        log(`[${i + 1}/${parsedPrompts.length}] ${promptLabel}: safe promptHash=${safePromptHash}`);

        const safeResult = await callImageModel({
          promptText: safePromptText,
          referenceInlineData,
          label: `Prompt ${prompt.id} safe`
        });

        if (safeResult.ok) {
          const safeSaved = await saveImagePart(safeResult.imagePart, path.join(runDir, `${promptSlug}-safe-a1`));
          const safeQuality = await evaluateImageQualityWithSelfHealing({
            promptId: prompt.id,
            title: prompt.title,
            variant: 'safe',
            promptIntentDigest: safeIntentDigest,
            referenceInlineData,
            imagePart: safeResult.imagePart,
            logLabel: `[${i + 1}/${parsedPrompts.length}] ${promptLabel}: safe quality`
          });
          recordQualityTotals(summary, safeQuality);

          promptRecord.attempts.push({
            variant: 'safe',
            attemptIndex: 1,
            success: true,
            promptHash: safePromptHash,
            outputFile: safeSaved.outputPath,
            mimeType: safeSaved.mimeType,
            bytes: safeSaved.bytes,
            responseHeaders: safeResult.responseHeaders || null,
            quality: safeQuality
          });

          const safeQualityAccepted = isQualityAcceptableForFinal(safeQuality, 'safe');
          if (safeQualityAccepted) {
            promptRecord.finalStatus = 'success';
            promptRecord.chosenVariant = 'safe';
            promptRecord.outputFile = safeSaved.outputPath;
            promptRecord.qualityFinal = safeQuality || null;
            summary.totals.safeSuccess += 1;
            log(`[${i + 1}/${parsedPrompts.length}] ${promptLabel}: safe fallback success`);
          } else {
            summary.totals.failed += 1;
            log(`[${i + 1}/${parsedPrompts.length}] ${promptLabel}: safe fallback rejected by quality gate`);
          }
        } else {
          promptRecord.attempts.push({
            variant: 'safe',
            attemptIndex: 1,
            success: false,
            promptHash: safePromptHash,
            errorType: safeResult.errorType,
            status: safeResult.status || null,
            statusText: safeResult.statusText || null,
            blockReason: safeResult.blockReason || null,
            message: safeResult.message || null,
            responseSnippet: safeResult.responseSnippet || null,
            responseHeaders: safeResult.responseHeaders || null
          });
          summary.totals.failed += 1;
          log(`[${i + 1}/${parsedPrompts.length}] ${promptLabel}: safe fallback failed (${safeResult.errorType})`);
        }
      }
    } else {
      promptRecord.attempts.push({
        variant: 'primary',
        attemptIndex: 1,
        success: false,
        promptHash: primaryPromptHash,
        errorType: primaryResult.errorType,
        status: primaryResult.status || null,
        statusText: primaryResult.statusText || null,
        blockReason: primaryResult.blockReason || null,
        message: primaryResult.message || null,
        responseSnippet: primaryResult.responseSnippet || null,
        responseHeaders: primaryResult.responseHeaders || null
      });

      if (SKIP_SAFE_FALLBACK_ON_PRIMARY_REJECT) {
        summary.totals.failed += 1;
        log(
          `[${i + 1}/${parsedPrompts.length}] ${promptLabel}: primary failed (${primaryResult.errorType}); safe fallback skipped by config`
        );
      } else {
        log(`[${i + 1}/${parsedPrompts.length}] ${promptLabel}: primary failed (${primaryResult.errorType}), trying safe fallback`);
        log(`[${i + 1}/${parsedPrompts.length}] ${promptLabel}: safe promptHash=${safePromptHash}`);

        const safeResult = await callImageModel({
          promptText: safePromptText,
          referenceInlineData,
          label: `Prompt ${prompt.id} safe`
        });

        if (safeResult.ok) {
          const safeSaved = await saveImagePart(safeResult.imagePart, path.join(runDir, `${promptSlug}-safe-a1`));
          const safeQuality = await evaluateImageQualityWithSelfHealing({
            promptId: prompt.id,
            title: prompt.title,
            variant: 'safe',
            promptIntentDigest: safeIntentDigest,
            referenceInlineData,
            imagePart: safeResult.imagePart,
            logLabel: `[${i + 1}/${parsedPrompts.length}] ${promptLabel}: safe quality`
          });
          recordQualityTotals(summary, safeQuality);

          promptRecord.attempts.push({
            variant: 'safe',
            attemptIndex: 1,
            success: true,
            promptHash: safePromptHash,
            outputFile: safeSaved.outputPath,
            mimeType: safeSaved.mimeType,
            bytes: safeSaved.bytes,
            responseHeaders: safeResult.responseHeaders || null,
            quality: safeQuality
          });
          const safeQualityAccepted = isQualityAcceptableForFinal(safeQuality, 'safe');
          if (safeQualityAccepted) {
            promptRecord.finalStatus = 'success';
            promptRecord.chosenVariant = 'safe';
            promptRecord.outputFile = safeSaved.outputPath;
            promptRecord.qualityFinal = safeQuality || null;
            summary.totals.safeSuccess += 1;
            log(`[${i + 1}/${parsedPrompts.length}] ${promptLabel}: safe fallback success`);
          } else {
            summary.totals.failed += 1;
            log(`[${i + 1}/${parsedPrompts.length}] ${promptLabel}: safe fallback rejected by quality gate`);
          }
        } else {
          promptRecord.attempts.push({
            variant: 'safe',
            attemptIndex: 1,
            success: false,
            promptHash: safePromptHash,
            errorType: safeResult.errorType,
            status: safeResult.status || null,
            statusText: safeResult.statusText || null,
            blockReason: safeResult.blockReason || null,
            message: safeResult.message || null,
            responseSnippet: safeResult.responseSnippet || null,
            responseHeaders: safeResult.responseHeaders || null
          });
          summary.totals.failed += 1;
          log(`[${i + 1}/${parsedPrompts.length}] ${promptLabel}: safe fallback failed (${safeResult.errorType})`);
        }
      }
    }

    summary.prompts.push(promptRecord);
    if (SAVE_PROMPT_PREVIEW) {
      const preview = {
        id: prompt.id,
        title: prompt.title,
        primaryPromptHash,
        safePromptHash,
        primaryRescuePromptHash,
        primaryIntentDigest,
        safeIntentDigest,
        primaryPromptPreview: primaryPromptText.slice(0, 2000),
        safePromptPreview: safePromptText.slice(0, 2000),
        primaryRescuePromptPreview: primaryRescuePromptText ? primaryRescuePromptText.slice(0, 2000) : null
      };
      await writeJson(path.join(runDir, `${promptSlug}-prompt-preview.json`), preview);
    }
    await writeJson(path.join(runDir, `${promptSlug}-attempts.json`), promptRecord);
    await writeJson(summaryPath, summary);
  }

  log(
    `Finished. primarySuccess=${summary.totals.primarySuccess}, safeSuccess=${summary.totals.safeSuccess}, failed=${summary.totals.failed}`
  );
  log(
    `Quality totals: evaluated=${summary.totals.qualityEvaluated}, pass=${summary.totals.qualityPass}, fail=${summary.totals.qualityFail}, scorerUnavailable=${summary.totals.qualityScorerUnavailable}`
  );
  log(
    `Primary rescue totals: triggered=${summary.totals.primaryRescueTriggered}, success=${summary.totals.primaryRescueSuccess}, chosen=${summary.totals.primaryRescueChosen}`
  );
  log(`Summary: ${summaryPath}`);
}

main().catch(error => {
  const message = error instanceof Error ? `${error.message}\n${error.stack || ''}` : String(error);
  console.error(message);
  process.exit(1);
});
