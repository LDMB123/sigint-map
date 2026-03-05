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
const WAIT_BEFORE_ATTEMPT_S = Math.max(1, parseInt(process.env.WAIT_BEFORE_ATTEMPT_S || '61', 10));
const REQUEST_TIMEOUT_MS = Math.max(30_000, parseInt(process.env.REQUEST_TIMEOUT_MS || '300000', 10));
const REQUEST_TIMEOUT_RETRY_INCREMENT_MS = Math.max(
  0,
  parseInt(process.env.REQUEST_TIMEOUT_RETRY_INCREMENT_MS || '45000', 10)
);
const REQUEST_TIMEOUT_MAX_MS = Math.max(
  REQUEST_TIMEOUT_MS,
  parseInt(process.env.REQUEST_TIMEOUT_MAX_MS || String(Math.max(REQUEST_TIMEOUT_MS, 300000)), 10)
);
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
const SUPPORTED_OUTPUT_IMAGE_SIZES = new Set(['1K', '2K', '4K']);
const OUTPUT_IMAGE_SIZE = (() => {
  const requested = String(process.env.OUTPUT_IMAGE_SIZE || '2K').trim().toUpperCase();
  if (SUPPORTED_OUTPUT_IMAGE_SIZES.has(requested)) {
    return requested;
  }
  return '2K';
})();
const OUTPUT_ASPECT_RATIO = String(process.env.OUTPUT_ASPECT_RATIO || '4:5').trim();
const RESOLUTION_OPTIMIZATION_MODE = process.env.RESOLUTION_OPTIMIZATION_MODE !== '0';
const RESOLUTION_MICRODETAIL_LEVEL = Math.max(
  1,
  Math.min(3, parseInt(process.env.RESOLUTION_MICRODETAIL_LEVEL || '3', 10))
);
const HTTP_CACHE_BYPASS = process.env.HTTP_CACHE_BYPASS !== '0';
const PROMPT_NONCE_ENABLED = process.env.PROMPT_NONCE_ENABLED !== '0';
const PROMPT_NONCE_LENGTH = Math.max(8, Math.min(24, parseInt(process.env.PROMPT_NONCE_LENGTH || '12', 10)));
const SAVE_PROMPT_PREVIEW = process.env.SAVE_PROMPT_PREVIEW === '1';
const REFERENCE_IDENTITY_ONLY_LOCK = process.env.REFERENCE_IDENTITY_ONLY_LOCK !== '0';
const ATTIRE_REPLACEMENT_LOCK = process.env.ATTIRE_REPLACEMENT_LOCK !== '0';
const ENABLE_QUALITY_GATE = process.env.ENABLE_QUALITY_GATE !== '0';
const ENABLE_QUALITY_AUDIT_WHEN_GATE_OFF = process.env.ENABLE_QUALITY_AUDIT_WHEN_GATE_OFF !== '0';
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
const QUALITY_GATE_MAX_OUTPUT_TOKENS = Math.max(600, parseInt(process.env.QUALITY_GATE_MAX_OUTPUT_TOKENS || '1800', 10));
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
const QUALITY_NEAR_PASS_ENABLE = process.env.QUALITY_NEAR_PASS_ENABLE !== '0';
const QUALITY_NEAR_PASS_MIN_OVERALL = Math.max(
  0,
  Math.min(10, parseFloat(process.env.QUALITY_NEAR_PASS_MIN_OVERALL || '9.45'))
);
const QUALITY_NEAR_PASS_MAX_FAILED_DIMS = Math.max(
  1,
  Math.min(3, parseInt(process.env.QUALITY_NEAR_PASS_MAX_FAILED_DIMS || '1', 10))
);
const QUALITY_NEAR_PASS_ALLOWED_KEYS = new Set(
  String(process.env.QUALITY_NEAR_PASS_ALLOWED_KEYS || 'edge')
    .split(',')
    .map(item => item.trim())
    .filter(Boolean)
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
const RATE_LIMIT_FAIL_FAST_MODE = process.env.RATE_LIMIT_FAIL_FAST_MODE !== '0';
const RATE_LIMIT_FAIL_FAST_COOLDOWN_S = Math.max(
  61,
  parseNumberEnv('RATE_LIMIT_FAIL_FAST_COOLDOWN_S', 120)
);
const RATE_LIMIT_FAIL_FAST_MIN_CONSECUTIVE_429 = Math.max(
  1,
  Math.min(6, parseInt(process.env.RATE_LIMIT_FAIL_FAST_MIN_CONSECUTIVE_429 || '2', 10))
);
const RATE_LIMIT_SKIP_SAFE_FALLBACK_ON_PRESSURE = process.env.RATE_LIMIT_SKIP_SAFE_FALLBACK_ON_PRESSURE !== '0';
const RATE_LIMIT_ABORT_RUN_CONSECUTIVE_PROMPTS = Math.max(
  1,
  Math.min(10, parseInt(process.env.RATE_LIMIT_ABORT_RUN_CONSECUTIVE_PROMPTS || '3', 10))
);
const RATE_LIMIT_PRESSURE_DEGRADED_ACCEPT = process.env.RATE_LIMIT_PRESSURE_DEGRADED_ACCEPT !== '0';
const RATE_LIMIT_PRESSURE_DEGRADED_OVERALL_MIN = clamp(
  parseNumberEnv('RATE_LIMIT_PRESSURE_DEGRADED_OVERALL_MIN', 8.95),
  0,
  10
);
const RATE_LIMIT_PRESSURE_DEGRADED_IDENTITY_MIN = clamp(
  parseNumberEnv('RATE_LIMIT_PRESSURE_DEGRADED_IDENTITY_MIN', 9.0),
  0,
  10
);
const RATE_LIMIT_PRESSURE_DEGRADED_GAZE_MIN = clamp(
  parseNumberEnv('RATE_LIMIT_PRESSURE_DEGRADED_GAZE_MIN', 8.9),
  0,
  10
);
const RATE_LIMIT_PRESSURE_DEGRADED_ATTIRE_MIN = clamp(
  parseNumberEnv('RATE_LIMIT_PRESSURE_DEGRADED_ATTIRE_MIN', 9.1),
  0,
  10
);
const RATE_LIMIT_PRESSURE_DEGRADED_REALISM_MIN = clamp(
  parseNumberEnv('RATE_LIMIT_PRESSURE_DEGRADED_REALISM_MIN', 8.9),
  0,
  10
);
const RATE_LIMIT_PRESSURE_DEGRADED_PHYSICS_MIN = clamp(
  parseNumberEnv('RATE_LIMIT_PRESSURE_DEGRADED_PHYSICS_MIN', 8.9),
  0,
  10
);
const ATTIRE_BOLD_BOOST = process.env.ATTIRE_BOLD_BOOST === '1';
const ATTIRE_BOLD_BOOST_LEVEL = Math.max(1, Math.min(3, parseInt(process.env.ATTIRE_BOLD_BOOST_LEVEL || '3', 10)));
const SKIN_FORWARD_STYLING = process.env.SKIN_FORWARD_STYLING === '1';
const SKIN_FORWARD_LEVEL = Math.max(1, Math.min(3, parseInt(process.env.SKIN_FORWARD_LEVEL || '3', 10)));
const SENSUAL_EDITORIAL_BOOST = process.env.SENSUAL_EDITORIAL_BOOST === '1';
const SENSUAL_EDITORIAL_LEVEL = Math.max(1, Math.min(3, parseInt(process.env.SENSUAL_EDITORIAL_LEVEL || '3', 10)));
const SENSUAL_VARIANCE_GUARD = process.env.SENSUAL_VARIANCE_GUARD === '1';
const SENSUAL_VARIANCE_LEVEL = Math.max(1, Math.min(3, parseInt(process.env.SENSUAL_VARIANCE_LEVEL || '2', 10)));
const MICRO_PHYSICS_LANGUAGE_ENFORCEMENT = process.env.MICRO_PHYSICS_LANGUAGE_ENFORCEMENT !== '0';
const ENABLE_RESEARCH_MICRODETAIL_EXPANSION = process.env.ENABLE_RESEARCH_MICRODETAIL_EXPANSION !== '0';
const PROMPT_TARGET_WORDS = Math.max(800, Math.min(4200, parseInt(process.env.PROMPT_TARGET_WORDS || '1800', 10)));
const PROMPT_REINFORCEMENT_MAX_PASSES = Math.max(
  1,
  Math.min(4, parseInt(process.env.PROMPT_REINFORCEMENT_MAX_PASSES || '2', 10))
);
const TARGETED_MICRODETAIL_MODE = process.env.TARGETED_MICRODETAIL_MODE !== '0';
const MICRODETAIL_MODULE_CAP = Math.max(2, Math.min(6, parseInt(process.env.MICRODETAIL_MODULE_CAP || '4', 10)));
const ENABLE_PROMPT_HARD_CAP = process.env.ENABLE_PROMPT_HARD_CAP === '1';
const PROMPT_HARD_CAP_WORDS = Math.max(
  900,
  Math.min(5000, parseInt(process.env.PROMPT_HARD_CAP_WORDS || '3200', 10))
);
const PROMPT_WINDOW_CAP_WORDS = ENABLE_PROMPT_HARD_CAP ? PROMPT_HARD_CAP_WORDS : 5000;
const RICH_PROMPT_MINIMAL_OVERLAY = process.env.RICH_PROMPT_MINIMAL_OVERLAY === '1';
const RICH_PROMPT_MARKER_MIN = Math.max(3, Math.min(8, parseInt(process.env.RICH_PROMPT_MARKER_MIN || '5', 10)));
const RICH_PROMPT_MARKER_MIN_PRIMARY = Math.max(
  2,
  Math.min(8, parseInt(process.env.RICH_PROMPT_MARKER_MIN_PRIMARY || String(RICH_PROMPT_MARKER_MIN || 5), 10))
);
const RICH_PROMPT_MARKER_MIN_SAFE = Math.max(
  2,
  Math.min(8, parseInt(process.env.RICH_PROMPT_MARKER_MIN_SAFE || '3', 10))
);
const RICH_PROMPT_MARKER_MIN_RESCUE = Math.max(
  2,
  Math.min(8, parseInt(process.env.RICH_PROMPT_MARKER_MIN_RESCUE || '3', 10))
);
const PROMPT_WINDOW_PRIMARY_MIN = Math.max(
  900,
  Math.min(PROMPT_WINDOW_CAP_WORDS, parseInt(process.env.PROMPT_WINDOW_PRIMARY_MIN || '1500', 10))
);
const PROMPT_WINDOW_PRIMARY_MAX = Math.max(
  PROMPT_WINDOW_PRIMARY_MIN + 50,
  Math.min(PROMPT_WINDOW_CAP_WORDS, parseInt(process.env.PROMPT_WINDOW_PRIMARY_MAX || '2600', 10))
);
const PROMPT_WINDOW_SAFE_MIN = Math.max(
  900,
  Math.min(PROMPT_WINDOW_CAP_WORDS, parseInt(process.env.PROMPT_WINDOW_SAFE_MIN || '1300', 10))
);
const PROMPT_WINDOW_SAFE_MAX = Math.max(
  PROMPT_WINDOW_SAFE_MIN + 50,
  Math.min(PROMPT_WINDOW_CAP_WORDS, parseInt(process.env.PROMPT_WINDOW_SAFE_MAX || '2400', 10))
);
const PROMPT_WINDOW_RESCUE_MIN = Math.max(
  900,
  Math.min(PROMPT_WINDOW_CAP_WORDS, parseInt(process.env.PROMPT_WINDOW_RESCUE_MIN || '1500', 10))
);
const PROMPT_WINDOW_RESCUE_MAX = Math.max(
  PROMPT_WINDOW_RESCUE_MIN + 50,
  Math.min(PROMPT_WINDOW_CAP_WORDS, parseInt(process.env.PROMPT_WINDOW_RESCUE_MAX || '2600', 10))
);
const PROMPT_BUILD_DIAGNOSTICS = process.env.PROMPT_BUILD_DIAGNOSTICS === '1';
const FIRST_PRINCIPLES_RECOMPILER_MODE = process.env.FIRST_PRINCIPLES_RECOMPILER_MODE !== '0';
const FIRST_PRINCIPLES_SIGNAL_LEVEL = Math.max(
  1,
  Math.min(3, parseInt(process.env.FIRST_PRINCIPLES_SIGNAL_LEVEL || '3', 10))
);
const FIRST_PRINCIPLES_APPEND_RAW_PROMPT = process.env.FIRST_PRINCIPLES_APPEND_RAW_PROMPT === '1';
const FIRST_PRINCIPLES_DIRECTIVE_CAP = Math.max(
  4,
  Math.min(14, parseInt(process.env.FIRST_PRINCIPLES_DIRECTIVE_CAP || '10', 10))
);
const NO_IMAGE_RECOVERY_RECOMPILER_MODE = process.env.NO_IMAGE_RECOVERY_RECOMPILER_MODE !== '0';
const STALE_RUN_RECONCILE_ENABLED = process.env.STALE_RUN_RECONCILE_ENABLED !== '0';
const STALE_RUN_MINUTES = Math.max(5, Math.min(240, parseInt(process.env.STALE_RUN_MINUTES || '20', 10)));
const SCORER_STRICT_REQUERY_SCHEMA = process.env.SCORER_STRICT_REQUERY_SCHEMA !== '0';
const SAFE_POLICY_HARDENING = process.env.SAFE_POLICY_HARDENING !== '0';
const IMAGE_SAFETY_COMPLIANCE_MODE = process.env.IMAGE_SAFETY_COMPLIANCE_MODE !== '0';
const IMAGE_SAFETY_COMPLIANCE_LEVEL = Math.max(
  1,
  Math.min(3, parseInt(process.env.IMAGE_SAFETY_COMPLIANCE_LEVEL || '2', 10))
);
const IMAGE_SAFETY_COMPLIANCE_DROP_LINES = process.env.IMAGE_SAFETY_COMPLIANCE_DROP_LINES !== '0';
const SAFE_FALLBACK_SOURCE = (process.env.SAFE_FALLBACK_SOURCE || 'safe_prompt').trim().toLowerCase();
const SAFE_FALLBACK_SOURCE_NORMALIZED = SAFE_FALLBACK_SOURCE === 'primary_prompt' ? 'primary_prompt' : 'safe_prompt';
const SAFE_TRANSFER_PRIMARY_ANCHORS = process.env.SAFE_TRANSFER_PRIMARY_ANCHORS !== '0';
const SAFE_ANCHOR_SANITIZE = process.env.SAFE_ANCHOR_SANITIZE !== '0';
const SAFE_IMAGE_SAFETY_RETRY_ENABLED = process.env.SAFE_IMAGE_SAFETY_RETRY_ENABLED !== '0';
const SAFE_IMAGE_SAFETY_RETRY_MAX_ATTEMPTS = Math.max(
  0,
  Math.min(2, parseInt(process.env.SAFE_IMAGE_SAFETY_RETRY_MAX_ATTEMPTS || '2', 10))
);
const SAFE_IMAGE_SAFETY_RETRY_PROMPT_WORD_CAP = Math.max(
  400,
  Math.min(5000, parseInt(process.env.SAFE_IMAGE_SAFETY_RETRY_PROMPT_WORD_CAP || '2800', 10))
);
const SAFE_IMAGE_SAFETY_RETRY_COMPACT_FINAL = process.env.SAFE_IMAGE_SAFETY_RETRY_COMPACT_FINAL !== '0';
const SAFE_IMAGE_SAFETY_RETRY_ULTRA_WORD_CAP = Math.max(
  500,
  Math.min(4500, parseInt(process.env.SAFE_IMAGE_SAFETY_RETRY_ULTRA_WORD_CAP || '2600', 10))
);
const SAFE_QUALITY_RESCUE_MAX_ATTEMPTS = Math.max(
  0,
  Math.min(3, parseInt(process.env.SAFE_QUALITY_RESCUE_MAX_ATTEMPTS || '2', 10))
);
const RESCUE_SUPERPOSITION_MODE = process.env.RESCUE_SUPERPOSITION_MODE !== '0';
const RESCUE_SUPERPOSITION_TOP_BRANCHES = Math.max(
  1,
  Math.min(4, parseInt(process.env.RESCUE_SUPERPOSITION_TOP_BRANCHES || '3', 10))
);
const RESCUE_SUPERPOSITION_DIRECTIVE_CAP = Math.max(
  6,
  Math.min(18, parseInt(process.env.RESCUE_SUPERPOSITION_DIRECTIVE_CAP || '12', 10))
);
const RESCUE_SUPERPOSITION_MIN_BRANCH_SCORE = Math.max(
  0,
  Math.min(10, parseFloat(process.env.RESCUE_SUPERPOSITION_MIN_BRANCH_SCORE || '1.8'))
);
const SCORER_INTENT_DIGEST_MAX_CHARS = Math.max(
  500,
  Math.min(2400, parseInt(process.env.SCORER_INTENT_DIGEST_MAX_CHARS || '900', 10))
);
const SCORER_UNAVAILABLE_POLICY = (process.env.SCORER_UNAVAILABLE_POLICY || 'soft_accept').trim().toLowerCase();
const IDENTITY_FALLBACK_AUDIT_ENABLED = process.env.IDENTITY_FALLBACK_AUDIT_ENABLED !== '0';
const IDENTITY_FALLBACK_AUDIT_MIN_SCORE = Math.max(
  0,
  Math.min(10, parseFloat(process.env.IDENTITY_FALLBACK_AUDIT_MIN_SCORE || '9.0'))
);
const IDENTITY_FALLBACK_AUDIT_MAX_OUTPUT_TOKENS = Math.max(
  120,
  Math.min(1200, parseInt(process.env.IDENTITY_FALLBACK_AUDIT_MAX_OUTPUT_TOKENS || '600', 10))
);
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
  Math.min(3000, parseInt(process.env.SCORER_REPAIR_MAX_OUTPUT_TOKENS || '900', 10))
);
const SCORER_SELF_HEAL_RETRIES = Math.max(
  0,
  Math.min(3, parseInt(process.env.SCORER_SELF_HEAL_RETRIES || '1', 10))
);
const SCORER_PARSE_REQUERY_ON_FAIL = process.env.SCORER_PARSE_REQUERY_ON_FAIL !== '0';
const SCORER_PARSE_REQUERY_MAX_OUTPUT_TOKENS = Math.max(
  280,
  Math.min(3500, parseInt(process.env.SCORER_PARSE_REQUERY_MAX_OUTPUT_TOKENS || '1400', 10))
);
const SCORER_FORCE_SCHEMA = process.env.SCORER_FORCE_SCHEMA !== '0';
const SCORER_COMPACT_PROMPT = process.env.SCORER_COMPACT_PROMPT === '1';
const HEURISTIC_SCORER_AUDIT_ONLY = process.env.HEURISTIC_SCORER_AUDIT_ONLY !== '0';
const IMAGE_HTTP_RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504]);
const RATE_LIMIT_ADAPTIVE_COOLDOWN = process.env.RATE_LIMIT_ADAPTIVE_COOLDOWN === '1';
const RATE_LIMIT_COOLDOWN_BASE_S = Math.max(0, parseNumberEnv('RATE_LIMIT_COOLDOWN_BASE_S', 61));
const RATE_LIMIT_COOLDOWN_MAX_S = Math.max(
  RATE_LIMIT_COOLDOWN_BASE_S,
  parseNumberEnv('RATE_LIMIT_COOLDOWN_MAX_S', 120)
);
const RATE_LIMIT_COOLDOWN_GROWTH = Math.max(1, parseNumberEnv('RATE_LIMIT_COOLDOWN_GROWTH', 1.7));
const RATE_LIMIT_COOLDOWN_DECAY_S = Math.max(0, parseNumberEnv('RATE_LIMIT_COOLDOWN_DECAY_S', 4));
const RATE_LIMIT_RETRY_FLOOR_S = Math.max(0, parseNumberEnv('RATE_LIMIT_RETRY_FLOOR_S', 61));
const RATE_LIMIT_RETRY_MAX_S = Math.max(
  RATE_LIMIT_RETRY_FLOOR_S,
  parseNumberEnv('RATE_LIMIT_RETRY_MAX_S', Math.max(120, RATE_LIMIT_COOLDOWN_MAX_S))
);
const RATE_LIMIT_RESCUE_ABORT_COOLDOWN_S = Math.max(
  61,
  parseNumberEnv('RATE_LIMIT_RESCUE_ABORT_COOLDOWN_S', 180)
);
const ATTEMPT_WAIT_JITTER_S = Math.max(0, parseNumberEnv('ATTEMPT_WAIT_JITTER_S', 0));
const STRICT_61S_ATTEMPT_PACING = process.env.STRICT_61S_ATTEMPT_PACING !== '0';
const PHYSICS_DENSITY_MULTIPLIER = Math.max(1, parseNumberEnv('PHYSICS_DENSITY_MULTIPLIER', 1));
const PHYSICS_DENSITY_BASELINE_PROMPT_ID = String(process.env.PHYSICS_DENSITY_BASELINE_PROMPT_ID || '21').trim();
const PHYSICS_DENSITY_BASELINE_PROMPT_FILE = String(
  process.env.PHYSICS_DENSITY_BASELINE_PROMPT_FILE
  || path.join(__dirname, 'speakeasy_prompts_21_40_ultra_edge_v21_daring_microphysics_1500.md')
).trim();
const PHYSICS_DENSITY_MIN_RATIO = Math.max(
  1,
  parseNumberEnv('PHYSICS_DENSITY_MIN_RATIO', PHYSICS_DENSITY_MULTIPLIER)
);
const MICRO_PHYSICS_BANNED_TERMS_MODE = String(process.env.MICRO_PHYSICS_BANNED_TERMS || 'warn')
  .trim()
  .toLowerCase();
const MICRO_PHYSICS_BANNED_TERMS_STRICT = MICRO_PHYSICS_BANNED_TERMS_MODE === 'strict';
const MICRODETAIL_PROFILE_LOCK = process.env.MICRODETAIL_PROFILE_LOCK !== '0';
const EXPECT_MICRODETAIL_PROFILE = process.env.EXPECT_MICRODETAIL_PROFILE === '1';
const PRESSURE_PAUSE_ENABLED = process.env.PRESSURE_PAUSE_ENABLED !== '0';
const PRESSURE_PAUSE_CONSECUTIVE_PROMPTS = Math.max(
  1,
  Math.min(6, parseInt(process.env.PRESSURE_PAUSE_CONSECUTIVE_PROMPTS || '2', 10))
);
const PRESSURE_PAUSE_COOLDOWN_MIN = Math.max(
  1,
  Math.min(120, parseInt(process.env.PRESSURE_PAUSE_COOLDOWN_MIN || '15', 10))
);
const PRESSURE_PAUSE_MAX_CYCLES = Math.max(
  1,
  Math.min(20, parseInt(process.env.PRESSURE_PAUSE_MAX_CYCLES || '6', 10))
);
const AUTO_RESUME_ENABLED = process.env.AUTO_RESUME_ENABLED !== '0';
const AUTO_RESUME_POLL_S = Math.max(5, Math.min(300, parseInt(process.env.AUTO_RESUME_POLL_S || '30', 10)));
const RESUME_FROM_PROMPT_ID_RAW = String(process.env.RESUME_FROM_PROMPT_ID || '').trim();
const RUN_OUTPUT_DIR = String(process.env.RUN_OUTPUT_DIR || '').trim();
const PREFLIGHT_ONLY = process.env.PREFLIGHT_ONLY === '1';
const PROMPT_ID_FILTER = new Set(
  String(process.env.PROMPT_ID_FILTER || '')
    .split(',')
    .map(item => item.trim())
    .filter(Boolean)
);

let runtimePromptReinforcementPasses = PROMPT_REINFORCEMENT_MAX_PASSES;
let runtimeMicrodetailModuleCap = MICRODETAIL_MODULE_CAP;
let runtimePhysicsPriorityMultiplier = PHYSICS_REALISM_PRIORITY_MULTIPLIER;
let runtimeRescueDirectiveCap = RESCUE_SUPERPOSITION_DIRECTIVE_CAP;

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

const IDENTITY_FALLBACK_AUDIT_RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    identityScore: { type: 'NUMBER' },
    directGazeScore: { type: 'NUMBER' },
    identityPass: { type: 'BOOLEAN' },
    diagnostics: { type: 'STRING' }
  },
  required: ['identityScore', 'directGazeScore', 'identityPass', 'diagnostics']
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

function computeRequestTimeoutMs(attempt = 1) {
  const safeAttempt = Math.max(1, Number(attempt) || 1);
  const timeoutMs = REQUEST_TIMEOUT_MS + (safeAttempt - 1) * REQUEST_TIMEOUT_RETRY_INCREMENT_MS;
  return Math.min(REQUEST_TIMEOUT_MAX_MS, timeoutMs);
}

async function waitBeforeAttempt(seconds, label) {
  const baseSeconds = Math.max(0, Number(seconds) || 0);
  let effectiveSeconds = baseSeconds;

  if (!STRICT_61S_ATTEMPT_PACING && RATE_LIMIT_ADAPTIVE_COOLDOWN) {
    const remainingCooldownMs = adaptiveRateLimitCooldownUntilMs - Date.now();
    if (remainingCooldownMs > 0) {
      const remainingCooldownS = Math.ceil(remainingCooldownMs / 1000);
      effectiveSeconds = Math.max(effectiveSeconds, remainingCooldownS);
    }
  }

  const jitterSeconds = STRICT_61S_ATTEMPT_PACING
    ? 0
    : ATTEMPT_WAIT_JITTER_S > 0
    ? Math.random() * ATTEMPT_WAIT_JITTER_S
    : 0;
  const totalSeconds = STRICT_61S_ATTEMPT_PACING
    ? 61
    : effectiveSeconds + jitterSeconds;

  const details = [];
  details.push(`base=${baseSeconds}s`);
  if (!STRICT_61S_ATTEMPT_PACING && effectiveSeconds > baseSeconds) {
    details.push(`rateLimitCooldown=${effectiveSeconds}s`);
  }
  if (!STRICT_61S_ATTEMPT_PACING && jitterSeconds > 0) {
    details.push(`jitter=+${jitterSeconds.toFixed(1)}s`);
  }
  if (STRICT_61S_ATTEMPT_PACING) {
    details.push('strictInvariant=61s');
  }
  if (STRICT_61S_ATTEMPT_PACING && Math.abs(totalSeconds - 61) > 0.001) {
    throw new Error(`Attempt pacing invariant violated for ${label}: expected 61.0s, got ${totalSeconds.toFixed(1)}s`);
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

function getAdaptiveCooldownRemainingMs() {
  if (!RATE_LIMIT_ADAPTIVE_COOLDOWN) return 0;
  return Math.max(0, adaptiveRateLimitCooldownUntilMs - Date.now());
}

function shouldAbortRescueDueToRateLimitPressure(errorType, status = null) {
  if (!RATE_LIMIT_ADAPTIVE_COOLDOWN) return false;
  if (String(errorType || '').toLowerCase() !== 'http') return false;
  if (Number(status) !== 429) return false;
  const cooldownS = getAdaptiveCooldownRemainingMs() / 1000;
  return cooldownS >= RATE_LIMIT_RESCUE_ABORT_COOLDOWN_S;
}

function isRateLimitFailFastPressure(errorType, status = null) {
  if (!RATE_LIMIT_FAIL_FAST_MODE || !RATE_LIMIT_ADAPTIVE_COOLDOWN) return false;
  const normalizedError = String(errorType || '').toLowerCase();
  if (normalizedError !== 'rate_limit_pressure' && !(normalizedError === 'http' && Number(status) === 429)) {
    return false;
  }
  const cooldownS = getAdaptiveCooldownRemainingMs() / 1000;
  return cooldownS >= RATE_LIMIT_FAIL_FAST_COOLDOWN_S;
}

function is429HttpFailure(errorType, status = null, metrics = null) {
  const normalizedError = String(errorType || '').toLowerCase();
  if (normalizedError === 'rate_limit_pressure') return true;
  if (normalizedError === 'http' && Number(status) === 429) return true;
  const metricReason = String(metrics?.finalFailureReason || '').toLowerCase();
  if (metricReason.startsWith('rate_limit_pressure')) return true;
  if (metricReason === 'http_429') return true;
  return false;
}

function isPromptRateLimitPressure(promptRecord) {
  if (!promptRecord || promptRecord.finalStatus === 'success') {
    return false;
  }

  const telemetry = promptRecord.telemetry || {};
  const finalFailure = String(telemetry.finalFailureReason || '').toLowerCase();
  if (
    finalFailure.startsWith('rate_limit_pressure')
    || finalFailure === 'http_429'
    || isRateLimitFailFastPressure(finalFailure, 429)
  ) {
    return true;
  }

  const attempts = Array.isArray(promptRecord.attempts) ? promptRecord.attempts : [];
  const failedAttempts = attempts.filter(attempt => !attempt?.success);
  if (!failedAttempts.length) {
    return false;
  }

  const has429PressureSignal = failedAttempts.some(attempt => is429HttpFailure(
    attempt?.errorType,
    attempt?.status,
    attempt?.requestMetrics || null
  ));
  if (!has429PressureSignal) {
    return false;
  }

  // Treat as pressure only if every failed terminal attempt was a 429-style failure.
  return failedAttempts.every(attempt => is429HttpFailure(
    attempt?.errorType,
    attempt?.status,
    attempt?.requestMetrics || null
  ));
}

function hasAny429Failure(attempts = []) {
  if (!Array.isArray(attempts) || !attempts.length) {
    return false;
  }
  return attempts.some(attempt => !attempt?.success && is429HttpFailure(
    attempt?.errorType,
    attempt?.status,
    attempt?.requestMetrics || null
  ));
}

function isPressureDegradedQualityAcceptable(quality) {
  if (!RATE_LIMIT_PRESSURE_DEGRADED_ACCEPT) {
    return false;
  }
  if (!quality?.scorerAvailable || !quality?.scores) {
    return false;
  }

  const scores = quality.scores || {};
  const identity = clamp(Number(scores.identity) || 0, 0, 10);
  const gaze = clamp(Number(scores.gaze) || 0, 0, 10);
  const attire = clamp(Number(scores.attireReplacement) || 0, 0, 10);
  const realism = clamp(Number(scores.realism) || 0, 0, 10);
  const physics = clamp(Number(scores.physics) || 0, 0, 10);
  const overall = clamp(Number(quality?.overallScore) || 0, 0, 10);
  const checklistFailures = Array.isArray(quality?.physicsChecklistFailures)
    ? quality.physicsChecklistFailures.length
    : 0;

  return (
    checklistFailures === 0
    && overall >= RATE_LIMIT_PRESSURE_DEGRADED_OVERALL_MIN
    && identity >= RATE_LIMIT_PRESSURE_DEGRADED_IDENTITY_MIN
    && gaze >= RATE_LIMIT_PRESSURE_DEGRADED_GAZE_MIN
    && attire >= RATE_LIMIT_PRESSURE_DEGRADED_ATTIRE_MIN
    && realism >= RATE_LIMIT_PRESSURE_DEGRADED_REALISM_MIN
    && physics >= RATE_LIMIT_PRESSURE_DEGRADED_PHYSICS_MIN
  );
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

function isImageSafetyBlockReason(blockReason) {
  return /IMAGE_SAFETY/i.test(String(blockReason || ''));
}

function countWords(text) {
  const trimmed = String(text || '').trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

function trimTextToWordLimit(text, maxWords) {
  const limit = Number.isFinite(maxWords) ? Math.max(1, Math.floor(maxWords)) : 0;
  const normalized = String(text || '').trim();
  if (!limit || !normalized) {
    return normalized;
  }

  const lines = normalized.split(/\r?\n/);
  const output = [];
  let remaining = limit;

  for (const rawLine of lines) {
    if (remaining <= 0) {
      break;
    }
    const line = rawLine.trim();
    if (!line) {
      if (output.length && output[output.length - 1] !== '') {
        output.push('');
      }
      continue;
    }
    const words = line.split(/\s+/);
    if (words.length <= remaining) {
      output.push(line);
      remaining -= words.length;
      continue;
    }
    output.push(words.slice(0, remaining).join(' '));
    remaining = 0;
  }

  return output.join('\n').trim();
}

function enforcePromptHardCap(promptText, variant = 'primary', promptMeta = {}) {
  const normalized = String(promptText || '').trim();
  if (!ENABLE_PROMPT_HARD_CAP || !normalized) {
    return normalized;
  }
  if (countWords(normalized) <= PROMPT_HARD_CAP_WORDS) {
    return normalized;
  }
  const capped = trimTextToWordLimit(normalized, PROMPT_HARD_CAP_WORDS);
  const label = promptMeta?.promptId && promptMeta?.title
    ? `${promptMeta.promptId} ${promptMeta.title}`
    : (promptMeta?.title || promptMeta?.promptId || 'n/a');
  log(`Prompt hard-cap applied (${variant}, ${label}): ${countWords(normalized)} -> ${countWords(capped)} words`);
  return capped;
}

const RICH_PROMPT_MARKERS = [
  /\bIDENTITY LOCK\b/i,
  /\bSCENE ANCHORS\b/i,
  /\bATTIRE LOCK\b/i,
  /\bPOSE\b/i,
  /\bMANDATORY LOCKS\b/i,
  /\bATTIRE CONCEPT\b/i,
  /\bSTABILITY PHYSICS\b/i,
  /\bMICRO-DETAIL REQUIREMENTS\b/i,
  /\bMICRO-?PHYSICS\b/i,
  /\bFORENSIC\b/i,
  /\bHARD REJECT\b/i
];

const PROMPT_WINDOW_PROTECTED_HEADING = /^(IDENTITY LOCK|SCENE ANCHORS|ATTIRE LOCK|POSE(?:\s*\+\s*FRAMING)? LOCK|MICRO-?PHYSICS STACK|FORENSIC MICRO-DETAIL CHECKLIST|HARD REJECT)\b/i;
const PROMPT_WINDOW_ANY_HEADING = /^[A-Z0-9][A-Z0-9\s+()'\/-]{2,}:\s*$/;
const PROMPT_LOW_PRIORITY_GUARDRAIL_PATTERNS = [
  /POLICY-SAFE FASHION GUARDRAILS/i,
  /IMAGE SAFETY RETRY OVERRIDE/i,
  /^Hard safety boundary/i,
  /^Safe retry hard invariants/i,
  /^Strict enforcement/i,
  /^DISALLOWED/i
];
const PROMPT_REDUNDANT_STYLE_PATTERNS = [
  /keep.*non-explicit/i,
  /keep.*adult.*only/i,
  /high-fashion editorial/i,
  /sultry/i,
  /edge-forward/i
];

function resolveVariantFamily(variant = 'primary') {
  const normalized = String(variant || 'primary').toLowerCase();
  if (normalized.startsWith('primary-rescue') || normalized.startsWith('safe-retry')) {
    return 'rescue';
  }
  if (normalized.startsWith('safe')) {
    return 'safe';
  }
  return 'primary';
}

function getRichPromptMarkerMin(variant = 'primary') {
  const family = resolveVariantFamily(variant);
  if (family === 'safe') return RICH_PROMPT_MARKER_MIN_SAFE;
  if (family === 'rescue') return RICH_PROMPT_MARKER_MIN_RESCUE;
  return RICH_PROMPT_MARKER_MIN_PRIMARY;
}

function getPromptWindow(variant = 'primary', { minWords = null, maxWords = null } = {}) {
  const family = resolveVariantFamily(variant);
  let baseMin = PROMPT_WINDOW_PRIMARY_MIN;
  let baseMax = PROMPT_WINDOW_PRIMARY_MAX;
  if (family === 'safe') {
    baseMin = PROMPT_WINDOW_SAFE_MIN;
    baseMax = PROMPT_WINDOW_SAFE_MAX;
  } else if (family === 'rescue') {
    baseMin = PROMPT_WINDOW_RESCUE_MIN;
    baseMax = PROMPT_WINDOW_RESCUE_MAX;
  }
  const effectiveMin = Number.isFinite(minWords) ? Math.max(900, Math.floor(minWords)) : baseMin;
  const effectiveMax = Number.isFinite(maxWords) ? Math.max(effectiveMin + 40, Math.floor(maxWords)) : baseMax;
  return {
    family,
    minWords: Math.min(effectiveMin, PROMPT_WINDOW_CAP_WORDS),
    maxWords: Math.min(effectiveMax, PROMPT_WINDOW_CAP_WORDS)
  };
}

function getAdaptiveReinforcementPassCap() {
  return Math.max(
    1,
    Math.min(
      18,
      Math.max(runtimePromptReinforcementPasses, Math.ceil(PHYSICS_DENSITY_MULTIPLIER * 2))
    )
  );
}

function getAdaptiveMicrodetailModuleCap() {
  return Math.max(2, Math.min(10, runtimeMicrodetailModuleCap));
}

function getAdaptivePhysicsPriorityMultiplier() {
  return Math.max(1, Math.min(8, runtimePhysicsPriorityMultiplier));
}

function getAdaptiveRescueDirectiveCap() {
  return Math.max(6, Math.min(24, runtimeRescueDirectiveCap));
}

function pushAdaptationHistory(summary, { trigger = 'unknown', change = '', result = '' } = {}) {
  if (!summary) return;
  if (!Array.isArray(summary.adaptationHistory)) {
    summary.adaptationHistory = [];
  }
  summary.adaptationHistory.push({
    timestamp: new Date().toISOString(),
    trigger,
    change,
    result
  });
}

function ensureSummaryMetrics(summary, baselineScore = 0) {
  if (!summary) return;
  if (!summary.metrics || typeof summary.metrics !== 'object') {
    summary.metrics = {};
  }
  if (!summary.metrics.physicsDensityRatio || typeof summary.metrics.physicsDensityRatio !== 'object') {
    summary.metrics.physicsDensityRatio = {
      targetRatio: PHYSICS_DENSITY_MIN_RATIO,
      baselinePromptId: PHYSICS_DENSITY_BASELINE_PROMPT_ID,
      baselineScore: Number(baselineScore) || 0,
      min: null,
      max: null,
      avg: null,
      count: 0,
      belowTargetCount: 0
    };
  }
  if (!Number.isFinite(summary.metrics.bannedTermViolations)) {
    summary.metrics.bannedTermViolations = 0;
  }
  if (!Number.isFinite(summary.metrics.completionRate)) {
    summary.metrics.completionRate = 0;
  }
  if (!Number.isFinite(summary.metrics.rateLimitPressureRate)) {
    summary.metrics.rateLimitPressureRate = 0;
  }
  if (!Number.isFinite(summary.metrics.avgAttemptDurationMs)) {
    summary.metrics.avgAttemptDurationMs = 0;
  }
  if (!Number.isFinite(summary.metrics.qualityPassRate)) {
    summary.metrics.qualityPassRate = 0;
  }
}

function recordPromptBuildStage(promptMeta = {}, variant = 'primary', stage = 'unknown', promptText = '') {
  if (!PROMPT_BUILD_DIAGNOSTICS) return;
  const collector = promptMeta?.buildStages;
  if (!Array.isArray(collector)) return;
  const text = String(promptText || '').trim();
  collector.push({
    variant,
    variantFamily: resolveVariantFamily(variant),
    stage,
    words: countWords(text),
    chars: text.length
  });
}

function isRichStructuredPrompt(promptText = '', variant = 'primary') {
  const source = String(promptText || '');
  if (!source.trim()) {
    return false;
  }
  let matched = 0;
  for (const marker of RICH_PROMPT_MARKERS) {
    if (marker.test(source)) {
      matched += 1;
    }
  }
  return matched >= getRichPromptMarkerMin(variant);
}

function buildCriticalZoneCausalityBlocks(variant = 'primary', promptMeta = {}) {
  const titleLine = promptMeta?.title ? `Scene anchor: ${promptMeta.title}.` : 'Scene anchor: current prompt title.';
  const family = resolveVariantFamily(variant);
  const safetyLine = family === 'safe'
    ? 'Safe boundary: maintain non-explicit coverage while preserving edge-forward silhouette mechanics.'
    : 'Primary boundary: maximize non-explicit editorial intensity while preserving policy-safe framing.';
  return [
    [
      'CRITICAL-ZONE CAUSALITY MATRIX:',
      titleLine,
      safetyLine,
      '- For slit boundary, enforce pose-load direction -> seam strain -> fold orientation -> highlight flow -> cast-shadow attachment.',
      '- For thigh-band compression, enforce circumferential pressure gradient, denier transition, and anisotropic sheen continuity.',
      '- For knee contour and patella track, enforce stretch-compression transition with no texture warping.',
      '- For ankle/instep, enforce tendon line continuity, stocking stretch, and plausible micro-bunching at dorsiflexion.',
      '- For heel-floor contact, enforce load transfer, compression bloom, and coherent occlusion/reflection geometry.'
    ].join('\n'),
    [
      'FIRST-PRINCIPLES PHYSICS CLOSURE (MANDATORY):',
      '- Support-contact closure: each visible support point must show compression and anchored contact shadow.',
      '- Non-penetration closure: garment/skin/furniture boundaries must stay topologically valid.',
      '- Gravity closure: drape vectors must follow one gravity direction with pose-consistent perturbations.',
      '- Light-shadow closure: key/rim/fill direction must agree with catchlights, terminators, and cast shadows.',
      '- Material closure: satin, lace, mesh, hosiery, skin, and metal must exhibit distinct BRDF-like responses.'
    ].join('\n'),
    [
      'FORENSIC MICRO-DETAIL ENFORCEMENT:',
      '- Preserve pore-scale skin variation, lip microtexture, and non-uniform fine hair flyaways.',
      '- Preserve stitch continuity and seam relief at all high-strain edges with zero smeared texture patches.',
      '- Preserve contact-shadow pockets at chair edge, hand support, and footwear-floor interface.',
      '- Reject any wax/plastic skin, tiled textile motifs, detached shadows, halo edges, or floating limbs.',
      '- Reject any hosiery topology drift from true thigh-high upper-thigh band placement.'
    ].join('\n')
  ];
}

function buildPromptWindowHighSignalBlocks(variant = 'primary', promptMeta = {}) {
  const family = resolveVariantFamily(variant);
  const moduleVariant = family === 'safe' ? 'safe' : 'primary';
  const blocks = [];
  blocks.push(...buildCriticalZoneCausalityBlocks(variant, promptMeta));
  const resolutionBlock = buildResolutionUtilizationBlock(variant);
  if (resolutionBlock) {
    blocks.push(resolutionBlock);
  }
  const researchFoundation = buildResearchMicrodetailFoundationBlock(moduleVariant, promptMeta);
  if (researchFoundation) {
    blocks.push(researchFoundation);
  }
  const researchModules = selectTargetedMicrodetailModules(
    buildResearchMicrodetailModules(moduleVariant, promptMeta),
    promptMeta
  );
  for (const moduleText of researchModules) {
    if (moduleText) {
      blocks.push(moduleText);
    }
  }
  return blocks;
}

function buildResolutionUtilizationBlock(variant = 'primary') {
  if (!RESOLUTION_OPTIMIZATION_MODE) {
    return '';
  }
  const family = resolveVariantFamily(variant);
  const isSafeLike = family === 'safe';
  const sizeSpecificLine = OUTPUT_IMAGE_SIZE === '4K'
    ? '- 4K detail target: preserve sub-millimeter texture gradients, seam-thread continuity, and edge micro-contrast without denoise wash.'
    : OUTPUT_IMAGE_SIZE === '2K'
      ? '- 2K detail target: preserve millimeter-scale pore variation, lace/fabric weave separation, and clean high-contrast boundaries.'
      : '- 1K detail target: preserve primary microtexture cues and avoid smoothing that erases identity or fabric realism.';
  const safetyLine = isSafeLike
    ? '- Keep all detail-rich cues while preserving policy-safe, non-explicit framing and coverage.'
    : '- Keep detail-rich cues for daring editorial intent while remaining strictly non-explicit.';
  return [
    'RESOLUTION UTILIZATION LOCK:',
    `- Output profile: ${OUTPUT_IMAGE_SIZE} at aspect ratio ${OUTPUT_ASPECT_RATIO}.`,
    '- Solve details coarse-to-fine: silhouette and pose mechanics first, meso folds/seams second, microtexture/edge cues last.',
    '- Preserve full-frame fidelity: center, corners, and boundaries must remain equally coherent with no soft-collapse zones.',
    '- Preserve edge integrity at jawline, hairline, garment hems, stocking band boundaries, and heel-floor contacts (no halos, no stair-stepping, no texture smear).',
    '- Preserve physically coherent micro-contrast under mixed lighting: specular breakup, contact shadows, and reflection continuity must agree.',
    sizeSpecificLine,
    safetyLine,
    `- Resolution utilization intensity: level ${RESOLUTION_MICRODETAIL_LEVEL} of 3.`
  ].join('\n');
}

function trimPromptToWindowByPriority(promptText, maxWords, variant = 'primary', promptMeta = {}) {
  const normalized = String(promptText || '').trim();
  if (!normalized || countWords(normalized) <= maxWords) {
    return normalized;
  }
  const lines = normalized.split('\n');
  const entries = [];
  let protectedSection = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      entries.push({ line: '', protectedSection });
      continue;
    }
    if (PROMPT_WINDOW_PROTECTED_HEADING.test(trimmed)) {
      protectedSection = true;
    } else if (PROMPT_WINDOW_ANY_HEADING.test(trimmed)) {
      protectedSection = false;
    }
    entries.push({ line: line.trimEnd(), protectedSection });
  }

  const render = (arr) => arr
    .filter(item => !item.drop)
    .map(item => item.line)
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  const dropByPattern = (patterns) => {
    for (const item of entries) {
      if (item.drop || item.protectedSection) continue;
      if (countWords(render(entries)) <= maxWords) break;
      if (patterns.some(pattern => pattern.test(item.line.trim()))) {
        item.drop = true;
      }
    }
  };

  dropByPattern(PROMPT_LOW_PRIORITY_GUARDRAIL_PATTERNS);
  dropByPattern(PROMPT_REDUNDANT_STYLE_PATTERNS);

  const seen = new Set();
  for (const item of entries) {
    if (item.drop || item.protectedSection) continue;
    const key = item.line.trim().toLowerCase();
    if (!key) continue;
    if (seen.has(key) && countWords(render(entries)) > maxWords) {
      item.drop = true;
      continue;
    }
    seen.add(key);
  }

  const removable = entries
    .map((item, index) => ({ ...item, index, words: countWords(item.line) }))
    .filter(item => !item.drop && !item.protectedSection && item.words > 0)
    .sort((a, b) => b.words - a.words);
  for (const item of removable) {
    if (countWords(render(entries)) <= maxWords) break;
    entries[item.index].drop = true;
  }

  let trimmed = render(entries);
  if (countWords(trimmed) > maxWords) {
    const label = promptMeta?.promptId && promptMeta?.title
      ? `${promptMeta.promptId} ${promptMeta.title}`
      : (promptMeta?.title || promptMeta?.promptId || 'n/a');
    log(
      `Prompt window fallback trim applied (${variant}, ${label}): ${countWords(trimmed)} -> ${maxWords} words`
    );
    trimmed = trimTextToWordLimit(trimmed, maxWords);
  }
  return trimmed;
}

function enforceFallbackPromptWindow(
  promptText,
  variant = 'primary',
  promptMeta = {},
  { minWords = null, maxWords = null } = {}
) {
  let normalized = String(promptText || '').trim();
  if (!normalized) {
    return normalized;
  }
  recordPromptBuildStage(promptMeta, variant, 'window-input', normalized);

  const window = getPromptWindow(variant, { minWords, maxWords });
  if (countWords(normalized) < window.minWords) {
    const highSignalBlocks = buildPromptWindowHighSignalBlocks(variant, promptMeta);
    for (const block of highSignalBlocks) {
      if (countWords(normalized) >= window.minWords) break;
      normalized = `${normalized}\n\n${block}`;
      recordPromptBuildStage(promptMeta, variant, 'window-append-high-signal', normalized);
    }
  }

  if (countWords(normalized) > window.maxWords) {
    normalized = trimPromptToWindowByPriority(normalized, window.maxWords, variant, promptMeta);
    recordPromptBuildStage(promptMeta, variant, 'window-trim-priority', normalized);
  }

  const capped = enforcePromptHardCap(normalized, variant, promptMeta);
  recordPromptBuildStage(promptMeta, variant, 'window-output', capped);
  return capped;
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
    '- Forbidden fallback archetypes: conservative blouse looks, office shell tops, modest sheath dresses, cardigan/business styling, plain one-piece substitutes when prompt specifies two-piece.',
    '- Preserve prompt-defined outfit architecture, colorway, and materials; do not collapse into a repeated black-lace template.',
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
    scene: /^(?:scene(?:\s+(?:intent|anchors?|preservation|lock|requirements?|invariants?))?|setting(?:\s+lock)?|scene\s+anchors?\s+(?:to\s+preserve|must\s+remain\s+visible))(?:\s*\([^)]*\))?\s*:/i,
    wardrobe: /^(?:wardrobe(?:\s+(?:lock|preservation|topology|requirements?|invariants?|anchors?(?:\s+to\s+preserve|(?:\s+must\s+remain\s+visible)?)))?|attire(?:\s+lock)?)(?:\s*\([^)]*\))?\s*:/i,
    pose: /^(?:pose(?:\s+(?:blueprint|and\s+(?:framing|composition)|preservation|choreography|requirements?|invariants?|anchors?(?:\s+to\s+preserve|(?:\s+must\s+remain\s+visible)?)))?|pose\s+\+\s+kinematic\s+preservation|kinematic\s+path)(?:\s*\([^)]*\))?\s*:/i
  };
  const combinedMatchers = [
    /^(?:wardrobe\s*\+\s*pose(?:\s+(?:invariants?|preservation|anchors?))?|pose\s*\+\s*wardrobe(?:\s+(?:invariants?|preservation|anchors?))?)(?:\s*\([^)]*\))?\s*:/i
  ];
  let activeKeys = [];

  const appendAnchor = (key, value) => {
    if (!key || !value || !buckets[key]) {
      return;
    }
    buckets[key].push(value);
  };
  const classifyCombinedKeys = (value) => {
    const normalized = String(value || '').toLowerCase();
    if (!normalized) {
      return ['wardrobe', 'pose'];
    }
    const poseSignal = /\b(pose|stance|leg|hip|shoulder|fingertip|hand|chin|gaze|load|balance|kinematic|ankle|heel[-\s]?ground|knee)\b/.test(normalized);
    const wardrobeSignal = /\b(wardrobe|top|skirt|corset|bodice|hosiery|stocking|denier|satin|velvet|seam|slit|hem|heel|pump|stiletto|material|colorway)\b/.test(normalized);
    if (poseSignal && !wardrobeSignal) {
      return ['pose'];
    }
    if (wardrobeSignal && !poseSignal) {
      return ['wardrobe'];
    }
    return ['wardrobe', 'pose'];
  };

  for (const line of lines) {
    if (combinedMatchers.some(pattern => pattern.test(line))) {
      activeKeys = ['wardrobe', 'pose'];
      continue;
    }
    if (headingMatchers.scene.test(line)) {
      activeKeys = ['scene'];
      continue;
    }
    if (headingMatchers.wardrobe.test(line)) {
      activeKeys = ['wardrobe'];
      continue;
    }
    if (headingMatchers.pose.test(line)) {
      activeKeys = ['pose'];
      continue;
    }
    if (/^[A-Za-z][A-Za-z0-9\s\-+/()]{2,40}:\s*$/i.test(line)) {
      activeKeys = [];
      continue;
    }
    if (!activeKeys.length) {
      continue;
    }
    const normalized = line.startsWith('- ') ? line.slice(2).trim() : line.trim();
    if (!normalized) {
      continue;
    }
    const targetKeys = (
      activeKeys.length === 2
      && activeKeys.includes('wardrobe')
      && activeKeys.includes('pose')
    )
      ? classifyCombinedKeys(normalized)
      : activeKeys;
    for (const key of targetKeys) {
      appendAnchor(key, normalized);
    }
  }
  return {
    scene: buckets.scene.slice(0, 4),
    wardrobe: buckets.wardrobe.slice(0, 4),
    pose: buckets.pose.slice(0, 5)
  };
}

function normalizePromptBullet(line) {
  const trimmed = String(line || '').trim();
  if (!trimmed) return '';
  return trimmed
    .replace(/^[-*]\s*/, '')
    .replace(/^\d+\.\s*/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function dedupePromptLines(lines, maxItems = 8) {
  const out = [];
  const seen = new Set();
  for (const raw of lines || []) {
    const normalized = normalizePromptBullet(raw);
    if (!normalized) continue;
    const key = normalized.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(normalized);
    if (out.length >= maxItems) break;
  }
  return out;
}

function collectPromptSignalLines(promptText, matcher, maxItems = 6) {
  const lines = String(promptText || '')
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .filter(line => !/^[A-Z0-9][A-Z0-9\s+()'\/-]{2,}:\s*$/i.test(line));
  const selected = [];
  for (const line of lines) {
    if (!matcher.test(line)) continue;
    selected.push(normalizePromptBullet(line));
    if (selected.length >= maxItems) break;
  }
  return dedupePromptLines(selected, maxItems);
}

function collectIdentitySignalLines(promptText, maxItems = 6) {
  return collectPromptSignalLines(
    promptText,
    /\b(identity|reference|face|smile|brow|eyes?|gaze|hairline|jaw|cheekbone|nose|lip)\b/i,
    maxItems
  );
}

function collectPhysicsSignalLines(promptText, maxItems = 8) {
  return collectPromptSignalLines(
    promptText,
    /\b(physics|kinematic|load|strain|seam|fold|drape|compression|contact|shadow|specular|reflection|material|denier|realism|texture)\b/i,
    maxItems
  );
}

function collectStyleSignalLines(promptText, maxItems = 4) {
  return collectPromptSignalLines(
    promptText,
    /\b(editorial|nightlife|cinematic|attire|wardrobe|silhouette|contour|daring|edge|sultry)\b/i,
    maxItems
  );
}

function buildFirstPrinciplesVariantIntent(variant = 'primary', mode = 'standard', retryOrdinal = 1) {
  if (mode === 'safe-retry') {
    return [
      `Recovery mode: no-image retry ${retryOrdinal}; reduce lexical risk while preserving identity, scene anchors, and attire topology.`,
      'Prioritize generation acceptance first, then realism density, then style amplification.'
    ];
  }
  if (mode === 'primary-rescue') {
    return [
      'Recovery mode: quality rescue; preserve the same scene and identity while fixing failed dimensions.',
      'Prioritize causal realism closure and prompt-faithful scene execution before style escalation.'
    ];
  }
  const family = resolveVariantFamily(variant);
  if (family === 'safe') {
    return [
      'Safe mode: compliance-stable fashion framing with high-detail realism and zero conservative template collapse.',
      'Preserve daring couture intent via lighting, pose mechanics, and material behavior without explicit framing.'
    ];
  }
  return [
    'Primary mode: maximize premium non-explicit editorial impact while preserving strict identity and physics coherence.',
    'Prioritize identity lock, scene fidelity, causal realism, and output distinctiveness for this prompt title.'
  ];
}

function buildFirstPrinciplesPrompt({
  sourcePrompt,
  variant = 'primary',
  promptMeta = {},
  mode = 'standard',
  retryOrdinal = 1,
  recoveryDeficits = [],
  recoveryDirectives = []
}) {
  const promptSource = String(sourcePrompt || '').trim();
  const signalProfile = FIRST_PRINCIPLES_SIGNAL_LEVEL >= 3
    ? { identity: 6, physics: 8, style: 4 }
    : FIRST_PRINCIPLES_SIGNAL_LEVEL === 2
      ? { identity: 5, physics: 6, style: 3 }
      : { identity: 4, physics: 5, style: 2 };
  const safeLike = resolveVariantFamily(variant) !== 'primary' || mode.includes('safe');
  const normalizeForVariant = line => (safeLike ? sanitizeSafeAnchorLine(line) : line);

  const anchors = collectPromptAnchorBullets(promptSource);
  const sceneAnchors = dedupePromptLines(
    anchors.scene.length ? anchors.scene : [promptMeta?.title ? `Keep scene identity anchored to: ${promptMeta.title}` : 'Preserve prompt scene identity.'],
    4
  ).map(normalizeForVariant);
  const wardrobeAnchors = dedupePromptLines(anchors.wardrobe, 4).map(normalizeForVariant);
  const poseAnchors = dedupePromptLines(anchors.pose, 5).map(normalizeForVariant);
  const identitySignals = collectIdentitySignalLines(promptSource, signalProfile.identity).map(normalizeForVariant);
  const physicsSignals = collectPhysicsSignalLines(promptSource, signalProfile.physics).map(normalizeForVariant);
  const styleSignals = collectStyleSignalLines(promptSource, signalProfile.style).map(normalizeForVariant);
  const intentLines = buildFirstPrinciplesVariantIntent(variant, mode, retryOrdinal);
  const deficitLines = dedupePromptLines(recoveryDeficits, 8).map(normalizeForVariant);
  const directiveLines = dedupePromptLines(recoveryDirectives, FIRST_PRINCIPLES_DIRECTIVE_CAP).map(normalizeForVariant);

  const fallbackIdentity = [
    'Preserve exact adult reference identity before any wardrobe or pose stylization.',
    'Keep direct lens-axis gaze with natural vergence and bilateral catchlight coherence.',
    'Reject age, ethnicity, face-shape, or hairline drift.'
  ];
  const fallbackPhysics = [
    'Maintain causal chain: pose/load path -> seam strain -> fold orientation -> shadow placement -> specular flow.',
    'Maintain contact realism at support points, heel-floor pressure zones, and garment boundaries.',
    'Reject synthetic texture tiling, detached shadows, and wax/plastic skin.'
  ];

  const sections = [
    'FIRST-PRINCIPLES RENDER CONTRACT (MANDATORY):',
    `Prompt anchor: ${promptMeta?.promptId || '??'} ${promptMeta?.title || 'Untitled scene'}`.trim(),
    ...intentLines.map(line => `- ${line}`),
    '',
    'PROBLEM STATEMENT:',
    '- Produce one photoreal full-body image that is identity-locked, scene-faithful, non-explicit, and physics-coherent.',
    '- Optimize for output acceptance and quality simultaneously: no-image risk reduction + realism increase.',
    '',
    'FUNDAMENTAL TRUTHS:',
    '- Generation fails when policy-sensitivity, identity precision, and scene specificity are not simultaneously coherent.',
    '- Quality passes when causal realism is visible across anatomy, fabric behavior, lighting, and contact geometry.',
    '- Distinctiveness requires title-specific anchors and anti-template composition.',
    '',
    'SCENE INVARIANTS:',
    ...sceneAnchors.map(line => `- ${line}`),
    '',
    'IDENTITY INVARIANTS:',
    ...(identitySignals.length ? identitySignals : fallbackIdentity).map(line => `- ${line}`),
    '',
    'WARDROBE + POSE INVARIANTS:',
    ...(wardrobeAnchors.length ? wardrobeAnchors : ['Keep explicit two-piece topology with clear waist separation.']).map(line => `- ${line}`),
    ...(poseAnchors.length ? poseAnchors : ['Keep full-body framing with believable support/contact mechanics.']).map(line => `- ${line}`),
    '',
    'PHYSICS + REALISM INVARIANTS:',
    ...(physicsSignals.length ? physicsSignals : fallbackPhysics).map(line => `- ${line}`),
    '- Preserve coarse-to-fine fidelity: silhouette and support mechanics first, meso folds/seams second, microtexture/contact cues last.',
    '- Preserve full-frame consistency: center/corners/edges must remain equally coherent.',
    ''
  ];

  if (styleSignals.length) {
    sections.push('STYLE + DIFFERENTIATION INVARIANTS:');
    sections.push(...styleSignals.map(line => `- ${line}`));
    sections.push('- Keep this prompt visibly distinct from other prompts; avoid repeated template framing.');
    sections.push('');
  }

  if (deficitLines.length || directiveLines.length) {
    sections.push('RECOVERY TARGETS:');
    if (deficitLines.length) {
      sections.push(...deficitLines.map(line => `- Correct deficit: ${line}`));
    }
    if (directiveLines.length) {
      sections.push(...directiveLines.map(line => `- Directive: ${line}`));
    }
    sections.push('');
  }

  sections.push('HARD REJECT:');
  sections.push('- Identity drift, off-axis gaze, one-piece topology collapse, under-knee hosiery regression, anatomy breaks, explicit framing.');
  sections.push('- Texture tiling, detached shadows, floating contacts, reflection mismatch, wax/plastic skin, or conservative generic restyle.');

  if (FIRST_PRINCIPLES_APPEND_RAW_PROMPT && promptSource) {
    sections.push('');
    sections.push('RAW PROMPT REFERENCE (LOW PRIORITY, DO NOT OVERRIDE CONTRACT):');
    sections.push(promptSource);
  }

  return sections.join('\n').trim();
}

function sanitizeSafeAnchorLine(line) {
  let sanitized = String(line || '').trim();
  if (!sanitized) {
    return '';
  }
  for (const { pattern, replacement } of SAFE_LEXICON_REPLACEMENTS) {
    sanitized = sanitized.replace(pattern, replacement);
  }
  const extraReplacements = [
    { pattern: /\bhigh-slit\b/gi, replacement: 'contoured-slit' },
    { pattern: /\bintimate\b/gi, replacement: 'private' },
    { pattern: /\bdramatic\b/gi, replacement: 'clear' },
    { pattern: /\bafterdark\b/gi, replacement: 'nighttime' },
    { pattern: /waist separation must remain unmistakable and clear but non-explicit\./gi, replacement: 'Waist separation remains clearly visible while non-explicit.' }
  ];
  for (const { pattern, replacement } of extraReplacements) {
    sanitized = sanitized.replace(pattern, replacement);
  }
  return sanitized.replace(/\s+/g, ' ').trim();
}

function buildPrimaryAnchorTransferBlock(primaryPromptText, variant = 'safe') {
  const anchors = collectPromptAnchorBullets(primaryPromptText);
  const shouldSanitize = variant === 'safe' && SAFE_POLICY_HARDENING && SAFE_ANCHOR_SANITIZE;
  const sceneAnchors = shouldSanitize ? anchors.scene.map(sanitizeSafeAnchorLine) : anchors.scene;
  const wardrobeAnchors = shouldSanitize ? anchors.wardrobe.map(sanitizeSafeAnchorLine) : anchors.wardrobe;
  const poseAnchors = shouldSanitize ? anchors.pose.map(sanitizeSafeAnchorLine) : anchors.pose;
  const lines = [
    'PRIMARY ANCHOR TRANSFER (SAFE FIDELITY BRIDGE):',
    '- Use these anchors to preserve scene and pose fidelity while keeping policy-safe wording.'
  ];
  if (sceneAnchors.length) {
    lines.push('Scene anchors to preserve:');
    lines.push(...sceneAnchors.map(item => `- ${item}`));
  }
  if (wardrobeAnchors.length) {
    lines.push('Wardrobe topology anchors to preserve:');
    lines.push(...wardrobeAnchors.map(item => `- ${item}`));
  }
  if (poseAnchors.length) {
    lines.push('Pose choreography anchors to preserve:');
    lines.push(...poseAnchors.map(item => `- ${item}`));
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
      ? 'Wardrobe invariant: preserve the prompt-specified two-piece top/skirt topology, colorway, and materials with safer wording; never generic lace-template substitution.'
      : 'Wardrobe invariant: preserve the prompt-specified two-piece top/skirt topology, colorway, and materials; never generic lace-template substitution.',
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
    '- Keep high-fashion editorial tone with sultry nightlife energy, never explicit sexual framing.',
    '- Maintain edge-forward couture language while preserving compliant coverage boundaries.',
    '- Keep camera-facing confidence and couture detail while remaining strictly non-explicit.',
    '- Keep identity lock, scene lock, and photoreal microphysics lock unchanged.'
  ].join('\n');
}

function buildIdentityFinalOverrideBlock() {
  return [
    'IDENTITY FINAL OVERRIDE (ABSOLUTE LAST PRIORITY CHECK):',
    '- Match the exact adult person from the reference image, not a look-alike.',
    '- Preserve core face geometry: eye spacing, jawline, cheekbone shape, smile structure, and brow shape.',
    '- Preserve biometric cues: inter-pupil distance, brow thickness/arch, nose bridge-to-tip proportion, and lip fullness ratio.',
    '- Preserve hair identity cues: blonde color family, part direction, and natural wave pattern.',
    '- Preserve ethnicity and apparent age from the reference.',
    '- Keep direct lens gaze with natural vergence and coherent catchlights.',
    '- If identity cues drift, regenerate before accepting wardrobe or pose fidelity.',
    '- If any identity cue conflicts with styling changes, identity wins.'
  ].join('\n');
}

function buildIdentityDriftSentinelBlock(variant = 'general') {
  const variantLine = variant === 'safe-retry'
    ? '- Safe-retry mode: preserve exact identity first, then satisfy conservative styling constraints.'
    : '- Preserve exact identity before style changes.';
  return [
    'IDENTITY DRIFT SENTINEL (MANDATORY):',
    variantLine,
    '- Keep the same adult person from reference with no age-shift or ethnicity-shift.',
    '- Preserve eye shape/spacing, brow arc, nose tip width, lip contour, jaw taper, and smile asymmetry.',
    '- Preserve eye color family and hairline/part direction from reference.',
    '- Reject beautification drift, face-shape drift, and look-alike substitution.'
  ].join('\n');
}

function buildAttireTopologyInvariantBlock(variant) {
  const hosieryLine = 'Render true thigh-high hosiery with a coherent denier gradient and a visible, physically plausible top band high on the upper thigh (never knee-high); keep prompt-specified color/finish (default to sheer black only when unspecified).';
  return [
    'ATTIRE TOPOLOGY INVARIANT (MANDATORY):',
    '- Keep a clear two-piece wardrobe topology from the prompt: separate top and separate skirt with explicit waist separation.',
    '- Preserve prompt-defined attire colorway, material family, and cutline details; do not collapse into a repeated black-lace look.',
    '- Preserve explicit waist separation between top and skirt; do not merge into a one-piece garment.',
    hosieryLine,
    '- Keep footwear as pointed high heels with believable contact mechanics and perspective unless the prompt explicitly specifies another formal heel style.'
  ].join('\n');
}

const SAFE_LEXICON_REPLACEMENTS = [
  { pattern: /\bsexy\b/gi, replacement: 'sultry high-fashion' },
  { pattern: /\bseductive\b/gi, replacement: 'sultry' },
  { pattern: /\bprovocative\b/gi, replacement: 'edge-forward' },
  { pattern: /\brevealing\b/gi, replacement: 'bold-cut' },
  { pattern: /\bintimate\b/gi, replacement: 'private' },
  { pattern: /\bafterdark\b/gi, replacement: 'nighttime' },
  { pattern: /\bskin-forward\b/gi, replacement: 'contour-forward' },
  { pattern: /thigh-high hosiery/gi, replacement: 'sheer thigh-high stockings' },
  { pattern: /\bhigh-cut leg lines\b/gi, replacement: 'defined leg-line tailoring' },
  { pattern: /intimate luxury-suite/gi, replacement: 'private luxury-suite' },
  { pattern: /\bbedroom\b/gi, replacement: 'suite-lounge' },
  { pattern: /\bbedside\b/gi, replacement: 'table-side' },
  { pattern: /\bheadboard\b/gi, replacement: 'paneled backdrop' },
  { pattern: /\bchaise\b/gi, replacement: 'lounge chair' },
  { pattern: /\bcouch\b/gi, replacement: 'lounge sofa' },
  { pattern: /\bdrapery\b/gi, replacement: 'curtain detail' },
  { pattern: /sexy editorial mood/gi, replacement: 'high-fashion editorial mood' },
  { pattern: /sexy attire/gi, replacement: 'fashion-forward attire' },
  { pattern: /waist separation must remain unmistakable and dramatic but non-explicit\./gi, replacement: 'Waist separation remains clearly visible and non-explicit.' }
];

const IMAGE_SAFETY_COMPLIANCE_REPLACEMENTS = [
  { pattern: /\bsexy\b/gi, replacement: 'elegant' },
  { pattern: /\bseductive\b/gi, replacement: 'confident' },
  { pattern: /\bprovocative\b/gi, replacement: 'assertive' },
  { pattern: /\bdaring\b/gi, replacement: 'high-fidelity' },
  { pattern: /\bsultry\b/gi, replacement: 'precision-focused' },
  { pattern: /\bsensual\b/gi, replacement: 'physics-grounded' },
  { pattern: /\berotic\b/gi, replacement: 'editorial' },
  { pattern: /\bintimate\b/gi, replacement: 'private' },
  { pattern: /\bthigh[-\s]?high\b/gi, replacement: 'thigh-high' },
  { pattern: /\bupper[-\s]?thigh\b/gi, replacement: 'upper thigh' },
  { pattern: /\bdisplay leg\b/gi, replacement: 'leading leg line' },
  { pattern: /\bhigh[-\s]?slit\b/gi, replacement: 'tailored vent' },
  { pattern: /\bslit\b/gi, replacement: 'tailored vent' },
  { pattern: /\bside[-\s]?waist\b/gi, replacement: 'side panel' },
  { pattern: /\bwaist separation\b/gi, replacement: 'top-and-skirt separation' },
  { pattern: /\bskin-forward\b/gi, replacement: 'shape-forward' },
  { pattern: /\bpush to the edge of non-explicit\b/gi, replacement: 'remain strictly non-explicit' }
];

const IMAGE_SAFETY_COMPLIANCE_DROP_LINE_PATTERNS = [
  /\bnon-explicit seductive silhouette\b/i,
  /\bone leg-line emphasis through\b/i,
  /\bdisplay leg\b/i,
  /\bside[-\s]?waist\b/i,
  /\bmaximize non-explicit daring\b/i,
  /\bpush to the edge of non-explicit\b/i,
  /\berotic intent\b/i,
  /\bfetish\b/i
];

function buildImageSafetyComplianceLockBlock(variant = 'primary') {
  const variantLine = variant === 'safe'
    ? '- Safe variant: prioritize compliance-stable fashion portrait language over intensity cues.'
    : '- Primary variant: prioritize compliance-stable fashion portrait language and identity fidelity.';
  return [
    'IMAGE SAFETY COMPLIANCE LOCK (MANDATORY):',
    variantLine,
    '- Keep an adult, non-explicit, fashion portrait framing with no sexual or fetish intent.',
    '- Avoid body-part emphasis cues; describe pose through balance, support contact, and garment mechanics.',
    '- Keep wardrobe language coverage-forward and event-ready while preserving two-piece topology.'
  ].join('\n');
}

function applyImageSafetyComplianceFilter(promptText, variant = 'primary') {
  let normalized = String(promptText || '').trim();
  if (!IMAGE_SAFETY_COMPLIANCE_MODE || !normalized) {
    return normalized;
  }

  for (const { pattern, replacement } of IMAGE_SAFETY_COMPLIANCE_REPLACEMENTS) {
    normalized = normalized.replace(pattern, replacement);
  }

  if (IMAGE_SAFETY_COMPLIANCE_LEVEL >= 2 && IMAGE_SAFETY_COMPLIANCE_DROP_LINES) {
    normalized = normalized
      .split(/\r?\n/)
      .map(line => line.trimEnd())
      .filter(line => !IMAGE_SAFETY_COMPLIANCE_DROP_LINE_PATTERNS.some(pattern => pattern.test(line)))
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  if (IMAGE_SAFETY_COMPLIANCE_LEVEL >= 3) {
    normalized = normalized
      .replace(/\bshape-forward\b/gi, 'well-tailored')
      .replace(/\bassertive\b/gi, 'refined')
      .replace(/\bconfident silhouette\b/gi, 'refined silhouette');
  }
  if (MICRO_PHYSICS_LANGUAGE_ENFORCEMENT) {
    const microLanguageReplacements = [
      { pattern: /\brevealing\b/gi, replacement: 'geometry-specific' },
      { pattern: /\bbody-skimming\b/gi, replacement: 'contour-traced' },
      { pattern: /\brisky editorial\b/gi, replacement: 'high-fidelity editorial' },
      { pattern: /\bboundary-pushing\b/gi, replacement: 'precision-controlled' }
    ];
    for (const { pattern, replacement } of microLanguageReplacements) {
      normalized = normalized.replace(pattern, replacement);
    }
    const broadTermLinePattern = /\b(reveal intensity|explicit emphasis|body-skimming|risky editorial|boundary-pushing)\b/i;
    normalized = normalized
      .split(/\r?\n/)
      .map(line => line.trimEnd())
      .filter(line => !broadTermLinePattern.test(line))
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  const microPolicyBlock = MICRO_PHYSICS_LANGUAGE_ENFORCEMENT
    ? '\n\nMICRO-PHYSICS LANGUAGE POLICY (HARD):\n'
      + '- Use specific geometry, material, lighting, and contact mechanics terminology.\n'
      + '- Prefer seam strain, fold hierarchy, denier gradients, compression transitions, and contact-shadow logic over broad style adjectives.\n'
      + '- Keep non-explicit, compliance-stable phrasing while preserving high-detail realism.'
    : '';
  return `${normalized}\n\n${buildImageSafetyComplianceLockBlock(variant)}${microPolicyBlock}`.trim();
}

const MICRO_PHYSICS_BANNED_TERM_RULES = [
  { label: 'daring', regex: /\bdaring\b/gi },
  { label: 'sultry', regex: /\bsultry\b/gi },
  { label: 'sensual', regex: /\bsensual\b/gi },
  { label: 'provocative', regex: /\bprovocative\b/gi },
  { label: 'seductive', regex: /\bseductive\b/gi },
  { label: 'sexy', regex: /\bsexy\b/gi },
  { label: 'revealing', regex: /\brevealing\b/gi },
  { label: 'risky editorial', regex: /\brisky editorial\b/gi },
  { label: 'boundary-pushing', regex: /\bboundary-pushing\b/gi },
  { label: 'explicit emphasis', regex: /\bexplicit emphasis\b/gi },
  { label: 'body-skimming', regex: /\bbody-skimming\b/gi }
];

const MICRO_PHYSICS_BROAD_TO_MICRO_REPLACEMENTS = [
  { pattern: /\bdaring\b/gi, replacement: 'high-fidelity' },
  { pattern: /\bsultry\b/gi, replacement: 'precision-focused' },
  { pattern: /\bsensual\b/gi, replacement: 'physics-grounded' },
  { pattern: /\bprovocative\b/gi, replacement: 'geometry-specific' },
  { pattern: /\bseductive\b/gi, replacement: 'camera-confident' },
  { pattern: /\bsexy\b/gi, replacement: 'editorial' },
  { pattern: /\brevealing\b/gi, replacement: 'cut-geometry-defined' },
  { pattern: /\brisky editorial\b/gi, replacement: 'high-fidelity editorial' },
  { pattern: /\bboundary-pushing\b/gi, replacement: 'precision-controlled' },
  { pattern: /\bexplicit emphasis\b/gi, replacement: 'mechanics emphasis' },
  { pattern: /\bbody-skimming\b/gi, replacement: 'contour-traced' }
];

function collectMicroPhysicsBannedTermViolations(promptText) {
  const source = String(promptText || '');
  const hits = [];
  for (const rule of MICRO_PHYSICS_BANNED_TERM_RULES) {
    const matches = source.match(rule.regex);
    if (matches?.length) {
      hits.push({
        term: rule.label,
        count: matches.length
      });
    }
  }
  return hits;
}

function rewriteBroadTermsToMicroPhysics(promptText) {
  let output = String(promptText || '');
  for (const { pattern, replacement } of MICRO_PHYSICS_BROAD_TO_MICRO_REPLACEMENTS) {
    output = output.replace(pattern, replacement);
  }
  return output;
}

function enforceMicroPhysicsBannedTerms(promptText, variant = 'primary') {
  let normalized = String(promptText || '').trim();
  if (!normalized) {
    return {
      promptText: normalized,
      violations: [],
      rewriteApplied: false,
      pass: true
    };
  }

  let violations = collectMicroPhysicsBannedTermViolations(normalized);
  let rewriteApplied = false;
  if (violations.length) {
    rewriteApplied = true;
    normalized = rewriteBroadTermsToMicroPhysics(normalized);
    normalized = applyImageSafetyComplianceFilter(normalized, variant);
    violations = collectMicroPhysicsBannedTermViolations(normalized);
  }

  return {
    promptText: normalized,
    violations,
    rewriteApplied,
    pass: !MICRO_PHYSICS_BANNED_TERMS_STRICT || violations.length === 0
  };
}

const PHYSICS_DENSITY_ZONE_RULES = [
  { key: 'slitBoundary', regex: /\b(slit|tailored vent)\b/i, weight: 1.6 },
  { key: 'thighBand', regex: /\b(thigh[-\s]?band|upper thigh|denier)\b/i, weight: 1.8 },
  { key: 'kneeContour', regex: /\b(knee|patella)\b/i, weight: 1.2 },
  { key: 'ankleInstep', regex: /\b(ankle|instep|dorsiflex)\b/i, weight: 1.2 },
  { key: 'heelFloor', regex: /\b(heel[-\s]?floor|heel[-\s]?to[-\s]?floor|forefoot)\b/i, weight: 1.6 },
  { key: 'handSupport', regex: /\b(hand[-\s]?support|fingertip|hand[-\s]?to[-\s]?surface)\b/i, weight: 1.3 }
];

const PHYSICS_DENSITY_TOKEN_WEIGHTS = [
  { regex: /\bstrain\b/gi, weight: 1.25 },
  { regex: /\bseam\b/gi, weight: 1.2 },
  { regex: /\bfold\b/gi, weight: 1.15 },
  { regex: /\bcompression\b/gi, weight: 1.2 },
  { regex: /\bcontact\b/gi, weight: 1.1 },
  { regex: /\bshadow\b/gi, weight: 1.1 },
  { regex: /\bspecular\b/gi, weight: 1.1 },
  { regex: /\btranslucen\w*\b/gi, weight: 1.25 },
  { regex: /\bdenier\b/gi, weight: 1.3 },
  { regex: /\bfriction\b/gi, weight: 1.1 },
  { regex: /\bocclusion\b/gi, weight: 1.1 },
  { regex: /\bload\b/gi, weight: 1.1 },
  { regex: /\bdrape\b/gi, weight: 1.1 },
  { regex: /\banisotropic\b/gi, weight: 1.2 },
  { regex: /\bmicrotexture\b/gi, weight: 1.2 },
  { regex: /\bnon-penetration\b/gi, weight: 1.2 }
];

function topDensityContributors(breakdown = {}, maxItems = 3) {
  return Object.entries(breakdown)
    .map(([section, score]) => ({ section, score: Number(Number(score || 0).toFixed(2)) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, maxItems);
}

function computePhysicsDensityScore(promptText) {
  const source = String(promptText || '');
  const lines = source
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);
  const breakdown = {
    criticalZones: 0,
    closureDirectives: 0,
    perZoneChecklist: 0,
    microModules: 0,
    tokenDensity: 0,
    causalChains: 0
  };

  const criticalDirectivePattern = /critical[-\s]?zone|causality matrix|first-principles physics closure|forensic micro-detail|material-physics solve|light-transport solve|physics \+ realism invariants|physics target/i;
  const closurePattern = /\b(closure|non-penetration|gravity closure|light-shadow closure|material closure)\b/i;
  const mechanicsPattern = /\b(strain|fold|compression|contact|shadow|specular|transluc|denier|friction|occlusion|load|drape)\b/i;
  const checklistLinePattern = /^-\s+/;
  const moduleHeaderPattern = /^MICRO-DETAIL MODULE [A-F]/i;
  const causalChainPattern = /->/;

  const coveredZones = new Set();
  for (const line of lines) {
    if (criticalDirectivePattern.test(line)) {
      breakdown.criticalZones += 7.5;
    }
    if (closurePattern.test(line)) {
      breakdown.closureDirectives += 4.2;
    }
    if (moduleHeaderPattern.test(line)) {
      breakdown.microModules += 8.8;
    }
    if (causalChainPattern.test(line) && mechanicsPattern.test(line)) {
      breakdown.causalChains += 3.1;
    }
    for (const zone of PHYSICS_DENSITY_ZONE_RULES) {
      if (zone.regex.test(line)) {
        coveredZones.add(zone.key);
        if (checklistLinePattern.test(line) && mechanicsPattern.test(line)) {
          breakdown.perZoneChecklist += 2.4 * zone.weight;
        }
      }
    }
  }
  breakdown.criticalZones += coveredZones.size * 8.5;

  for (const tokenRule of PHYSICS_DENSITY_TOKEN_WEIGHTS) {
    const matches = source.match(tokenRule.regex);
    if (matches?.length) {
      breakdown.tokenDensity += matches.length * tokenRule.weight;
    }
  }
  breakdown.tokenDensity *= 0.7;

  const score = Object.values(breakdown).reduce((sum, value) => sum + (Number(value) || 0), 0);
  return {
    score: Number(score.toFixed(2)),
    breakdown,
    topContributors: topDensityContributors(breakdown, 3),
    coveredZones: Array.from(coveredZones).sort()
  };
}

function computeAnchorCoverageDiagnostics(promptText = '') {
  const anchors = collectPromptAnchorBullets(promptText);
  const counts = {
    scene: anchors.scene.length,
    wardrobe: anchors.wardrobe.length,
    pose: anchors.pose.length
  };
  const missing = Object.entries(counts)
    .filter(([, count]) => count <= 0)
    .map(([key]) => key);
  return {
    counts,
    missing,
    samples: {
      scene: anchors.scene.slice(0, 2),
      wardrobe: anchors.wardrobe.slice(0, 2),
      pose: anchors.pose.slice(0, 2)
    }
  };
}

function buildDensityReinforcementBlock({
  variant = 'primary',
  pass = 1,
  shortfall = 0
} = {}) {
  const variantLine = resolveVariantFamily(variant) === 'safe'
    ? '- Safe boundary remains active: coverage-stable wording with high micro-physics specificity.'
    : '- Primary boundary remains active: non-explicit framing with maximal mechanics specificity.';
  const boostDepth = Math.max(1, Math.min(8, Math.round(Math.max(shortfall / 20, PHYSICS_DENSITY_MULTIPLIER))));
  const repeated = [];
  for (let i = 0; i < boostDepth; i += 1) {
    repeated.push(`- pass ${pass}.${i + 1}: reinforce seam strain, fold hierarchy, pressure gradients, and contact-shadow closure in all critical zones.`);
  }
  return [
    `MICRO-PHYSICS DENSITY REINFORCEMENT PASS ${pass}:`,
    variantLine,
    '- slit boundary: seam strain -> fold vector -> highlight trajectory -> cast-shadow attachment.',
    '- thigh band: circumferential pressure gradient -> denier transition -> anisotropic sheen continuity.',
    '- knee contour: stretch-compression transition -> micro-wrinkle orientation -> occlusion continuity.',
    '- ankle/instep: tendon line continuity -> hosiery strain -> micro-bunching at dorsiflexion.',
    '- heel-floor contact: load transfer -> compression bloom -> contact-shadow and reflection coupling.',
    '- hand-support contact: fingertip pressure cues -> friction hold -> non-penetrating geometry closure.',
    '- enforce closure checks: support contact, non-penetration, gravity drape, light-shadow geometry, material response.',
    '- require subpixel detail coherence: edge pressure, specular breakup, and micro-shadow continuity align at every boundary.',
    ...repeated
  ].join('\n');
}

function enforcePhysicsDensityGate({
  promptText,
  variant = 'primary',
  promptMeta = {},
  baselineScore = 0
}) {
  let working = String(promptText || '').trim();
  const safeBaseline = Math.max(0.01, Number(baselineScore) || 0.01);
  const targetScore = safeBaseline * PHYSICS_DENSITY_MIN_RATIO;
  const maxPasses = getAdaptiveReinforcementPassCap();
  let pass = 0;
  let diagnostics = computePhysicsDensityScore(working);
  let ratio = diagnostics.score / safeBaseline;

  while (ratio < PHYSICS_DENSITY_MIN_RATIO && pass < maxPasses) {
    pass += 1;
    const shortfall = Math.max(0, targetScore - diagnostics.score);
    working = `${working}\n\n${buildDensityReinforcementBlock({ variant, pass, shortfall })}`.trim();
    working = enforcePromptWordTarget(working, variant, promptMeta);
    working = applyImageSafetyComplianceFilter(working, variant);
    working = enforcePromptHardCap(working, variant, promptMeta);
    recordPromptBuildStage(promptMeta, variant, `density-pass-${pass}`, working);
    diagnostics = computePhysicsDensityScore(working);
    ratio = diagnostics.score / safeBaseline;
  }

  return {
    promptText: working,
    pass: ratio >= PHYSICS_DENSITY_MIN_RATIO,
    score: diagnostics.score,
    targetScore: Number(targetScore.toFixed(2)),
    ratio: Number(ratio.toFixed(3)),
    reinforcementPasses: pass,
    topContributors: diagnostics.topContributors,
    coveredZones: diagnostics.coveredZones
  };
}

function runVariantPreflight({
  promptText,
  variant = 'primary',
  promptMeta = {},
  baselineScore = 0
}) {
  let working = String(promptText || '').trim();
  const bannedFirstPass = enforceMicroPhysicsBannedTerms(working, variant);
  working = bannedFirstPass.promptText;
  const density = enforcePhysicsDensityGate({
    promptText: working,
    variant,
    promptMeta,
    baselineScore
  });
  working = density.promptText;
  const bannedFinalPass = enforceMicroPhysicsBannedTerms(working, variant);
  working = bannedFinalPass.promptText;

  const bannedTermCount = (bannedFinalPass.violations || [])
    .reduce((sum, item) => sum + (Number(item.count) || 0), 0);
  const anchorCoverage = computeAnchorCoverageDiagnostics(working);
  const anchorPass = anchorCoverage.missing.length === 0;
  const pass = density.pass && bannedFinalPass.pass && anchorPass;
  return {
    ok: pass,
    promptText: working,
    diagnostics: {
      score: density.score,
      ratio: density.ratio,
      targetScore: density.targetScore,
      reinforcementPasses: density.reinforcementPasses,
      topContributors: density.topContributors,
      coveredZones: density.coveredZones,
      bannedTermCount,
      bannedTerms: bannedFinalPass.violations || [],
      rewriteApplied: bannedFirstPass.rewriteApplied || bannedFinalPass.rewriteApplied,
      anchorCoverage
    },
    failureReason: pass
      ? null
      : (!density.pass
        ? `physics_density_ratio_below_target (${density.ratio} < ${PHYSICS_DENSITY_MIN_RATIO})`
        : (!bannedFinalPass.pass
          ? `banned_terms_remaining (${(bannedFinalPass.violations || []).map(item => item.term).join(', ')})`
          : `anchor_coverage_missing (${anchorCoverage.missing.join(',')})`))
  };
}

const WARDROBE_TEMPLATE_COLLAPSE_PATTERNS = [
  {
    id: 'legacy_lace_crop_template',
    regex: /structured lace crop bodice\s*\+\s*separate slit skirt/i
  },
  {
    id: 'legacy_lace_cocktail_set',
    regex: /high-fashion two-piece lace cocktail-set/i
  },
  {
    id: 'legacy_lace_evening_set',
    regex: /high-fashion two-piece lace evening-set/i
  },
  {
    id: 'legacy_safe_lace_lock',
    regex: /keep elegant lace cocktail styling/i
  }
];

function detectWardrobeTemplateCollapse(promptText = '') {
  const source = String(promptText || '');
  const matches = [];
  for (const pattern of WARDROBE_TEMPLATE_COLLAPSE_PATTERNS) {
    if (pattern.regex.test(source)) {
      matches.push(pattern.id);
    }
  }
  return matches;
}

const SAFE_IMAGE_SAFETY_RETRY_REPLACEMENTS = [
  { pattern: /\bthigh-high\b/gi, replacement: 'thigh-high' },
  { pattern: /\bupper-thigh\b/gi, replacement: 'upper-thigh' },
  { pattern: /\bhigh-cut\b/gi, replacement: 'tailored' },
  { pattern: /\bslit\b/gi, replacement: 'tailored seam' },
  { pattern: /\brevealing\b/gi, replacement: 'tailored' },
  { pattern: /\bseductive\b/gi, replacement: 'confident' },
  { pattern: /\bprovocative\b/gi, replacement: 'elegant' },
  { pattern: /\bskin-forward\b/gi, replacement: 'shape-forward' },
  { pattern: /\bside-waist\b/gi, replacement: 'side-panel' },
  { pattern: /\bhosiery\b/gi, replacement: 'stockings' }
];

const SAFE_IMAGE_SAFETY_RETRY_DROP_LINE_PATTERNS = [
  /\berotic intent\b/i,
  /\bfetish\b/i,
  /\bexplicit sexual\b/i,
  /\bnudity\b/i
];

const SAFE_IMAGE_SAFETY_RETRY_ANCHOR_DROP_PATTERNS = [
  /\berotic intent\b/i,
  /\bfetish\b/i,
  /\bexplicit sexual\b/i,
  /\bnudity\b/i
];

function sanitizeSafeRetryAnchorLine(line) {
  let sanitized = String(line || '').trim();
  if (!sanitized) return '';
  for (const { pattern, replacement } of SAFE_LEXICON_REPLACEMENTS) {
    sanitized = sanitized.replace(pattern, replacement);
  }
  for (const { pattern, replacement } of SAFE_IMAGE_SAFETY_RETRY_REPLACEMENTS) {
    sanitized = sanitized.replace(pattern, replacement);
  }
  if (SAFE_IMAGE_SAFETY_RETRY_ANCHOR_DROP_PATTERNS.some(pattern => pattern.test(sanitized))) {
    return '';
  }
  return sanitized.replace(/\s+/g, ' ').trim();
}

function buildCompactSafeImageSafetyRetryPrompt(sourcePromptText, promptMeta = {}, retryOrdinal = 2) {
  const anchors = collectPromptAnchorBullets(sourcePromptText);
  const sceneAnchors = anchors.scene
    .map(sanitizeSafeRetryAnchorLine)
    .filter(Boolean)
    .slice(0, 3);
  const poseAnchors = anchors.pose
    .map(sanitizeSafeRetryAnchorLine)
    .filter(Boolean)
    .slice(0, 3);
  const titleLine = promptMeta?.title
    ? `Prompt anchor: ${promptMeta.title}`
    : 'Prompt anchor: preserve scene framing from source prompt.';
  const lines = [
    'ULTRA-SAFE IMAGE RECOVERY TEMPLATE (MANDATORY):',
    '- Generate a policy-safe editorial frame of the exact same adult woman from the reference image.',
    '- Keep full-body composition and direct camera gaze while remaining fully non-explicit.',
    titleLine,
    buildIdentityDriftSentinelBlock('safe-retry')
  ];

  if (sceneAnchors.length) {
    lines.push('Scene anchors (policy-safe):');
    lines.push(...sceneAnchors.map(item => `- ${item}`));
  } else {
    lines.push('Scene anchors (policy-safe):');
    lines.push('- Preserve the same private luxury-suite environment and camera framing intent.');
  }

  if (poseAnchors.length) {
    lines.push('Pose anchors (policy-safe):');
    lines.push(...poseAnchors.map(item => `- ${item}`));
  } else {
    lines.push('Pose anchors (policy-safe):');
    lines.push('- Preserve the same support contact and stance balance from the source prompt.');
  }

  lines.push(
    'Wardrobe safety lock:',
    '- Keep prompt-defined elegant two-piece cocktail styling with coverage-forward boundaries and no exposure-focused emphasis.',
    '- Keep prompt-specified hosiery/heels when compliant; otherwise keep conservative equivalents without changing identity or color-family intent.',
    'Physics and realism lock:',
    '- Maintain support-contact compression, non-penetration, gravity-consistent drape, and coherent light-shadow geometry.',
    '- Preserve camera-authentic skin and fabric texture; avoid CGI smoothing or composited edges.',
    'Hard safety boundary:',
    '- No nudity, fetish framing, erotic intent, or body-part emphasis language.',
    '- Identity fidelity is mandatory and takes precedence over outfit complexity.',
    ...(retryOrdinal >= 3
      ? ['- Ultra-safe escalation: simplify styling details before risking identity drift or policy violations.']
      : [])
  );

  return lines.join('\n');
}

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

function buildSafeImageSafetyRetryTypeBlock(retryOrdinal = 1) {
  if (retryOrdinal <= 1) {
    return [
      'SAFE RETRY PROMPTING TYPE A (COMPLIANCE-PRESERVING EDGE RECAST):',
      '- Keep the exact same adult identity, scene hero props, and pose choreography from the failed safe attempt.',
      '- Recast wording toward compliance-stable fashion portrait language without flattening sultry editorial tension.',
      '- Maintain daring but non-explicit silhouette mechanics through physically grounded fabric behavior, not explicit emphasis terms.',
      '- Keep microphysics density high: slit edge tension, hosiery band compression gradient, ankle crease logic, and heel-floor load path.',
      '- Preserve nightlife mood: richer contrast, polished highlights, atmospheric depth cues, and controlled haze where specified.',
      '- Preserve camera realism: coherent catchlights, pore-scale detail, fabric fiber breakup, and clean contact-shadow attachment.'
    ].join('\n');
  }
  return [
    'SAFE RETRY PROMPTING TYPE B (COUNTERFACTUAL SAFETY-VALIDATED CAUSAL REBUILD):',
    '- Use an alternate prompting structure from Type A: counterfactual rejection plus causal rendering invariants.',
    '- Counterfactual rejection: if a wording choice causes safety blocking or template collapse, replace phrasing but keep the same visual intent and scene anchors.',
    '- Causal invariants: pose load path -> seam strain -> fold topology -> shadow geometry must remain coherent per critical region.',
    '- Identity-first rerender: face geometry, smile asymmetry, brow arc, and hair part/wave remain locked before outfit detailing.',
    '- Keep the two-piece couture topology, true thigh-high stocking geometry, and pointed heel mechanics intact.',
    '- Keep edge and sultry attitude through framing, posture, and material response while remaining strictly non-explicit.',
    '- Increase anti-template variance: preserve this prompt title’s distinct setting and avoid generic lounge fallback composition.'
  ].join('\n');
}

function uniqueDirectiveLines(lines = []) {
  const output = [];
  const seen = new Set();
  for (const line of lines) {
    const normalized = String(line || '').trim();
    if (!normalized) continue;
    const key = normalized.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(normalized);
  }
  return output;
}

function buildRescueSuperpositionBranches({ variant = 'primary', rescueRound = 1 }) {
  const safeLike = resolveVariantFamily(variant) !== 'primary';
  const safetyTone = safeLike
    ? 'while remaining strictly non-explicit and policy-safe.'
    : 'while remaining strictly non-explicit.';
  const rescueEscalationTone = rescueRound >= 2
    ? '- Escalate one tier beyond prior rescue output and reject template reuse.'
    : '';

  return [
    {
      id: 'identity_gaze_lock',
      targets: ['identity', 'gaze'],
      checklistTargets: [],
      baseScore: 0.9,
      directives: [
        'Lock exact facial geometry, smile asymmetry, brow arc, and hair-part identity from the reference.',
        `Keep direct lens-locked gaze with natural vergence and coherent bilateral catchlights ${safetyTone}`,
        'Reject look-alike drift, age-shift, and ethnicity-shift before wardrobe refinements.'
      ]
    },
    {
      id: 'scene_anchor_rebuild',
      targets: ['sceneAdherence'],
      checklistTargets: [],
      baseScore: 0.8,
      directives: [
        'Rebuild prompt-title scene anchors with explicit hero props and unmistakable location identity.',
        'Preserve title-specific atmosphere and camera framing; reject generic fallback venues.',
        'Strengthen depth layering so environment cues remain readable behind the subject.'
      ]
    },
    {
      id: 'pose_kinematics_closure',
      targets: ['poseAdherence'],
      checklistTargets: ['supportContact', 'nonPenetration', 'gravityDrape'],
      baseScore: 0.85,
      directives: [
        'Rebuild pose choreography: one explicit support contact, one torsion cue, one expressive hand, and one leg-line mechanic.',
        'Keep center-of-mass projection and support polygon physically coherent with visible compression cues.',
        'Reject floating limbs, broken ankle geometry, and disconnected hand/support interactions.'
      ]
    },
    {
      id: 'edge_styling_intensifier',
      targets: ['edge', 'attireReplacement'],
      checklistTargets: [],
      baseScore: 0.75,
      directives: [
        'Increase editorial edge through silhouette geometry, contrast topology, and assertive couture posture.',
        'Preserve clear two-piece topology, slit mechanics, and distinct top/skirt separation.',
        'Keep sultry nightlife energy via cinematography and material response, not explicit framing.'
      ]
    },
    {
      id: 'physics_realism_matrix',
      targets: ['physics', 'realism'],
      checklistTargets: ['supportContact', 'nonPenetration', 'gravityDrape', 'lightShadowGeometry', 'materialResponse'],
      baseScore: 1.0,
      directives: [
        'Solve causal chain per critical zone: load path -> seam strain -> fold flow -> shadow geometry -> specular trajectory.',
        'Increase microphysics density at slit edge, stocking band, knee, ankle, heel-floor contact, and hand-support contact.',
        'Reject CGI signatures: wax skin, tiled textures, detached shadows, and haloed edges.'
      ]
    },
    {
      id: 'anti_template_variance',
      targets: ['sceneAdherence', 'poseAdherence', 'edge'],
      checklistTargets: [],
      baseScore: 0.55,
      directives: [
        'Force composition variance for this prompt title; do not reuse prior rescue framing.',
        'Preserve identity lock while changing camera beat, limb rhythm, and prop interaction.',
        rescueEscalationTone
      ].filter(Boolean)
    }
  ];
}

function scoreRescueSuperpositionBranch(branch, failingKeys = new Set(), checklistFailures = new Set(), rescueRound = 1) {
  let score = Number(branch?.baseScore) || 0;
  for (const key of branch?.targets || []) {
    if (failingKeys.has(key)) {
      score += 2;
    }
  }
  for (const key of branch?.checklistTargets || []) {
    if (checklistFailures.has(key)) {
      score += 1.2;
    }
  }
  if (rescueRound >= 2 && (branch?.id === 'physics_realism_matrix' || branch?.id === 'scene_anchor_rebuild')) {
    score += 0.35;
  }
  return score;
}

function collapseRescueDirectivesSuperposition({
  variant = 'primary',
  rescueRound = 1,
  failingKeys = [],
  checklistFailureKeys = [],
  scorerDirectives = [],
  fallbackDirectives = [],
  targetedDirectives = []
}) {
  const failingKeySet = new Set((failingKeys || []).filter(Boolean));
  const checklistKeySet = new Set((checklistFailureKeys || []).filter(Boolean));
  const prioritized = [];
  const selectedBranches = [];

  const seedDirectives = uniqueDirectiveLines([
    ...(scorerDirectives || []),
    ...(targetedDirectives || []),
    ...(fallbackDirectives || [])
  ]);

  if (RESCUE_SUPERPOSITION_MODE) {
    const rankedBranches = buildRescueSuperpositionBranches({ variant, rescueRound })
      .map(branch => ({
        ...branch,
        score: scoreRescueSuperpositionBranch(branch, failingKeySet, checklistKeySet, rescueRound)
      }))
      .sort((a, b) => b.score - a.score);

    for (const branch of rankedBranches) {
      if (selectedBranches.length >= RESCUE_SUPERPOSITION_TOP_BRANCHES) break;
      if (branch.score < RESCUE_SUPERPOSITION_MIN_BRANCH_SCORE) continue;
      selectedBranches.push({ id: branch.id, score: Number(branch.score.toFixed(2)) });
      prioritized.push(...branch.directives);
    }
  }

  const merged = uniqueDirectiveLines([
    ...seedDirectives,
    ...prioritized
  ]);
  const directiveCap = Math.min(
    Math.max(FIRST_PRINCIPLES_DIRECTIVE_CAP, getAdaptiveRescueDirectiveCap()),
    20
  );

  return {
    directives: merged.slice(0, directiveCap),
    selectedBranches
  };
}

function buildSafeQualityRescuePrompt({ basePrompt, qualityEvaluation, rescueRound = 1, promptMeta = {} }) {
  const failedLabels = (qualityEvaluation?.failedDimensions || [])
    .map(item => item?.label || item?.key)
    .filter(Boolean);
  const failedKeys = (qualityEvaluation?.failedDimensions || [])
    .map(item => item?.key)
    .filter(Boolean);
  const checklistFailureKeys = (qualityEvaluation?.physicsChecklistFailures || [])
    .map(item => item?.key)
    .filter(Boolean);
  const fallbackDirectives = [
    'Raise edge intensity through composition, silhouette geometry, and contrast topology while remaining non-explicit.',
    'Raise scene adherence by making prompt-title hero props and location cues clearly visible in frame.',
    'Raise pose adherence by enforcing one explicit support contact, one torsion cue, and one leg-line mechanic.',
    'Raise physics coherence with stronger load-path, seam-strain, fold-flow, and contact-shadow continuity.',
    'Keep identity and lens-locked gaze unchanged while improving realism at skin, fabric, and contact boundaries.'
  ];
  const safeEscalationDirectives = rescueRound >= 2
    ? [
        'Escalate safe rescue one tier: stronger scene/pose fidelity and anti-template composition variance without explicit framing.',
        'Preserve policy-safe language while materially increasing edge, realism, and physics closure.'
      ]
    : [];
  const collapsed = collapseRescueDirectivesSuperposition({
    variant: 'safe-retry',
    rescueRound,
    failingKeys: failedKeys,
    checklistFailureKeys,
    scorerDirectives: Array.isArray(qualityEvaluation?.rescueDirectives) ? qualityEvaluation.rescueDirectives : [],
    fallbackDirectives,
    targetedDirectives: safeEscalationDirectives
  });
  const rescueDirectives = collapsed.directives.length
    ? collapsed.directives
    : fallbackDirectives;
  const collapsedBranchIds = collapsed.selectedBranches.map(item => item.id);

  let rescuePrompt = buildFirstPrinciplesPrompt({
    sourcePrompt: basePrompt,
    variant: 'safe-retry',
    promptMeta,
    mode: 'safe-retry',
    retryOrdinal: rescueRound + 1,
    recoveryDeficits: failedLabels,
    recoveryDirectives: rescueDirectives.slice(0, FIRST_PRINCIPLES_DIRECTIVE_CAP)
  });
  rescuePrompt = `${rescuePrompt.trim()}\n\nSAFE QUALITY RESCUE PROTOCOL (ATTEMPT ${rescueRound + 1}):\n- Previous safe render failed the quality gate.\n- Keep policy-safe framing and identity lock, but materially increase edge, scene fidelity, pose fidelity, and physics coherence.\n- Preserve two-piece topology and true thigh-high stocking geometry.`;
  if (collapsedBranchIds.length) {
    rescuePrompt = `${rescuePrompt.trim()}\n- Superposition collapse selected rescue branches: ${collapsedBranchIds.join(', ')}.`;
  }
  rescuePrompt = `${rescuePrompt.trim()}\n\n${buildIdentityDriftSentinelBlock('safe-retry')}`;
  const safeRescueResolutionBlock = buildResolutionUtilizationBlock('safe-retry');
  if (safeRescueResolutionBlock) {
    rescuePrompt = `${rescuePrompt.trim()}\n\n${safeRescueResolutionBlock}`;
  }

  rescuePrompt = applySafePolicyHardening(rescuePrompt, 'safe');
  rescuePrompt = applyImageSafetyComplianceFilter(rescuePrompt, 'safe');
  rescuePrompt = enforceFallbackPromptWindow(rescuePrompt, 'safe-retry', promptMeta);
  const output = enforcePromptHardCap(rescuePrompt, 'safe-retry', promptMeta);
  return output;
}

function buildSafeImageSafetyRetryPrompt(promptText, promptMeta = {}, retryOrdinal = 1) {
  let rewritten = String(promptText || '').trim();
  if (!rewritten) {
    return rewritten;
  }
  recordPromptBuildStage(promptMeta, `safe-retry-${retryOrdinal}`, 'safe-retry-input', rewritten);

  if (NO_IMAGE_RECOVERY_RECOMPILER_MODE) {
    const retryType = buildSafeImageSafetyRetryTypeBlock(retryOrdinal);
    const retryTypeDirectives = String(retryType || '')
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.startsWith('- '))
      .map(line => line.replace(/^- /, '').trim());
    let rebuilt = buildFirstPrinciplesPrompt({
      sourcePrompt: rewritten,
      variant: 'safe-retry',
      promptMeta,
      mode: 'safe-retry',
      retryOrdinal,
      recoveryDeficits: [`no_image recovery attempt ${retryOrdinal}`],
      recoveryDirectives: retryTypeDirectives
    });
    rebuilt = `${rebuilt}\n\n${buildIdentityDriftSentinelBlock('safe-retry')}`;
    const safeRetryResolutionBlock = buildResolutionUtilizationBlock('safe-retry');
    if (safeRetryResolutionBlock) {
      rebuilt = `${rebuilt.trim()}\n\n${safeRetryResolutionBlock}`;
    }
    rebuilt = applySafePolicyHardening(rebuilt, 'safe');
    rebuilt = applyImageSafetyComplianceFilter(rebuilt, 'safe');
    rebuilt = enforceFallbackPromptWindow(rebuilt, 'safe-retry', promptMeta);
    recordPromptBuildStage(promptMeta, `safe-retry-${retryOrdinal}`, 'safe-retry-windowed', rebuilt);

    const retryWordCap = ENABLE_PROMPT_HARD_CAP
      ? Math.min(PROMPT_HARD_CAP_WORDS, SAFE_IMAGE_SAFETY_RETRY_PROMPT_WORD_CAP)
      : SAFE_IMAGE_SAFETY_RETRY_PROMPT_WORD_CAP;
    if (countWords(rebuilt) > retryWordCap) {
      rebuilt = trimTextToWordLimit(rebuilt, retryWordCap);
    }
    const output = enforcePromptHardCap(rebuilt.trim(), 'safe-retry', promptMeta);
    recordPromptBuildStage(promptMeta, `safe-retry-${retryOrdinal}`, 'safe-retry-output', output);
    return output;
  }

  for (const { pattern, replacement } of SAFE_IMAGE_SAFETY_RETRY_REPLACEMENTS) {
    rewritten = rewritten.replace(pattern, replacement);
  }

  rewritten = rewritten
    .split(/\r?\n/)
    .map(line => line.trimEnd())
    .filter(line => !SAFE_IMAGE_SAFETY_RETRY_DROP_LINE_PATTERNS.some(pattern => pattern.test(line)))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  const typeBlock = buildSafeImageSafetyRetryTypeBlock(retryOrdinal);
  rewritten = `${rewritten}\n\n${[
    `IMAGE SAFETY RETRY OVERRIDE (MANDATORY, ATTEMPT ${retryOrdinal + 1}):`,
    '- Prior safe attempt was blocked by IMAGE_SAFETY; retry with a different prompting type while preserving target look and scene intent.',
    '- Keep adult, fully non-explicit, fashion-editorial framing with compliance-stable wording.',
    '- Keep identity fidelity, scene adherence, and pose adherence locked before stylistic variance.',
    '- Keep daring, edgy, sultry energy through composition, contrast, and physically coherent garment mechanics.',
    '- Do not collapse into conservative generic template output.',
    typeBlock,
    'Safe retry hard invariants:',
    '- Preserve two-piece topology and true thigh-high stocking geometry (never knee-high).',
    '- Preserve hosiery microphysics: top-band position high on upper thigh, denier gradient, and plausible stretch/deformation cues.',
    '- Preserve micro-details: stitch continuity, lace edge micro-shadows, skin texture breakup, and coherent specular flow.',
    '- Preserve contact realism: support compression, non-penetration, cast-shadow anchoring, and heel-floor stability.',
    buildIdentityDriftSentinelBlock('safe-retry')
  ].join('\n')}`;
  const safeRetryResolutionBlock = buildResolutionUtilizationBlock('safe-retry');
  if (safeRetryResolutionBlock) {
    rewritten = `${rewritten.trim()}\n\n${safeRetryResolutionBlock}`;
  }

  rewritten = applySafePolicyHardening(rewritten, 'safe');
  rewritten = applyImageSafetyComplianceFilter(rewritten, 'safe');
  rewritten = enforceFallbackPromptWindow(rewritten, 'safe-retry', promptMeta);
  recordPromptBuildStage(promptMeta, `safe-retry-${retryOrdinal}`, 'safe-retry-windowed', rewritten);

  const retryWordCap = ENABLE_PROMPT_HARD_CAP
    ? Math.min(PROMPT_HARD_CAP_WORDS, SAFE_IMAGE_SAFETY_RETRY_PROMPT_WORD_CAP)
    : SAFE_IMAGE_SAFETY_RETRY_PROMPT_WORD_CAP;
  if (countWords(rewritten) > retryWordCap) {
    const trimmed = trimTextToWordLimit(rewritten, retryWordCap);
    const label = promptMeta?.promptId && promptMeta?.title
      ? `${promptMeta.promptId} ${promptMeta.title}`
      : (promptMeta?.title || promptMeta?.promptId || 'n/a');
    log(
      `Safe IMAGE_SAFETY retry cap applied (${label}, retry=${retryOrdinal}): ${countWords(rewritten)} -> ${countWords(trimmed)} words`
    );
    rewritten = trimmed;
  }

  const output = enforcePromptHardCap(rewritten.trim(), 'safe-retry', promptMeta);
  recordPromptBuildStage(promptMeta, `safe-retry-${retryOrdinal}`, 'safe-retry-output', output);
  return output;
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

function selectTargetedMicrodetailModules(modules, promptMeta = {}) {
  const moduleCap = getAdaptiveMicrodetailModuleCap();
  if (!TARGETED_MICRODETAIL_MODE || modules.length <= moduleCap) {
    return modules;
  }

  const title = String(promptMeta?.title || '').toLowerCase();
  const priorityIndexes = [0, 1, 2];

  const waterScene = /(pool|jacuzzi|hot tub|spa|water|fountain|steam|wet)/i.test(title);
  const exteriorScene = /(street|alley|rooftop|balcony|outside|exterior|doorway|night walk)/i.test(title);
  if (waterScene || exteriorScene) {
    priorityIndexes.push(3);
  } else {
    priorityIndexes.push(4);
  }
  priorityIndexes.push(5);

  const ordered = [];
  for (const index of priorityIndexes) {
    if (index >= modules.length || ordered.includes(index)) {
      continue;
    }
    ordered.push(index);
    if (ordered.length >= moduleCap) {
      break;
    }
  }
  for (let i = 0; i < modules.length && ordered.length < moduleCap; i += 1) {
    if (!ordered.includes(i)) {
      ordered.push(i);
    }
  }

  return ordered.map(index => modules[index]);
}

function enforcePromptWordTarget(promptText, variant, promptMeta = {}) {
  return enforceFallbackPromptWindow(promptText, variant, promptMeta);
}

function applyPromptOverrides(promptText, variant, promptMeta = {}) {
  const normalizedPrompt = String(promptText || '').trim();
  recordPromptBuildStage(promptMeta, variant, 'input-raw', normalizedPrompt);
  const richPromptMinimalMode = RICH_PROMPT_MINIMAL_OVERLAY && isRichStructuredPrompt(normalizedPrompt, variant);
  const sceneDirectorBlueprint = buildSceneDirectorBlueprint(promptMeta.promptId, promptMeta.title, variant);
  if (FIRST_PRINCIPLES_RECOMPILER_MODE) {
    let rebuiltPrompt = buildFirstPrinciplesPrompt({
      sourcePrompt: normalizedPrompt,
      variant,
      promptMeta,
      mode: 'standard'
    });
    if (sceneDirectorBlueprint) {
      rebuiltPrompt = `${sceneDirectorBlueprint}\n\n${rebuiltPrompt}`;
    }
    const directionSupremacy = buildPromptDirectionSupremacyBlock(normalizedPrompt, promptMeta, variant);
    if (directionSupremacy) {
      rebuiltPrompt = `${rebuiltPrompt.trim()}\n\n${directionSupremacy}`;
    }
    rebuiltPrompt = `${rebuiltPrompt.trim()}\n\n${buildAttireTopologyInvariantBlock(variant)}`;
    rebuiltPrompt = `${rebuiltPrompt.trim()}\n\n${buildIdentityFinalOverrideBlock()}`;
    rebuiltPrompt = `${rebuiltPrompt.trim()}\n\n${buildIdentityDriftSentinelBlock()}`;
    const resolutionBlock = buildResolutionUtilizationBlock(variant);
    if (resolutionBlock) {
      rebuiltPrompt = `${rebuiltPrompt.trim()}\n\n${resolutionBlock}`;
    }
    recordPromptBuildStage(promptMeta, variant, 'first-principles-composed', rebuiltPrompt);
    rebuiltPrompt = applySafePolicyHardening(rebuiltPrompt, variant);
    rebuiltPrompt = applyImageSafetyComplianceFilter(rebuiltPrompt, variant);
    rebuiltPrompt = enforcePromptWordTarget(rebuiltPrompt, variant, promptMeta);
    recordPromptBuildStage(promptMeta, variant, 'first-principles-safety-filter', rebuiltPrompt);
    rebuiltPrompt = enforcePromptHardCap(rebuiltPrompt, variant, promptMeta);
    recordPromptBuildStage(promptMeta, variant, 'output-final', rebuiltPrompt);
    return rebuiltPrompt;
  }
  if (richPromptMinimalMode) {
    const sections = [];
    if (sceneDirectorBlueprint) {
      sections.push(sceneDirectorBlueprint);
    }
    if (normalizedPrompt) {
      sections.push(normalizedPrompt);
    }
    const directionSupremacy = buildPromptDirectionSupremacyBlock(normalizedPrompt, promptMeta, variant);
    if (directionSupremacy) {
      sections.push(directionSupremacy);
    }
    sections.push(buildAttireTopologyInvariantBlock(variant));
    sections.push(buildIdentityFinalOverrideBlock());
    sections.push(buildIdentityDriftSentinelBlock());
    let minimalPrompt = sections.join('\n\n').trim();
    recordPromptBuildStage(promptMeta, variant, 'rich-minimal-composed', minimalPrompt);
    minimalPrompt = applySafePolicyHardening(minimalPrompt, variant);
    recordPromptBuildStage(promptMeta, variant, 'rich-minimal-safe-policy', minimalPrompt);
    minimalPrompt = applyImageSafetyComplianceFilter(minimalPrompt, variant);
    recordPromptBuildStage(promptMeta, variant, 'rich-minimal-safety-filter', minimalPrompt);
    minimalPrompt = enforcePromptWordTarget(minimalPrompt, variant, promptMeta);
    return enforcePromptHardCap(minimalPrompt, variant, promptMeta);
  }
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
    if (PHYSICS_REALISM_PROMPT_HARD_MODE && getAdaptivePhysicsPriorityMultiplier() >= 2) {
      rebuilt.push(buildPhysicsRealismPriorityBlock(
        variant,
        getAdaptivePhysicsPriorityMultiplier(),
        PHYSICS_REALISM_PROMPT_DENSITY
      ));
    }
    if (DIRECT_CAMERA_GAZE_OVERRIDE) {
      rebuilt.push(buildDirectGazeRealismBlock(variant, PHYSICS_REALISM_OVERRIDE_LEVEL));
    }
    if (normalizedPrompt) {
      rebuilt.push([
        'PROMPT-SPECIFIC DIRECTIVES (MANDATORY):',
        normalizedPrompt
      ].join('\n'));
    }
    const directionSupremacy = buildPromptDirectionSupremacyBlock(normalizedPrompt, promptMeta, variant);
    if (directionSupremacy) {
      rebuilt.push(directionSupremacy);
    }
    let rebuiltPrompt = rebuilt.join('\n\n');
    rebuiltPrompt = `${rebuiltPrompt.trim()}\n\n${buildAttireTopologyInvariantBlock(variant)}`;
    rebuiltPrompt = `${rebuiltPrompt.trim()}\n\n${buildIdentityFinalOverrideBlock()}`;
    rebuiltPrompt = `${rebuiltPrompt.trim()}\n\n${buildIdentityDriftSentinelBlock()}`;
    const rebuiltResolutionBlock = buildResolutionUtilizationBlock(variant);
    if (rebuiltResolutionBlock) {
      rebuiltPrompt = `${rebuiltPrompt.trim()}\n\n${rebuiltResolutionBlock}`;
    }
    recordPromptBuildStage(promptMeta, variant, 'edge-rebuild-composed', rebuiltPrompt);
    rebuiltPrompt = applySafePolicyHardening(rebuiltPrompt, variant);
    rebuiltPrompt = enforcePromptWordTarget(rebuiltPrompt, variant, promptMeta);
    rebuiltPrompt = applyImageSafetyComplianceFilter(rebuiltPrompt, variant);
    recordPromptBuildStage(promptMeta, variant, 'edge-rebuild-safety-filter', rebuiltPrompt);
    rebuiltPrompt = enforcePromptHardCap(rebuiltPrompt, variant, promptMeta);
    recordPromptBuildStage(promptMeta, variant, 'output-final', rebuiltPrompt);
    return rebuiltPrompt;
  }

  let updated = normalizedPrompt;
  if (PROMPT_FIRST_PRIORITY_MODE) {
    if (ENABLE_IDENTITY_SUPREMACY_LOCK) {
      updated = `${updated}\n\n${buildIdentitySupremacyBlock(variant, IDENTITY_SUPREMACY_LEVEL)}`;
    }
    if (PHYSICS_REALISM_PROMPT_HARD_MODE && getAdaptivePhysicsPriorityMultiplier() >= 2) {
      updated = `${updated}\n\n${buildPhysicsRealismPriorityBlock(
        variant,
        getAdaptivePhysicsPriorityMultiplier(),
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
    if (PHYSICS_REALISM_PROMPT_HARD_MODE && getAdaptivePhysicsPriorityMultiplier() >= 2) {
      updated = `${buildPhysicsRealismPriorityBlock(
        variant,
        getAdaptivePhysicsPriorityMultiplier(),
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
  const directionSupremacy = buildPromptDirectionSupremacyBlock(normalizedPrompt, promptMeta, variant);
  if (directionSupremacy) {
    updated = `${updated.trim()}\n\n${directionSupremacy}`;
  }
  updated = `${updated.trim()}\n\n${buildAttireTopologyInvariantBlock(variant)}`;
  updated = `${updated.trim()}\n\n${buildIdentityFinalOverrideBlock()}`;
  updated = `${updated.trim()}\n\n${buildIdentityDriftSentinelBlock()}`;
  const standardResolutionBlock = buildResolutionUtilizationBlock(variant);
  if (standardResolutionBlock) {
    updated = `${updated.trim()}\n\n${standardResolutionBlock}`;
  }
  recordPromptBuildStage(promptMeta, variant, 'standard-composed', updated);
  updated = applySafePolicyHardening(updated, variant);
  updated = enforcePromptWordTarget(updated, variant, promptMeta);
  updated = applyImageSafetyComplianceFilter(updated, variant);
  recordPromptBuildStage(promptMeta, variant, 'standard-safety-filter', updated);
  updated = enforcePromptHardCap(updated, variant, promptMeta);
  recordPromptBuildStage(promptMeta, variant, 'output-final', updated);
  return updated;
}

function applyPromptNonce(promptText, meta) {
  if (!PROMPT_NONCE_ENABLED) {
    return enforcePromptHardCap(promptText, meta?.variant || 'primary', meta);
  }
  const nonceBlock = [
    'RUN UNIQUENESS TOKEN (DO NOT RENDER AS TEXT IN SCENE):',
    `token=${meta.runNonce}-${meta.promptId}-${meta.variant}-${meta.attemptIndex}`,
    'Use this token only as generation-uniqueness metadata. Never place token characters on signage, clothing, props, or background surfaces.'
  ].join('\n');
  let basePrompt = String(promptText || '').trim();
  if (ENABLE_PROMPT_HARD_CAP) {
    const nonceWords = countWords(nonceBlock);
    const baseBudget = Math.max(120, PROMPT_HARD_CAP_WORDS - nonceWords);
    basePrompt = trimTextToWordLimit(basePrompt, baseBudget);
  }
  return `${basePrompt}\n\n${nonceBlock}`;
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

function isHeuristicParserName(parserName) {
  const normalized = String(parserName || '').trim().toLowerCase();
  return /(^|-)heuristic$/.test(normalized);
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

function pickFirstBoolean(source, keys) {
  for (const key of keys) {
    const value = source?.[key];
    if (typeof value === 'boolean') {
      return value;
    }
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      if (normalized === 'true') return true;
      if (normalized === 'false') return false;
    }
  }
  return null;
}

function parseIdentityFallbackAuditPayload(text) {
  const raw = String(text || '').trim();
  if (!raw) {
    return null;
  }

  const parsed = parseLooseJson(raw);
  if (parsed && typeof parsed === 'object') {
    const identityScore = pickFirstScore(parsed, ['identityScore', 'identity', 'identity_match']);
    const directGazeScore = pickFirstScore(parsed, ['directGazeScore', 'gaze', 'direct_camera_gaze']);
    const identityPass = pickFirstBoolean(parsed, ['identityPass', 'pass', 'identity_pass']);
    const diagnostics = typeof parsed.diagnostics === 'string' ? parsed.diagnostics.trim() : null;
    if (
      identityScore !== null
      || directGazeScore !== null
      || identityPass !== null
      || diagnostics
    ) {
      return {
        identityScore,
        directGazeScore,
        identityPass,
        diagnostics,
        parser: 'json',
        rawText: raw
      };
    }
  }

  const identityScore = extractRegexNumber(raw, [
    /"identityScore"\s*:\s*([0-9]+(?:\.[0-9]+)?)/i,
    /identity[_\s-]*score\s*[:=]\s*([0-9]+(?:\.[0-9]+)?)/i
  ]);
  const directGazeScore = extractRegexNumber(raw, [
    /"directGazeScore"\s*:\s*([0-9]+(?:\.[0-9]+)?)/i,
    /direct[_\s-]*gaze[_\s-]*score\s*[:=]\s*([0-9]+(?:\.[0-9]+)?)/i,
    /gaze[_\s-]*score\s*[:=]\s*([0-9]+(?:\.[0-9]+)?)/i
  ]);
  const passMatch = raw.match(/"identityPass"\s*:\s*(true|false)/i) || raw.match(/identity[_\s-]*pass\s*[:=]\s*(true|false)/i);
  const diagnosticsMatch = raw.match(/"diagnostics"\s*:\s*"([\s\S]*?)"/i);
  const identityPass = passMatch?.[1]
    ? passMatch[1].trim().toLowerCase() === 'true'
    : null;
  const diagnostics = diagnosticsMatch?.[1]?.trim() || null;

  if (
    identityScore === null
    && directGazeScore === null
    && identityPass === null
    && !diagnostics
  ) {
    return null;
  }

  return {
    identityScore,
    directGazeScore,
    identityPass,
    diagnostics,
    parser: 'heuristic',
    rawText: raw
  };
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
    realism: baseWeights.realism * getAdaptivePhysicsPriorityMultiplier(),
    physics: baseWeights.physics * getAdaptivePhysicsPriorityMultiplier()
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
    realism: baseWeights.realism * getAdaptivePhysicsPriorityMultiplier(),
    physics: baseWeights.physics * getAdaptivePhysicsPriorityMultiplier()
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
      '- If prompt specifies a daring two-piece and image defaults to blouse/businesswear/sheath-dress archetypes, cap attireReplacement <= 8.0 and edge <= 7.5.',
      '- If prompt-locked wardrobe colorway/material is mismatched (for example scarlet+satin becomes black+matte), cap attireReplacement <= 7.6.',
      '- If prompt demands two-piece separation and output fuses into one-piece dress styling, cap attireReplacement <= 7.4 and edge <= 7.2.',
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
    `- Physics/realism strictness factor is ${getAdaptivePhysicsPriorityMultiplier()}x; penalize subtle defects in these dimensions aggressively.`,
    '- If identity is below threshold, cap realism and physics at <= 8.9.',
    '- Penalize any age/ethnicity/face-shape drift from the reference identity.',
    '- Penalize scene drift: if location/hero-prop intent is missed, reduce edge and realism scores.',
    '- Penalize conservative wardrobe outcomes: if the look lacks clear revealing editorial cues (high-cut line, side-waist cut, open-back/shoulder, sheer panel, or high slit), cap edge at <= 8.2.',
    '- Penalize conservative fallback archetypes: if prompt specifies a daring two-piece and output defaults to blouse/businesswear/sweater/sheath-dress styling, cap attireReplacement <= 8.0 and edge <= 7.5.',
    '- Penalize color/material drift: if prompt-locked wardrobe colorway/material is mismatched (for example scarlet+satin becomes black+matte), cap attireReplacement <= 7.6.',
    '- Penalize topology fusion: if prompt requires a two-piece look and output collapses into one-piece dress styling, cap attireReplacement <= 7.4 and edge <= 7.2.',
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

function buildIdentityFallbackAuditPrompt({ promptId, title, variant }) {
  const gazeFloor = Math.min(IDENTITY_FALLBACK_AUDIT_MIN_SCORE, QUALITY_THRESHOLD_GAZE);
  return [
    'Strict identity fallback audit. Return ONE compact JSON object only.',
    'Compare GENERATED image against REFERENCE image.',
    'Evaluate only identity fidelity and direct camera gaze.',
    `Set identityPass true only if identityScore >= ${IDENTITY_FALLBACK_AUDIT_MIN_SCORE} and directGazeScore >= ${gazeFloor}.`,
    `Prompt metadata: id=${promptId}, title=${title}, variant=${variant}.`,
    'Output schema exactly:',
    '{"identityScore":0,"directGazeScore":0,"identityPass":false,"diagnostics":"max 16 words"}',
    'No markdown. No code fences. JSON only.'
  ].join('\n');
}

async function runIdentityFallbackAudit({
  promptId,
  title,
  variant,
  referenceInlineData,
  generatedImagePart
}) {
  if (!IDENTITY_FALLBACK_AUDIT_ENABLED) {
    return null;
  }
  if (!generatedImagePart?.inlineData) {
    return {
      enabled: true,
      available: false,
      errorType: 'input',
      message: 'Missing generated image inlineData for identity fallback audit'
    };
  }
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return {
      enabled: true,
      available: false,
      errorType: 'auth',
      message: 'Failed to obtain Google access token for identity fallback audit'
    };
  }

  const scorerPrompt = buildIdentityFallbackAuditPrompt({ promptId, title, variant });
  const request = await requestScorerApi({
    accessToken,
    parts: [
      { text: scorerPrompt },
      { inlineData: referenceInlineData },
      { inlineData: generatedImagePart.inlineData }
    ],
    maxOutputTokens: IDENTITY_FALLBACK_AUDIT_MAX_OUTPUT_TOKENS,
    temperature: 0,
    responseSchema: SCORER_FORCE_SCHEMA ? IDENTITY_FALLBACK_AUDIT_RESPONSE_SCHEMA : null
  });

  if (!request.ok) {
    return {
      enabled: true,
      available: false,
      errorType: request.errorType || 'unknown',
      status: request.status || null,
      statusText: request.statusText || null,
      message: request.message || null,
      responseSnippet: request.responseSnippet || null,
      responseHeaders: request.responseHeaders || null
    };
  }

  const texts = collectTextParts(request.body);
  let parsedAudit = null;
  for (const text of texts) {
    const candidate = parseIdentityFallbackAuditPayload(text);
    if (candidate) {
      parsedAudit = candidate;
      break;
    }
  }

  if (!parsedAudit) {
    const joinedText = texts.join('\n').trim() || request.responseText || '';
    parsedAudit = parseIdentityFallbackAuditPayload(joinedText);
  }

  if (!parsedAudit) {
    return {
      enabled: true,
      available: false,
      errorType: 'parse',
      message: 'Unable to parse identity fallback audit response',
      responseSnippet: String(request.responseText || '').slice(0, 2000),
      responseHeaders: request.responseHeaders || null
    };
  }

  const gazeFloor = Math.min(IDENTITY_FALLBACK_AUDIT_MIN_SCORE, QUALITY_THRESHOLD_GAZE);
  const identityScore = toScore(parsedAudit.identityScore);
  const directGazeScore = toScore(parsedAudit.directGazeScore);
  const derivedPass = Boolean(
    identityScore !== null
    && identityScore >= IDENTITY_FALLBACK_AUDIT_MIN_SCORE
    && (directGazeScore === null || directGazeScore >= gazeFloor)
  );
  const pass = parsedAudit.identityPass === null
    ? derivedPass
    : Boolean(parsedAudit.identityPass && derivedPass);

  return {
    enabled: true,
    available: true,
    pass,
    identityScore,
    directGazeScore,
    modelPass: parsedAudit.identityPass,
    thresholds: {
      identityScoreMin: IDENTITY_FALLBACK_AUDIT_MIN_SCORE,
      directGazeScoreMin: gazeFloor
    },
    diagnostics: parsedAudit.diagnostics || null,
    parser: parsedAudit.parser || 'unknown',
    responseHeaders: request.responseHeaders || null,
    rawText: String(parsedAudit.rawText || '').slice(0, 2000)
  };
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

  const resolveParsedFromRequest = (request, parserPrefix = '', { allowHeuristicReturn = false } = {}) => {
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
      if (completeHeuristic && allowHeuristicReturn) {
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
    if (completeHeuristic && allowHeuristicReturn) {
      return {
        ...completeHeuristic,
        responseHeaders: request.responseHeaders || null
      };
    }
    return null;
  };

  const primaryResolved = resolveParsedFromRequest(primaryRequest, '', { allowHeuristicReturn: false });
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
      responseSchema: SCORER_STRICT_REQUERY_SCHEMA ? SCORER_RESPONSE_SCHEMA : null
    });
    if (requeryRequest.ok) {
      const requeryResolved = resolveParsedFromRequest(
        requeryRequest,
        'requery',
        { allowHeuristicReturn: false }
      );
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
  if (deferredHeuristic?.parsed) {
    return {
      ok: true,
      parsed: deferredHeuristic.parsed,
      rawText: deferredHeuristic.rawText,
      parser: deferredHeuristic.parser || 'heuristic',
      responseHeaders: primaryRequest.responseHeaders || null
    };
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
  const auditOnlyMode = !ENABLE_QUALITY_GATE && ENABLE_QUALITY_AUDIT_WHEN_GATE_OFF;
  const finalizeQualityResult = async (qualityResult) => {
    if (!qualityResult || qualityResult.scorerAvailable) {
      return qualityResult;
    }
    if (qualityResult?.scorerError?.errorType !== 'parse') {
      return qualityResult;
    }
    if (!IDENTITY_FALLBACK_AUDIT_ENABLED) {
      return qualityResult;
    }
    const identityFallbackAudit = await runIdentityFallbackAudit({
      promptId,
      title,
      variant,
      referenceInlineData,
      generatedImagePart: imagePart
    });
    return {
      ...qualityResult,
      identityFallbackAudit: identityFallbackAudit || null
    };
  };

  if (!ENABLE_QUALITY_GATE && !ENABLE_QUALITY_AUDIT_WHEN_GATE_OFF) {
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
    return finalizeQualityResult({
      enabled: true,
      auditOnly: auditOnlyMode,
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
    });
  }

  const parsed = scoreResult.parsed || {};
  const scorerParser = String(scoreResult.parser || 'unknown');
  const parserIsHeuristic = HEURISTIC_SCORER_AUDIT_ONLY && isHeuristicParserName(scorerParser);
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
    return finalizeQualityResult({
      enabled: true,
      auditOnly: auditOnlyMode,
      pass: false,
      scorerAvailable: false,
      scorerParser,
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
    });
  }

  const scoreValues = Object.values(scores).map(value => Number(value));
  const allZeroScores = scoreValues.length > 0 && scoreValues.every(value => Number.isFinite(value) && value <= 0.01);
  if (allZeroScores) {
    return finalizeQualityResult({
      enabled: true,
      auditOnly: auditOnlyMode,
      pass: false,
      scorerAvailable: false,
      scorerParser,
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
    });
  }

  const minScore = Math.min(...scoreValues);
  const maxScore = Math.max(...scoreValues);
  const nearUniformScores = Number.isFinite(minScore) && Number.isFinite(maxScore) && (maxScore - minScore) <= 0.15;
  const looksLikeRepairArtifact = scorerParser.startsWith('repair');
  if (nearUniformScores && looksLikeRepairArtifact) {
    return finalizeQualityResult({
      enabled: true,
      auditOnly: auditOnlyMode,
      pass: false,
      scorerAvailable: false,
      scorerParser,
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
    });
  }

  // Some repair responses include placeholder mid-scores (e.g., many 5.0 values)
  // with "incomplete" diagnostics. Treat these as parser-unavailable artifacts.
  const roundedScoreValues = scoreValues
    .filter(value => Number.isFinite(value))
    .map(value => Math.round(value * 10) / 10);
  const scoreBuckets = new Map();
  for (const value of roundedScoreValues) {
    scoreBuckets.set(value, (scoreBuckets.get(value) || 0) + 1);
  }
  let largestBucketValue = null;
  let largestBucketCount = 0;
  for (const [value, count] of scoreBuckets.entries()) {
    if (count > largestBucketCount) {
      largestBucketValue = value;
      largestBucketCount = count;
    }
  }
  const rawDiagnosticsHint = `${String(parsed.diagnostics || '')}\n${String(scoreResult.rawText || '')}`;
  const hasIncompleteHint = /\bincomplete\b|\bmissing\b/i.test(rawDiagnosticsHint);
  const majorityMidFillArtifact = (
    looksLikeRepairArtifact
    && hasIncompleteHint
    && largestBucketCount >= Math.max(6, roundedScoreValues.length - 1)
    && largestBucketValue !== null
    && Math.abs(Number(largestBucketValue) - 5) <= 0.15
  );
  if (majorityMidFillArtifact) {
    return finalizeQualityResult({
      enabled: true,
      auditOnly: auditOnlyMode,
      pass: false,
      scorerAvailable: false,
      scorerParser,
      scorerError: {
        errorType: 'parse',
        message: 'Rejected repaired scorer payload with placeholder mid-score fill (likely artifact)',
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
    });
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
  const diagnostics = typeof parsed.diagnostics === 'string' ? parsed.diagnostics.trim() : null;
  if (parserIsHeuristic) {
    return finalizeQualityResult({
      enabled: true,
      auditOnly: true,
      pass: true,
      scorerAvailable: false,
      scorerParser,
      scorerParserTrust: 'heuristic_audit_only',
      scorerError: {
        errorType: 'heuristic_audit_only',
        message: 'Heuristic scorer parser output is audit-only and does not gate final acceptance.',
        responseSnippet: scoreResult.rawText ? String(scoreResult.rawText).slice(0, 2000) : null,
        responseHeaders: scoreResult.responseHeaders || null
      },
      scores,
      failedDimensions: quality.failedDimensions,
      overallScore: quality.overallScore,
      diagnostics,
      rescueDirectives,
      physicsChecklist,
      physicsChecklistFailures,
      confidence: clamp(Number(parsed.confidence) || 0, 0, 1),
      raw: parsed
    });
  }
  return finalizeQualityResult({
    enabled: true,
    auditOnly: auditOnlyMode,
    pass: quality.pass,
    scorerAvailable: true,
    scorerParser,
    scorerParserTrust: 'trusted',
    scores,
    failedDimensions: quality.failedDimensions,
    overallScore: quality.overallScore,
    diagnostics,
    rescueDirectives,
    physicsChecklist,
    physicsChecklistFailures,
    confidence: clamp(Number(parsed.confidence) || 0, 0, 1),
    raw: parsed
  });
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

  const scoringDisabled = !ENABLE_QUALITY_GATE && !ENABLE_QUALITY_AUDIT_WHEN_GATE_OFF;
  if (scoringDisabled || quality.scorerAvailable || SCORER_SELF_HEAL_RETRIES <= 0) {
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

function buildPrimaryRescuePromptingTypeBlock(rescueRound = 1) {
  if (rescueRound <= 1) {
    return {
      label: 'TYPE A: CONSTRAINT-LATTICE CAUSAL REBUILD',
      lines: [
        '- Prompting method: constraint-lattice directives with explicit invariant checks per identity, scene, pose, attire, and physics.',
        '- For each critical region, bind a causal chain: pose torque -> seam strain -> fold flow -> shadow placement -> specular trajectory.',
        '- Keep edge-forward sultry mood through framing and material response while preserving strict non-explicit compliance.',
        '- Reject generic fallback compositions; maintain prompt-title-specific set identity and hero props.',
        '- Increase micro-cue density in failure zones (face, hands, slit edge, stocking band, ankle, heel-floor contact).'
      ]
    };
  }

  return {
    label: 'TYPE B: COUNTERFACTUAL CINEMATIC REFRAME',
    lines: [
      '- Prompting method changes from Type A: use counterfactual rejection and cinematic reframing to break failed generation habits.',
      '- Counterfactual rule: if a phrase pattern causes drift/blocking, replace phrasing while preserving identity, scene, and wardrobe topology.',
      '- Reframe scene execution through camera grammar: lens-locked portrait hierarchy, controlled depth falloff, and coherent volumetric layering.',
      '- Reassert sultry edge through pose-light rhythm, contrast topology, and material optics, never through explicit framing language.',
      '- Enforce strict realism closure: no halos, no wax skin, no tiled fabrics, no floating contacts, and no non-causal fold/shadow artifacts.'
    ]
  };
}

function buildPrimaryRescuePrompt({ basePrompt, qualityEvaluation, rescueRound = 1, promptMeta = {} }) {
  recordPromptBuildStage(promptMeta, `primary-rescue-${rescueRound}`, 'rescue-input-base', basePrompt);
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
  if (getAdaptivePhysicsPriorityMultiplier() >= 3) {
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
      'Force complete wardrobe replacement with clear two-piece topology and no carryover from source casual clothing.',
      'Reapply prompt-specific outfit color/material/cut details; reject generic lace substitutions and all-black homogenization.'
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
  const collapsed = collapseRescueDirectivesSuperposition({
    variant: 'primary-rescue',
    rescueRound,
    failingKeys: Array.from(failingKeys),
    checklistFailureKeys,
    scorerDirectives: Array.isArray(qualityEvaluation?.rescueDirectives) ? qualityEvaluation.rescueDirectives : [],
    fallbackDirectives,
    targetedDirectives
  });
  const directives = collapsed.directives.length
    ? collapsed.directives
    : uniqueDirectiveLines([...fallbackDirectives, ...targetedDirectives]).slice(0, 12);
  const collapsedBranchIds = collapsed.selectedBranches.map(item => item.id);
  if (FIRST_PRINCIPLES_RECOMPILER_MODE) {
    const deficitFocus = [
      ...failingLabels,
      ...checklistFailureKeys.map(key => `physics checklist ${key}`)
    ];
    let rescuePrompt = buildFirstPrinciplesPrompt({
      sourcePrompt: basePrompt,
      variant: 'primary-rescue',
      promptMeta,
      mode: 'primary-rescue',
      retryOrdinal: rescueRound + 1,
      recoveryDeficits: deficitFocus,
      recoveryDirectives: directives.slice(0, FIRST_PRINCIPLES_DIRECTIVE_CAP)
    });
    if (collapsedBranchIds.length) {
      rescuePrompt = `${rescuePrompt.trim()}\n\nPRIMARY RESCUE SUPERPOSITION COLLAPSE:\n- Selected branches: ${collapsedBranchIds.join(', ')}.`;
    }
    rescuePrompt = `${rescuePrompt.trim()}\n\n${buildIdentityFinalOverrideBlock()}`;
    rescuePrompt = `${rescuePrompt.trim()}\n\n${buildIdentityDriftSentinelBlock('primary-rescue')}`;
    const primaryRescueResolutionBlock = buildResolutionUtilizationBlock('primary-rescue');
    if (primaryRescueResolutionBlock) {
      rescuePrompt = `${rescuePrompt.trim()}\n\n${primaryRescueResolutionBlock}`;
    }
    recordPromptBuildStage(promptMeta, `primary-rescue-${rescueRound}`, 'rescue-composed', rescuePrompt);

    rescuePrompt = applyImageSafetyComplianceFilter(rescuePrompt, 'primary');
    rescuePrompt = enforceFallbackPromptWindow(rescuePrompt, 'primary-rescue', promptMeta);
    recordPromptBuildStage(promptMeta, `primary-rescue-${rescueRound}`, 'rescue-windowed', rescuePrompt);

    const output = enforcePromptHardCap(rescuePrompt, 'primary-rescue', promptMeta);
    recordPromptBuildStage(promptMeta, `primary-rescue-${rescueRound}`, 'rescue-output', output);
    return output;
  }
  const promptingType = buildPrimaryRescuePromptingTypeBlock(rescueRound);
  const rescuePhysicsMatrix = [
    'RESCUE MICRO-PHYSICS REGION MATRIX (MANDATORY):',
    '- slit boundary: seam strain -> fold vector -> highlight trajectory -> cast-shadow continuity.',
    '- top-band compression: upper-thigh pressure gradient, denier transition, and sheen coherence.',
    '- knee contour: stretch-compression transition with no texture drift around patella.',
    '- ankle/instep: tendon line continuity, stocking strain, and plausible micro-bunching.',
    '- heel-floor pressure: visible load transfer, compression, and contact-shadow anchor.',
    '- hand-support compression: fingertip pressure cues and non-penetrating contact geometry.'
  ].join('\n');

  let rescuePrompt = [
    basePrompt.trim(),
    '',
    `PRIMARY QUALITY RESCUE PROTOCOL (ATTEMPT ${rescueRound + 1}, ${promptingType.label}):`,
    'Regenerate with materially stronger realism and style fidelity while staying non-explicit.',
    `Targeted deficiencies to correct: ${failingLabels.join(', ') || 'general quality consistency'}.`,
    'Apply this prompting type:',
    ...promptingType.lines.map(item => `- ${item}`),
    '',
    'Apply these rescue directives:',
    ...directives.map(item => `- ${item}`),
    ...(collapsedBranchIds.length
      ? ['', 'Primary rescue superposition collapse:', `- Selected branches: ${collapsedBranchIds.join(', ')}.`]
      : []),
    '',
    rescuePhysicsMatrix,
    '',
    'Hard rescue constraints:',
    '- Keep adult high-fashion editorial framing only; no nudity or explicit framing.',
    '- Preserve identity fidelity, lens-locked gaze, and physically coherent wardrobe behavior.',
    '- Preserve two-piece topology with true thigh-high stocking geometry and coherent top-band placement.',
    '- Keep the result edgy and sultry through cinematography, posture, and material realism while remaining non-explicit.',
    '- Deliver a visibly different render from attempt 1 using improved pose-light-material coherence.'
  ].join('\n');
  const primaryRescueResolutionBlock = buildResolutionUtilizationBlock('primary-rescue');
  if (primaryRescueResolutionBlock) {
    rescuePrompt = `${rescuePrompt.trim()}\n\n${primaryRescueResolutionBlock}`;
  }
  recordPromptBuildStage(promptMeta, `primary-rescue-${rescueRound}`, 'rescue-composed', rescuePrompt);

  rescuePrompt = applyImageSafetyComplianceFilter(rescuePrompt, 'primary');
  rescuePrompt = enforceFallbackPromptWindow(rescuePrompt, 'primary-rescue', promptMeta);
  recordPromptBuildStage(promptMeta, `primary-rescue-${rescueRound}`, 'rescue-windowed', rescuePrompt);

  const output = enforcePromptHardCap(rescuePrompt, 'primary-rescue', promptMeta);
  recordPromptBuildStage(promptMeta, `primary-rescue-${rescueRound}`, 'rescue-output', output);
  return output;
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
  if (getAdaptivePhysicsPriorityMultiplier() >= 3) {
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

function computePromptRequestTelemetry(attempts = []) {
  let maxConsecutive429 = 0;
  let totalHttp429 = 0;
  let totalRetriesUsed = 0;
  let finalFailureReason = null;
  for (const attempt of attempts) {
    const metrics = attempt?.requestMetrics || null;
    if (metrics) {
      maxConsecutive429 = Math.max(maxConsecutive429, Number(metrics.maxConsecutive429) || 0);
      totalHttp429 += Number(metrics.http429Count) || 0;
      totalRetriesUsed += Number(metrics.retriesUsed) || 0;
      if (!attempt?.success && metrics.finalFailureReason) {
        finalFailureReason = metrics.finalFailureReason;
      }
    }
    if (!attempt?.success && attempt?.errorType) {
      if (String(attempt.errorType).toLowerCase() === 'http' && Number(attempt?.status) === 429) {
        finalFailureReason = 'http_429';
      } else {
        finalFailureReason = attempt.errorType;
      }
    }
  }
  return {
    maxConsecutive429,
    totalHttp429,
    totalRetriesUsed,
    finalFailureReason
  };
}

function upsertPromptRecord(summary, promptRecord) {
  if (!summary || !promptRecord) return;
  if (!Array.isArray(summary.prompts)) {
    summary.prompts = [];
  }
  const promptId = String(promptRecord.id || '').trim();
  summary.prompts = summary.prompts.filter(item => String(item?.id || '').trim() !== promptId);
  summary.prompts.push(promptRecord);
  summary.prompts.sort((a, b) => Number.parseInt(a.id, 10) - Number.parseInt(b.id, 10));
}

function recalculateSummaryTotals(summary) {
  if (!summary) return;
  if (!summary.totals || typeof summary.totals !== 'object') {
    summary.totals = {};
  }
  const prompts = Array.isArray(summary.prompts) ? summary.prompts : [];
  const totals = {
    prompts: Number(summary.runState?.promptsExpected) || prompts.length,
    primarySuccess: 0,
    safeSuccess: 0,
    failed: 0,
    qualityEvaluated: 0,
    qualityPass: 0,
    qualityFail: 0,
    qualityScorerUnavailable: 0,
    primaryRescueTriggered: 0,
    primaryRescueSuccess: 0,
    primaryRescueChosen: 0,
    rateLimitPressureFailures: 0
  };

  for (const prompt of prompts) {
    if (prompt?.finalStatus === 'success') {
      if (prompt?.chosenVariant === 'primary') {
        totals.primarySuccess += 1;
      } else if (prompt?.chosenVariant === 'safe') {
        totals.safeSuccess += 1;
      }
    } else {
      totals.failed += 1;
    }

    const attempts = Array.isArray(prompt?.attempts) ? prompt.attempts : [];
    const rescueAttempts = attempts.filter(item => String(item?.variant || '').startsWith('primary-rescue'));
    if (rescueAttempts.length) {
      totals.primaryRescueTriggered += 1;
      totals.primaryRescueSuccess += rescueAttempts.filter(item => item?.success).length;
      if (
        prompt?.chosenVariant === 'primary'
        && prompt?.outputFile
        && rescueAttempts.some(item => item?.success && item?.outputFile === prompt.outputFile)
      ) {
        totals.primaryRescueChosen += 1;
      }
    }

    for (const attempt of attempts) {
      const quality = attempt?.quality;
      if (!quality?.enabled) continue;
      totals.qualityEvaluated += 1;
      if (!quality?.scorerAvailable) {
        totals.qualityScorerUnavailable += 1;
        continue;
      }
      if (quality?.pass) {
        totals.qualityPass += 1;
      } else {
        totals.qualityFail += 1;
      }
    }

    if (isPromptRateLimitPressure(prompt)) {
      totals.rateLimitPressureFailures += 1;
    }
  }
  summary.totals = totals;
}

function updateAdaptiveMetrics(summary) {
  if (!summary) return;
  ensureSummaryMetrics(summary, summary?.metrics?.physicsDensityRatio?.baselineScore || 0);
  recalculateSummaryTotals(summary);

  const prompts = Array.isArray(summary.prompts) ? summary.prompts : [];
  const expected = Math.max(1, Number(summary.runState?.promptsExpected) || prompts.length || 1);
  const completed = prompts.length;
  summary.metrics.completionRate = Number((completed / expected).toFixed(4));
  summary.metrics.rateLimitPressureRate = Number(
    ((Number(summary.totals?.rateLimitPressureFailures) || 0) / Math.max(1, completed)).toFixed(4)
  );
  summary.metrics.qualityPassRate = Number(
    ((Number(summary.totals?.qualityPass) || 0) / Math.max(1, Number(summary.totals?.qualityEvaluated) || 0)).toFixed(4)
  );

  let attemptDurationTotalMs = 0;
  let attemptDurationCount = 0;
  let bannedViolations = 0;
  const densityRatios = [];
  for (const prompt of prompts) {
    const attempts = Array.isArray(prompt?.attempts) ? prompt.attempts : [];
    for (const attempt of attempts) {
      const elapsed = Number(attempt?.requestMetrics?.elapsedMs);
      if (Number.isFinite(elapsed) && elapsed >= 0) {
        attemptDurationTotalMs += elapsed;
        attemptDurationCount += 1;
      }
    }
    const preflight = prompt?.preflightDiagnostics || {};
    const primaryDiag = preflight?.primary || {};
    const safeDiag = preflight?.safe || {};
    if (Number.isFinite(Number(primaryDiag?.ratio))) {
      densityRatios.push(Number(primaryDiag.ratio));
    }
    if (Number.isFinite(Number(safeDiag?.ratio))) {
      densityRatios.push(Number(safeDiag.ratio));
    }
    bannedViolations += Number(primaryDiag?.bannedTermCount || 0);
    bannedViolations += Number(safeDiag?.bannedTermCount || 0);
  }
  summary.metrics.avgAttemptDurationMs = Number(
    (attemptDurationTotalMs / Math.max(1, attemptDurationCount)).toFixed(2)
  );
  summary.metrics.bannedTermViolations = bannedViolations;

  const density = summary.metrics.physicsDensityRatio || {};
  density.targetRatio = PHYSICS_DENSITY_MIN_RATIO;
  density.count = densityRatios.length;
  density.min = densityRatios.length ? Number(Math.min(...densityRatios).toFixed(4)) : null;
  density.max = densityRatios.length ? Number(Math.max(...densityRatios).toFixed(4)) : null;
  density.avg = densityRatios.length
    ? Number((densityRatios.reduce((sum, value) => sum + value, 0) / densityRatios.length).toFixed(4))
    : null;
  density.belowTargetCount = densityRatios.filter(value => value < PHYSICS_DENSITY_MIN_RATIO).length;
  summary.metrics.physicsDensityRatio = density;
}

function applyAdaptiveStrategyCheckpoint(summary, { trigger = 'checkpoint', context = '' } = {}) {
  if (!summary) return { hardStop: false, reason: null };
  updateAdaptiveMetrics(summary);

  const densityMin = Number(summary?.metrics?.physicsDensityRatio?.min);
  if (Number.isFinite(densityMin) && densityMin < PHYSICS_DENSITY_MIN_RATIO) {
    runtimePromptReinforcementPasses = Math.min(18, runtimePromptReinforcementPasses + 1);
    runtimeMicrodetailModuleCap = Math.min(10, runtimeMicrodetailModuleCap + 1);
    pushAdaptationHistory(summary, {
      trigger,
      change: `density reinforcement depth -> ${runtimePromptReinforcementPasses}, module cap -> ${runtimeMicrodetailModuleCap}`,
      result: `densityMin=${densityMin.toFixed(3)} below target=${PHYSICS_DENSITY_MIN_RATIO}${context ? ` (${context})` : ''}`
    });
  }

  if ((Number(summary?.metrics?.bannedTermViolations) || 0) > 0) {
    pushAdaptationHistory(summary, {
      trigger,
      change: 'hard-stop due to banned broad-term violation',
      result: `bannedTermViolations=${summary.metrics.bannedTermViolations}${context ? ` (${context})` : ''}`
    });
    return {
      hardStop: true,
      reason: `Banned broad-term violations detected (${summary.metrics.bannedTermViolations}).`
    };
  }

  const recentPrompts = (summary.prompts || []).slice(-4);
  const realismPhysicsFailures = recentPrompts.filter(prompt => {
    const failed = (prompt?.qualityFinal?.failedDimensions || []).map(item => item?.key);
    return failed.includes('realism') || failed.includes('physics');
  });
  if (realismPhysicsFailures.length >= 2) {
    runtimePhysicsPriorityMultiplier = Math.min(8, runtimePhysicsPriorityMultiplier + 0.5);
    runtimeRescueDirectiveCap = Math.min(24, runtimeRescueDirectiveCap + 2);
    pushAdaptationHistory(summary, {
      trigger,
      change: `physics multiplier -> ${runtimePhysicsPriorityMultiplier.toFixed(1)}, rescue directive cap -> ${runtimeRescueDirectiveCap}`,
      result: `clustered realism/physics failures in last ${recentPrompts.length} prompts${context ? ` (${context})` : ''}`
    });
  }

  return { hardStop: false, reason: null };
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

function isNearPassAcceptable(quality, variant = 'primary') {
  if (!QUALITY_NEAR_PASS_ENABLE || !quality?.scorerAvailable) {
    return false;
  }
  const failedKeys = (quality?.failedDimensions || [])
    .map(item => item?.key)
    .filter(Boolean);
  if (!failedKeys.length || failedKeys.length > QUALITY_NEAR_PASS_MAX_FAILED_DIMS) {
    return false;
  }
  if (!failedKeys.every(key => QUALITY_NEAR_PASS_ALLOWED_KEYS.has(key))) {
    return false;
  }
  const scores = quality?.scores || {};
  const identity = clamp(Number(scores.identity) || 0, 0, 10);
  const gaze = clamp(Number(scores.gaze) || 0, 0, 10);
  const attire = clamp(Number(scores.attireReplacement) || 0, 0, 10);
  const realism = clamp(Number(scores.realism) || 0, 0, 10);
  const physics = clamp(Number(scores.physics) || 0, 0, 10);
  const scene = clamp(Number(scores.sceneAdherence) || 0, 0, 10);
  const pose = clamp(Number(scores.poseAdherence) || 0, 0, 10);
  const overall = clamp(Number(quality?.overallScore) || 0, 0, 10);

  const safeLike = resolveVariantFamily(variant) === 'safe';
  const sceneFloor = QUALITY_THRESHOLD_SCENE_ADHERENCE - (safeLike ? 0.2 : 0.1);
  const poseFloor = QUALITY_THRESHOLD_POSE_ADHERENCE - (safeLike ? 0.2 : 0.1);
  const realismFloor = QUALITY_THRESHOLD_REALISM - 0.15;
  const physicsFloor = QUALITY_THRESHOLD_PHYSICS - 0.15;

  return (
    overall >= QUALITY_NEAR_PASS_MIN_OVERALL
    && identity >= QUALITY_THRESHOLD_IDENTITY
    && gaze >= QUALITY_THRESHOLD_GAZE
    && attire >= QUALITY_THRESHOLD_ATTIRE_REPLACEMENT
    && realism >= realismFloor
    && physics >= physicsFloor
    && scene >= sceneFloor
    && pose >= poseFloor
  );
}

function isQualityAcceptableForFinal(quality, variant = 'primary') {
  if (!ENABLE_QUALITY_GATE) {
    return true;
  }
  if (!quality?.enabled) {
    return true;
  }
  if (quality?.auditOnly) {
    return true;
  }
  if (!quality.scorerAvailable) {
    const parseFailure = quality?.scorerError?.errorType === 'parse';
    const identityFallbackAudit = quality?.identityFallbackAudit;
    if (parseFailure && IDENTITY_FALLBACK_AUDIT_ENABLED) {
      if (
        identityFallbackAudit?.enabled
        && identityFallbackAudit?.available
        && typeof identityFallbackAudit?.pass === 'boolean'
      ) {
        return identityFallbackAudit.pass;
      }
      return false;
    }
    return SCORER_UNAVAILABLE_POLICY === 'soft_accept';
  }
  if (variant === 'primary' && isEdgeFirstAcceptable(quality)) {
    return true;
  }
  if (isNearPassAcceptable(quality, variant)) {
    return true;
  }
  return Boolean(quality.pass);
}

async function executeSafeFallbackSequence({
  indexLabel,
  prompt,
  promptSlug,
  runDir,
  runNonce,
  buildStages = null,
  safePromptText,
  safePromptSourceText,
  safePromptHash,
  safeIntentDigest,
  referenceInlineData,
  promptRecord,
  summary
}) {
  let attemptIndex = 1;
  let attemptVariant = 'safe';
  let attemptPromptText = safePromptText;
  let attemptPromptHash = safePromptHash;
  let retriesLeft = SAFE_IMAGE_SAFETY_RETRY_ENABLED ? SAFE_IMAGE_SAFETY_RETRY_MAX_ATTEMPTS : 0;
  let qualityRescuesLeft = SAFE_QUALITY_RESCUE_MAX_ATTEMPTS;

  while (true) {
    const safeResult = await callImageModel({
      promptText: attemptPromptText,
      referenceInlineData,
      label: `Prompt ${prompt.id} ${attemptVariant}`
    });

    if (safeResult.ok) {
      const safeSaved = await saveImagePart(
        safeResult.imagePart,
        path.join(runDir, `${promptSlug}-safe-a${attemptIndex}`)
      );
      const safeQuality = await evaluateImageQualityWithSelfHealing({
        promptId: prompt.id,
        title: prompt.title,
        variant: 'safe',
        promptIntentDigest: safeIntentDigest,
        referenceInlineData,
        imagePart: safeResult.imagePart,
        logLabel: `${indexLabel}: ${attemptVariant} quality`
      });
      recordQualityTotals(summary, safeQuality);

      promptRecord.attempts.push({
        variant: attemptVariant,
        attemptIndex,
        success: true,
        promptHash: attemptPromptHash,
        outputFile: safeSaved.outputPath,
        mimeType: safeSaved.mimeType,
        bytes: safeSaved.bytes,
        responseHeaders: safeResult.responseHeaders || null,
        requestMetrics: safeResult.requestMetrics || null,
        quality: safeQuality
      });

      if (isQualityAcceptableForFinal(safeQuality, 'safe')) {
        return {
          status: 'accepted',
          outputFile: safeSaved.outputPath,
          quality: safeQuality
        };
      }

      if (qualityRescuesLeft > 0) {
        const adaptiveCooldownS = getAdaptiveCooldownRemainingMs() / 1000;
        if (adaptiveCooldownS >= RATE_LIMIT_RESCUE_ABORT_COOLDOWN_S) {
          log(
            `${indexLabel}: skipping additional safe quality rescues due to rate-limit pressure`
            + ` (cooldown=${Math.ceil(adaptiveCooldownS)}s, threshold=${RATE_LIMIT_RESCUE_ABORT_COOLDOWN_S}s)`
          );
          qualityRescuesLeft = 0;
        }
      }

      if (qualityRescuesLeft > 0) {
        qualityRescuesLeft -= 1;
        attemptIndex += 1;
        const rescueRound = SAFE_QUALITY_RESCUE_MAX_ATTEMPTS - qualityRescuesLeft;
        attemptVariant = `safe-quality-rescue-${rescueRound}`;
        const rescueBasePrompt = buildSafeQualityRescuePrompt({
          basePrompt: safePromptSourceText || safePromptText,
          qualityEvaluation: safeQuality,
          rescueRound,
          promptMeta: {
            promptId: prompt.id,
            title: prompt.title,
            buildStages
          }
        });
        attemptPromptText = applyPromptNonce(rescueBasePrompt, {
          runNonce,
          promptId: prompt.id,
          variant: attemptVariant,
          attemptIndex
        });
        attemptPromptHash = shortHash(attemptPromptText, 24);
        const failedKeys = (safeQuality?.failedDimensions || [])
          .map(item => item?.key)
          .filter(Boolean)
          .join(',');
        log(
          `${indexLabel}: safe quality rescue triggered`
          + ` (${attemptVariant}, failed=${failedKeys || 'unknown'}, promptHash=${attemptPromptHash})`
        );
        continue;
      }

      return {
        status: 'quality_rejected'
      };
    }

    promptRecord.attempts.push({
      variant: attemptVariant,
      attemptIndex,
      success: false,
      promptHash: attemptPromptHash,
      errorType: safeResult.errorType,
      status: safeResult.status || null,
      statusText: safeResult.statusText || null,
      blockReason: safeResult.blockReason || null,
      message: safeResult.message || null,
      responseSnippet: safeResult.responseSnippet || null,
      responseHeaders: safeResult.responseHeaders || null,
      requestMetrics: safeResult.requestMetrics || null
    });

    if (shouldAbortRescueDueToRateLimitPressure(safeResult.errorType, safeResult.status)) {
      const cooldownS = Math.ceil(getAdaptiveCooldownRemainingMs() / 1000);
      log(
        `${indexLabel}: aborting safe retry ladder due to sustained 429 pressure`
        + ` (cooldown=${cooldownS}s, threshold=${RATE_LIMIT_RESCUE_ABORT_COOLDOWN_S}s)`
      );
      return {
        status: 'failed',
        errorType: 'rate_limit_pressure'
      };
    }

    const retryOnNoImage = safeResult.errorType === 'no_image';
    const retryEligible = isImageSafetyBlockReason(safeResult.blockReason) || retryOnNoImage;
    if (retriesLeft <= 0 || !retryEligible) {
      return {
        status: 'failed',
        errorType: safeResult.errorType || 'unknown'
      };
    }

    retriesLeft -= 1;
    attemptIndex += 1;
    attemptVariant = `safe-retry-${SAFE_IMAGE_SAFETY_RETRY_MAX_ATTEMPTS - retriesLeft}`;

    const retryOrdinal = SAFE_IMAGE_SAFETY_RETRY_MAX_ATTEMPTS - retriesLeft;
    const retryPromptBase = buildSafeImageSafetyRetryPrompt(
      safePromptSourceText || safePromptText,
      {
        promptId: prompt.id,
        title: prompt.title,
        buildStages
      },
      retryOrdinal
    );
    attemptPromptText = applyPromptNonce(retryPromptBase, {
      runNonce,
      promptId: prompt.id,
      variant: attemptVariant,
      attemptIndex
    });
    attemptPromptHash = shortHash(attemptPromptText, 24);

    if (retryOnNoImage) {
      log(
        `${indexLabel}: safe returned no image payload, retrying with policy-safe rewrite`
        + ` (${attemptVariant}, promptHash=${attemptPromptHash})`
      );
    } else {
      log(
        `${indexLabel}: safe blocked by IMAGE_SAFETY, retrying with policy-safe rewrite`
        + ` (${attemptVariant}, promptHash=${attemptPromptHash})`
      );
    }
  }
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
    { key: 'mandatory', regex: /^mandatory(?:\s+locks?)?\s*:/i },
    {
      key: 'scene',
      regex: /^(?:scene(?:\s+(?:intent|anchors?|preservation|lock|requirements?|invariants?))?|scene\s+anchors?\s+(?:to\s+preserve|must\s+remain\s+visible)|setting(?:\s+lock)?)\s*(?:\([^)]*\))?\s*:/i
    },
    {
      key: 'wardrobePose',
      regex: /^(?:wardrobe\s*\+\s*pose(?:\s+(?:invariants?|preservation|anchors?))?|pose\s*\+\s*wardrobe(?:\s+(?:invariants?|preservation|anchors?))?)\s*(?:\([^)]*\))?\s*:/i
    },
    {
      key: 'wardrobe',
      regex: /^(?:wardrobe(?:\s+(?:lock|preservation|topology|requirements?|invariants?|anchors?(?:\s+to\s+preserve|(?:\s+must\s+remain\s+visible)?)))?|attire(?:\s+lock)?)\s*(?:\([^)]*\))?\s*:/i
    },
    {
      key: 'pose',
      regex: /^(?:pose(?:\s+(?:blueprint|and\s+framing|preservation|choreography|requirements?|invariants?|anchors?(?:\s+to\s+preserve|(?:\s+must\s+remain\s+visible)?)))?|pose\s+\+\s+kinematic\s+preservation|kinematic\s+path(?:\s*\([^)]*\))?)\s*:/i
    },
    {
      key: 'physics',
      regex: /^(?:safe\s+physics\s+checks?|physics\s+checklist|critical\s+zone\s+checklist|micro-physics(?:\s+realism\s+checks)?|physics(?:\s+and\s+micro(?:detail|[-\s]detail))?\s+checks?|first-principles physics checklist)\s*:/i
    },
    {
      key: 'lightTransport',
      regex: /^(?:light-transport checks|lighting physics checks|shadow coherence checks)\s*:/i
    },
    {
      key: 'failureHotspots',
      regex: /^failure hotspots(?:\s+to\s+avoid)?\s*:/i
    },
    { key: 'reject', regex: /^(?:hard\s+reject|reject)\s*:/i }
  ];
  const ignorePatterns = [
    /^mission\s*:/i,
    /^goal order(?:\s+\(.*\))?\s*:/i,
    /^non-explicit(?:\s+limits?)?(?:\s+\(.*\))?\s*:/i,
    /^performance patch/i,
    /^safe performance patch/i,
    /^devils-advocate/i,
    /^adult subject only/i,
    /^no nudity/i,
    /^identity(?:\s+lock|\s+and\s+gaze)?\s*:/i,
    /^camera\s*:/i,
    /^run uniqueness token/i,
    /^token=/i,
    /^---$/
  ];
  const headingResetPattern = /^[A-Za-z][A-Za-z0-9+&/\-()\s]{2,80}:\s*$/;

  let activeSection = '';
  const buckets = {
    mandatory: [],
    wardrobePose: [],
    wardrobe: [],
    scene: [],
    pose: [],
    reject: [],
    physics: [],
    lightTransport: [],
    failureHotspots: []
  };

  const pushLine = (key, line) => {
    if (!key || !line || !buckets[key]) {
      return;
    }
    if (buckets[key].length < 24) {
      buckets[key].push(line);
    }
  };

  for (const rawLine of rawLines) {
    const line = rawLine.replace(/\s+/g, ' ').trim();
    if (!line) {
      continue;
    }

    const withoutBullet = line.startsWith('- ') ? line.slice(2).trim() : line;
    if (!withoutBullet || ignorePatterns.some(pattern => pattern.test(withoutBullet))) {
      continue;
    }

    const sectionMatch = sectionRules.find(rule => rule.regex.test(withoutBullet));
    if (sectionMatch) {
      activeSection = sectionMatch.key;
      pushLine(activeSection, withoutBullet);
      continue;
    }

    if (/^#+\s+/.test(line) || headingResetPattern.test(withoutBullet)) {
      activeSection = '';
      continue;
    }

    if (line.startsWith('- ')) {
      if (activeSection) {
        pushLine(activeSection, `- ${withoutBullet}`);
      }
      continue;
    }

    if (activeSection) {
      pushLine(activeSection, `- ${withoutBullet}`);
    }
  }

  if (buckets.wardrobePose.length) {
    if (!buckets.wardrobe.length) {
      buckets.wardrobe.push(...buckets.wardrobePose.slice(0, 6));
    }
    if (!buckets.pose.length) {
      buckets.pose.push(...buckets.wardrobePose.slice(0, 6));
    }
  }

  const anchors = collectPromptAnchorBullets(promptText);
  if (!buckets.scene.length && anchors.scene.length) {
    buckets.scene.push(...anchors.scene.map(item => `- ${item}`));
  }
  if (!buckets.wardrobe.length && anchors.wardrobe.length) {
    buckets.wardrobe.push(...anchors.wardrobe.map(item => `- ${item}`));
  }
  if (!buckets.pose.length && anchors.pose.length) {
    buckets.pose.push(...anchors.pose.map(item => `- ${item}`));
  }

  const ordered = [
    ...buckets.mandatory.slice(0, 4),
    ...buckets.wardrobePose.slice(0, 4),
    ...buckets.wardrobe.slice(0, 8),
    ...buckets.scene.slice(0, 8),
    ...buckets.pose.slice(0, 8),
    ...buckets.reject.slice(0, 5),
    ...buckets.physics.slice(0, 4),
    ...buckets.lightTransport.slice(0, 3),
    ...buckets.failureHotspots.slice(0, 3)
  ];

  const deduped = [];
  const seen = new Set();
  for (const line of ordered) {
    const key = line.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(line);
    }
  }

  if (!deduped.length) {
    return '';
  }

  const digestLines = [];
  let chars = 0;
  for (const line of deduped) {
    const nextChars = chars + line.length + (digestLines.length ? 1 : 0);
    if (nextChars > maxChars && digestLines.length > 0) {
      break;
    }
    digestLines.push(line);
    chars = nextChars;
  }

  if (!digestLines.length) {
    return deduped[0].slice(0, maxChars);
  }

  return digestLines.join('\n');
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
  const requestMetrics = {
    requestAttempts: 0,
    retriesUsed: 0,
    http429Count: 0,
    maxConsecutive429: 0,
    finalFailureReason: null
  };
  const requestStartedAtMs = Date.now();
  const finalizeRequestMetrics = (finalReason = null) => {
    if (finalReason) {
      requestMetrics.finalFailureReason = finalReason;
    }
    requestMetrics.elapsedMs = Math.max(0, Date.now() - requestStartedAtMs);
    return requestMetrics;
  };

  // Enforce minimum pacing per attempt before any short-circuit logic.
  await waitBeforeAttempt(WAIT_BEFORE_ATTEMPT_S, label);

  const failFastPressureActive = RATE_LIMIT_FAIL_FAST_MODE
    && RATE_LIMIT_ADAPTIVE_COOLDOWN
    && (getAdaptiveCooldownRemainingMs() / 1000) >= RATE_LIMIT_FAIL_FAST_COOLDOWN_S;
  if (failFastPressureActive) {
    const cooldownS = Math.ceil(getAdaptiveCooldownRemainingMs() / 1000);
    requestMetrics.finalFailureReason = 'rate_limit_pressure_preflight';
    log(
      `${label}: fail-fast skipping request due to sustained 429 pressure`
      + ` (cooldown=${cooldownS}s, threshold=${RATE_LIMIT_FAIL_FAST_COOLDOWN_S}s)`
    );
    return {
      ok: false,
      errorType: 'rate_limit_pressure',
      status: 429,
      statusText: 'Too Many Requests',
      message: `Fail-fast preflight: adaptive cooldown ${cooldownS}s >= ${RATE_LIMIT_FAIL_FAST_COOLDOWN_S}s`,
      requestMetrics: finalizeRequestMetrics()
    };
  }

  const accessToken = await getAccessToken();
  if (!accessToken) {
    requestMetrics.finalFailureReason = 'auth_error';
    return {
      ok: false,
      errorType: 'auth',
      message: 'Failed to obtain Google access token',
      requestMetrics: finalizeRequestMetrics()
    };
  }

  const maxHttpAttempts = IMAGE_HTTP_RETRIES + 1;
  let consecutive429 = 0;
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
    requestMetrics.requestAttempts = requestAttempt;
    const controller = new AbortController();
    const attemptTimeoutMs = computeRequestTimeoutMs(requestAttempt);
    const timeout = setTimeout(() => controller.abort(), attemptTimeoutMs);
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
      const isTimeoutAbort = (error instanceof Error && error.name === 'AbortError')
        || /aborted/i.test(message);
      if (requestAttempt < maxHttpAttempts) {
        const retryDelayMs = computeImageRetryDelayMs({ attempt: requestAttempt });
        requestMetrics.retriesUsed += 1;
        consecutive429 = 0;
        log(
          `${label}: ${isTimeoutAbort ? 'timeout' : 'network error'} on request attempt ${requestAttempt}/${maxHttpAttempts}`
          + ` (timeout=${attemptTimeoutMs}ms, ${message}); retrying in ${Math.ceil(retryDelayMs / 1000)}s`
        );
        await wait(retryDelayMs);
        continue;
      }
      requestMetrics.finalFailureReason = isTimeoutAbort ? 'timeout' : 'network_error';
      return {
        ok: false,
        errorType: isTimeoutAbort ? 'timeout' : 'network',
        message,
        requestMetrics: finalizeRequestMetrics()
      };
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      const retryAfterHeader = response.headers.get('retry-after');
      const shouldRetry = requestAttempt < maxHttpAttempts && IMAGE_HTTP_RETRYABLE_STATUSES.has(response.status);
      if (response.status === 429) {
        requestMetrics.http429Count += 1;
        consecutive429 += 1;
        requestMetrics.maxConsecutive429 = Math.max(requestMetrics.maxConsecutive429, consecutive429);
      } else {
        consecutive429 = 0;
      }
      armAdaptiveRateLimitCooldown({
        label,
        status: response.status,
        retryAfterHeader
      });
      const adaptiveRemainingS = Math.ceil(getAdaptiveCooldownRemainingMs() / 1000);
      const failFastMidRetry = RATE_LIMIT_FAIL_FAST_MODE
        && response.status === 429
        && consecutive429 >= RATE_LIMIT_FAIL_FAST_MIN_CONSECUTIVE_429
        && adaptiveRemainingS >= RATE_LIMIT_FAIL_FAST_COOLDOWN_S;
      if (failFastMidRetry) {
        requestMetrics.finalFailureReason = 'rate_limit_pressure_retry';
        log(
          `${label}: fail-fast triggered after ${consecutive429} consecutive 429s`
          + ` (adaptiveRemaining=${adaptiveRemainingS}s, threshold=${RATE_LIMIT_FAIL_FAST_COOLDOWN_S}s)`
        );
        return {
          ok: false,
          errorType: 'rate_limit_pressure',
          status: response.status,
          statusText: response.statusText,
          blockReason: extractBlockReason(body),
          responseSnippet: responseText.slice(0, 4000),
          responseHeaders,
          message: `Fail-fast mid-retry: ${consecutive429} consecutive 429 responses`,
          requestMetrics: finalizeRequestMetrics()
        };
      }
      if (shouldRetry) {
        let retryDelayMs = computeImageRetryDelayMs({
          attempt: requestAttempt,
          retryAfterHeader
        });
        if (response.status === 429) {
          const adaptiveRemainingMs = getAdaptiveCooldownRemainingMs();
          const retryFloorMs = Math.round(RATE_LIMIT_RETRY_FLOOR_S * 1000);
          const retryCapMs = Math.round(RATE_LIMIT_RETRY_MAX_S * 1000);
          const adaptiveClampedMs = Math.min(retryCapMs, adaptiveRemainingMs);
          retryDelayMs = Math.max(retryDelayMs, retryFloorMs, adaptiveClampedMs);
        }
        log(
          `${label}: HTTP ${response.status} on request attempt ${requestAttempt}/${maxHttpAttempts}; retrying in ${Math.ceil(retryDelayMs / 1000)}s`
          + (response.status === 429
            ? ` (floor=${RATE_LIMIT_RETRY_FLOOR_S}s, adaptiveRemaining=${Math.ceil(getAdaptiveCooldownRemainingMs() / 1000)}s)`
            : '')
        );
        requestMetrics.retriesUsed += 1;
        await wait(retryDelayMs);
        continue;
      }
      if (
        RATE_LIMIT_FAIL_FAST_MODE
        && response.status === 429
        && adaptiveRemainingS >= RATE_LIMIT_FAIL_FAST_COOLDOWN_S
      ) {
        requestMetrics.finalFailureReason = 'rate_limit_pressure_terminal';
        return {
          ok: false,
          errorType: 'rate_limit_pressure',
          status: response.status,
          statusText: response.statusText,
          blockReason: extractBlockReason(body),
          responseSnippet: responseText.slice(0, 4000),
          responseHeaders,
          message: `Fail-fast terminal: adaptive cooldown ${adaptiveRemainingS}s >= ${RATE_LIMIT_FAIL_FAST_COOLDOWN_S}s`,
          requestMetrics: finalizeRequestMetrics()
        };
      }
      requestMetrics.finalFailureReason = `http_${response.status}`;
      return {
        ok: false,
        errorType: 'http',
        status: response.status,
        statusText: response.statusText,
        blockReason: extractBlockReason(body),
        responseSnippet: responseText.slice(0, 4000),
        responseHeaders,
        requestMetrics: finalizeRequestMetrics()
      };
    }

    const imagePart = findImagePart(body);
    if (!imagePart?.inlineData?.data) {
      decayAdaptiveRateLimitCooldown();
      requestMetrics.finalFailureReason = 'no_image';
      return {
        ok: false,
        errorType: 'no_image',
        blockReason: extractBlockReason(body),
        responseSnippet: responseText.slice(0, 4000),
        responseHeaders,
        requestMetrics: finalizeRequestMetrics()
      };
    }

    decayAdaptiveRateLimitCooldown();
    requestMetrics.finalFailureReason = 'success';
    return {
      ok: true,
      imagePart,
      responseHeaders,
      requestMetrics: finalizeRequestMetrics()
    };
  }

  requestMetrics.finalFailureReason = 'retry_exhausted';
  return {
    ok: false,
    errorType: 'retry_exhausted',
    message: 'Image request exhausted retry budget',
    requestMetrics: finalizeRequestMetrics()
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

let activeRunContext = null;
let shutdownInProgress = false;

async function persistActiveRunState(status, extra = {}) {
  if (!activeRunContext?.summary || !activeRunContext?.summaryPath) {
    return;
  }

  const summary = activeRunContext.summary;
  const runState = summary.runState || {};
  const terminalStatuses = new Set(['completed', 'failed', 'aborted']);
  if (terminalStatuses.has(runState.status)) {
    return;
  }

  const nowIso = new Date().toISOString();
  summary.runState = {
    ...runState,
    ...extra,
    pid: process.pid,
    status,
    updatedAt: nowIso
  };
  if (status === 'completed') {
    summary.runState.completedAt = nowIso;
  } else if (status === 'failed') {
    summary.runState.failedAt = nowIso;
  } else if (status === 'aborted') {
    summary.runState.abortedAt = nowIso;
  }

  await writeJson(activeRunContext.summaryPath, summary);
}

function installSignalHandlers() {
  const handleSignal = async (signalName, exitCode) => {
    if (shutdownInProgress) {
      return;
    }
    shutdownInProgress = true;
    try {
      await persistActiveRunState('aborted', { abortSignal: signalName });
    } catch {
      // Best-effort run-state persistence on termination.
    }
    process.exit(exitCode);
  };

  process.on('SIGINT', () => {
    void handleSignal('SIGINT', 130);
  });
  process.on('SIGTERM', () => {
    void handleSignal('SIGTERM', 143);
  });
}

installSignalHandlers();

function isPidAlive(pid) {
  const numericPid = Number(pid);
  if (!Number.isInteger(numericPid) || numericPid <= 0) {
    return false;
  }
  try {
    process.kill(numericPid, 0);
    return true;
  } catch {
    return false;
  }
}

async function reconcileStaleRunStates() {
  if (!STALE_RUN_RECONCILE_ENABLED) {
    return;
  }
  const staleThresholdMs = STALE_RUN_MINUTES * 60 * 1000;
  let entries = [];
  try {
    entries = await fs.readdir(OUTPUT_BASE, { withFileTypes: true });
  } catch {
    return;
  }
  const now = Date.now();
  for (const entry of entries) {
    if (!entry.isDirectory() || !entry.name.startsWith('speakeasy-safe-fallback-')) {
      continue;
    }
    const summaryPath = path.join(OUTPUT_BASE, entry.name, 'summary.json');
    let summary;
    try {
      summary = JSON.parse(await fs.readFile(summaryPath, 'utf8'));
    } catch {
      continue;
    }
    const runState = summary?.runState || {};
    if (runState.status !== 'running' && runState.status !== 'resuming') {
      continue;
    }
    const trackedPid = runState.pid || summary?.runInfo?.pid;
    if (trackedPid && isPidAlive(trackedPid)) {
      continue;
    }
    const updatedAtMs = Date.parse(runState.updatedAt || runState.startedAt || summary?.runInfo?.createdAt || '');
    const ageMs = Number.isFinite(updatedAtMs) ? (now - updatedAtMs) : Number.MAX_SAFE_INTEGER;
    if (ageMs < staleThresholdMs) {
      continue;
    }
    summary.runState = {
      ...runState,
      status: 'aborted',
      updatedAt: new Date().toISOString(),
      abortedAt: new Date().toISOString(),
      abortSignal: 'stale_reconciler',
      failureReason: 'Marked aborted by stale run reconciler (no active process).'
    };
    try {
      await writeJson(summaryPath, summary);
    } catch {
      // Best effort.
    }
  }
}

function normalizePromptId(value) {
  const parsed = Number.parseInt(String(value || '').trim(), 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function findPromptIndexById(prompts = [], promptId) {
  const normalized = normalizePromptId(promptId);
  if (!Number.isFinite(normalized)) return -1;
  return prompts.findIndex(item => normalizePromptId(item?.id) === normalized);
}

function filterPromptsByEnv(parsedPrompts = []) {
  let filtered = [...parsedPrompts];
  if (PROMPT_ID_FILTER.size > 0) {
    filtered = filtered.filter(prompt => PROMPT_ID_FILTER.has(String(prompt.id).replace(/^0+/, '')) || PROMPT_ID_FILTER.has(String(prompt.id)));
  }
  return filtered;
}

function shouldExpectMicrodetailProfile({ promptFilePath = '', runDir = '' } = {}) {
  if (EXPECT_MICRODETAIL_PROFILE) {
    return true;
  }
  const profileSource = `${promptFilePath} ${runDir}`.toLowerCase();
  return /(microphysics|micro[-_ ]detail|first[-_ ]principles)/i.test(profileSource);
}

function collectMicrodetailProfileViolations() {
  const violations = [];
  if (!FIRST_PRINCIPLES_RECOMPILER_MODE) {
    violations.push('FIRST_PRINCIPLES_RECOMPILER_MODE must be enabled');
  }
  if (!PROMPT_DIRECTION_SUPREMACY_MODE) {
    violations.push('PROMPT_DIRECTION_SUPREMACY_MODE must be enabled');
  }
  if (!ENABLE_RESEARCH_MICRODETAIL_EXPANSION) {
    violations.push('ENABLE_RESEARCH_MICRODETAIL_EXPANSION must be enabled');
  }
  if (!TARGETED_MICRODETAIL_MODE) {
    violations.push('TARGETED_MICRODETAIL_MODE must be enabled');
  }
  if (!MICRO_PHYSICS_LANGUAGE_ENFORCEMENT) {
    violations.push('MICRO_PHYSICS_LANGUAGE_ENFORCEMENT must be enabled');
  }
  if (MICRO_PHYSICS_BANNED_TERMS_MODE === 'off') {
    violations.push('MICRO_PHYSICS_BANNED_TERMS must not be "off"');
  }
  if (PHYSICS_DENSITY_MULTIPLIER < 5) {
    violations.push(`PHYSICS_DENSITY_MULTIPLIER must be >= 5 (got ${PHYSICS_DENSITY_MULTIPLIER})`);
  }
  if (PHYSICS_DENSITY_MIN_RATIO < 5) {
    violations.push(`PHYSICS_DENSITY_MIN_RATIO must be >= 5 (got ${PHYSICS_DENSITY_MIN_RATIO})`);
  }
  return violations;
}

function validateMicrodetailProfileInvariants({ promptFilePath = '', runDir = '' } = {}) {
  const expected = shouldExpectMicrodetailProfile({ promptFilePath, runDir });
  const enforced = expected && MICRODETAIL_PROFILE_LOCK;
  const violations = enforced ? collectMicrodetailProfileViolations() : [];
  return {
    expected,
    enforced,
    lockEnabled: MICRODETAIL_PROFILE_LOCK,
    violations
  };
}

async function buildBaselineDensitySnapshot(parsedPrompts = []) {
  let baselinePrompt = null;
  const baselineIndex = findPromptIndexById(parsedPrompts, PHYSICS_DENSITY_BASELINE_PROMPT_ID);
  if (baselineIndex !== -1) {
    baselinePrompt = parsedPrompts[baselineIndex];
  } else {
    try {
      const fallbackMarkdown = await fs.readFile(PHYSICS_DENSITY_BASELINE_PROMPT_FILE, 'utf8');
      const fallbackPrompts = parsePromptSections(fallbackMarkdown);
      const fallbackIndex = findPromptIndexById(fallbackPrompts, PHYSICS_DENSITY_BASELINE_PROMPT_ID);
      if (fallbackIndex !== -1) {
        baselinePrompt = fallbackPrompts[fallbackIndex];
      }
    } catch {
      baselinePrompt = null;
    }
  }
  if (!baselinePrompt) {
    return {
      promptId: PHYSICS_DENSITY_BASELINE_PROMPT_ID,
      score: 1
    };
  }

  const baselineMeta = {
    promptId: baselinePrompt.id,
    title: baselinePrompt.title,
    buildStages: []
  };
  const safePromptBaseSource = SAFE_FALLBACK_SOURCE_NORMALIZED === 'primary_prompt'
    ? baselinePrompt.primaryPrompt
    : baselinePrompt.safePrompt;
  const primaryAnchorTransferBlock = (
    SAFE_FALLBACK_SOURCE_NORMALIZED === 'safe_prompt'
    && SAFE_TRANSFER_PRIMARY_ANCHORS
  )
    ? buildPrimaryAnchorTransferBlock(baselinePrompt.primaryPrompt, 'safe')
    : '';
  const safePromptSourceText = primaryAnchorTransferBlock
    ? `${safePromptBaseSource}\n\n${primaryAnchorTransferBlock}`
    : safePromptBaseSource;

  const baselinePrimaryPrompt = applyPromptOverrides(baselinePrompt.primaryPrompt, 'primary', baselineMeta);
  const baselineSafePrompt = applyPromptOverrides(safePromptSourceText, 'safe', baselineMeta);
  const primaryScore = computePhysicsDensityScore(baselinePrimaryPrompt).score;
  const safeScore = computePhysicsDensityScore(baselineSafePrompt).score;
  return {
    promptId: baselinePrompt.id,
    score: Math.max(1, Number(Math.max(primaryScore, safeScore).toFixed(2))),
    primaryScore: Number(primaryScore.toFixed(2)),
    safeScore: Number(safeScore.toFixed(2))
  };
}

async function main() {
  await reconcileStaleRunStates();
  const promptMarkdown = await fs.readFile(PROMPT_FILE, 'utf8');
  let parsedPrompts = filterPromptsByEnv(parsePromptSections(promptMarkdown)).slice(0, MAX_PROMPTS);

  if (!parsedPrompts.length) {
    throw new Error(`No prompt sections parsed from: ${PROMPT_FILE}`);
  }

  const resumeFromPromptId = RESUME_FROM_PROMPT_ID_RAW
    ? normalizePromptId(RESUME_FROM_PROMPT_ID_RAW)
    : null;
  if (RESUME_FROM_PROMPT_ID_RAW && !Number.isFinite(resumeFromPromptId)) {
    throw new Error(`Invalid RESUME_FROM_PROMPT_ID: ${RESUME_FROM_PROMPT_ID_RAW}`);
  }
  if (Number.isFinite(resumeFromPromptId) && findPromptIndexById(parsedPrompts, resumeFromPromptId) === -1) {
    throw new Error(`RESUME_FROM_PROMPT_ID ${resumeFromPromptId} not found in parsed prompt set`);
  }

  await fs.access(REFERENCE_IMAGE);
  const referenceInlineData = await loadReferenceInlineData(REFERENCE_IMAGE);

  const runStamp = timestampForPath();
  const runDir = RUN_OUTPUT_DIR || path.join(OUTPUT_BASE, `speakeasy-safe-fallback-${runStamp}`);
  await fs.mkdir(runDir, { recursive: true });
  const summaryPath = path.join(runDir, 'summary.json');
  const promptBuildDiagnosticsPath = path.join(runDir, 'prompt-build-diagnostics.json');
  let promptBuildDiagnostics = [];
  try {
    promptBuildDiagnostics = JSON.parse(await fs.readFile(promptBuildDiagnosticsPath, 'utf8'));
    if (!Array.isArray(promptBuildDiagnostics)) {
      promptBuildDiagnostics = [];
    }
  } catch {
    promptBuildDiagnostics = [];
  }

  let existingSummary = null;
  try {
    existingSummary = JSON.parse(await fs.readFile(summaryPath, 'utf8'));
  } catch {
    existingSummary = null;
  }
  if (RUN_OUTPUT_DIR && existingSummary && !RESUME_FROM_PROMPT_ID_RAW) {
    throw new Error(
      `RUN_OUTPUT_DIR already contains an existing summary. Set RESUME_FROM_PROMPT_ID to resume: ${summaryPath}`
    );
  }

  const microdetailProfileStatus = validateMicrodetailProfileInvariants({
    promptFilePath: PROMPT_FILE,
    runDir
  });
  if (microdetailProfileStatus.enforced && microdetailProfileStatus.violations.length) {
    const violationLines = microdetailProfileStatus.violations
      .map(item => `- ${item}`)
      .join('\n');
    throw new Error(
      [
        'Microdetail profile invariant check failed:',
        violationLines,
        'Set MICRODETAIL_PROFILE_LOCK=0 to bypass this guardrail intentionally.'
      ].join('\n')
    );
  }

  const baselineDensitySnapshot = await buildBaselineDensitySnapshot(parsedPrompts);

  const createdAt = existingSummary?.runInfo?.createdAt || new Date().toISOString();
  const runNonce = existingSummary?.runInfo?.runNonce || buildRunNonce();

  const runInfo = {
    createdAt,
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
    pid: process.pid,
    waitBeforeAttemptSeconds: WAIT_BEFORE_ATTEMPT_S,
    strict61AttemptPacing: STRICT_61S_ATTEMPT_PACING,
    requestTimeoutMs: REQUEST_TIMEOUT_MS,
    requestTimeoutRetryIncrementMs: REQUEST_TIMEOUT_RETRY_INCREMENT_MS,
    requestTimeoutMaxMs: REQUEST_TIMEOUT_MAX_MS,
    imageHttpRetries: IMAGE_HTTP_RETRIES,
    imageHttpBackoffBaseMs: IMAGE_HTTP_BACKOFF_BASE_MS,
    imageHttpBackoffMaxMs: IMAGE_HTTP_BACKOFF_MAX_MS,
    rateLimitAdaptiveCooldown: RATE_LIMIT_ADAPTIVE_COOLDOWN,
    rateLimitCooldownBaseSeconds: RATE_LIMIT_COOLDOWN_BASE_S,
    rateLimitCooldownMaxSeconds: RATE_LIMIT_COOLDOWN_MAX_S,
    rateLimitCooldownGrowth: RATE_LIMIT_COOLDOWN_GROWTH,
    rateLimitCooldownDecaySeconds: RATE_LIMIT_COOLDOWN_DECAY_S,
    rateLimitRetryFloorSeconds: RATE_LIMIT_RETRY_FLOOR_S,
    rateLimitRetryMaxSeconds: RATE_LIMIT_RETRY_MAX_S,
    rateLimitRescueAbortCooldownSeconds: RATE_LIMIT_RESCUE_ABORT_COOLDOWN_S,
    rateLimitFailFastMode: RATE_LIMIT_FAIL_FAST_MODE,
    rateLimitFailFastCooldownSeconds: RATE_LIMIT_FAIL_FAST_COOLDOWN_S,
    rateLimitFailFastMinConsecutive429: RATE_LIMIT_FAIL_FAST_MIN_CONSECUTIVE_429,
    rateLimitSkipSafeFallbackOnPressure: RATE_LIMIT_SKIP_SAFE_FALLBACK_ON_PRESSURE,
    rateLimitPressureDegradedAccept: RATE_LIMIT_PRESSURE_DEGRADED_ACCEPT,
    rateLimitPressureDegradedFloors: {
      overall: RATE_LIMIT_PRESSURE_DEGRADED_OVERALL_MIN,
      identity: RATE_LIMIT_PRESSURE_DEGRADED_IDENTITY_MIN,
      gaze: RATE_LIMIT_PRESSURE_DEGRADED_GAZE_MIN,
      attireReplacement: RATE_LIMIT_PRESSURE_DEGRADED_ATTIRE_MIN,
      realism: RATE_LIMIT_PRESSURE_DEGRADED_REALISM_MIN,
      physics: RATE_LIMIT_PRESSURE_DEGRADED_PHYSICS_MIN
    },
    rateLimitAbortRunConsecutivePrompts: RATE_LIMIT_ABORT_RUN_CONSECUTIVE_PROMPTS,
    pressurePauseEnabled: PRESSURE_PAUSE_ENABLED,
    pressurePauseConsecutivePrompts: PRESSURE_PAUSE_CONSECUTIVE_PROMPTS,
    pressurePauseCooldownMinutes: PRESSURE_PAUSE_COOLDOWN_MIN,
    pressurePauseMaxCycles: PRESSURE_PAUSE_MAX_CYCLES,
    autoResumeEnabled: AUTO_RESUME_ENABLED,
    autoResumePollSeconds: AUTO_RESUME_POLL_S,
    resumeFromPromptId: Number.isFinite(resumeFromPromptId) ? String(resumeFromPromptId) : null,
    attemptWaitJitterSeconds: ATTEMPT_WAIT_JITTER_S,
    outputImageSize: OUTPUT_IMAGE_SIZE,
    outputAspectRatio: OUTPUT_ASPECT_RATIO,
    resolutionOptimizationMode: RESOLUTION_OPTIMIZATION_MODE,
    resolutionMicrodetailLevel: RESOLUTION_MICRODETAIL_LEVEL,
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
    promptReinforcementMaxPasses: PROMPT_REINFORCEMENT_MAX_PASSES,
    targetedMicrodetailMode: TARGETED_MICRODETAIL_MODE,
    microdetailModuleCap: MICRODETAIL_MODULE_CAP,
    physicsDensityMultiplier: PHYSICS_DENSITY_MULTIPLIER,
    physicsDensityBaselinePromptId: PHYSICS_DENSITY_BASELINE_PROMPT_ID,
    physicsDensityBaselinePromptFile: PHYSICS_DENSITY_BASELINE_PROMPT_FILE,
    physicsDensityMinRatio: PHYSICS_DENSITY_MIN_RATIO,
    physicsDensityBaselineScore: baselineDensitySnapshot.score,
    microPhysicsBannedTermsMode: MICRO_PHYSICS_BANNED_TERMS_MODE,
    microdetailProfile: {
      expected: microdetailProfileStatus.expected,
      lockEnabled: microdetailProfileStatus.lockEnabled,
      enforced: microdetailProfileStatus.enforced,
      violations: microdetailProfileStatus.violations
    },
    promptWindowPrimary: { min: PROMPT_WINDOW_PRIMARY_MIN, max: PROMPT_WINDOW_PRIMARY_MAX },
    promptWindowSafe: { min: PROMPT_WINDOW_SAFE_MIN, max: PROMPT_WINDOW_SAFE_MAX },
    promptWindowRescue: { min: PROMPT_WINDOW_RESCUE_MIN, max: PROMPT_WINDOW_RESCUE_MAX },
    enablePromptHardCap: ENABLE_PROMPT_HARD_CAP,
    promptHardCapWords: PROMPT_HARD_CAP_WORDS,
    richPromptMinimalOverlay: RICH_PROMPT_MINIMAL_OVERLAY,
    richPromptMarkerMin: RICH_PROMPT_MARKER_MIN,
    richPromptMarkerMinPrimary: RICH_PROMPT_MARKER_MIN_PRIMARY,
    richPromptMarkerMinSafe: RICH_PROMPT_MARKER_MIN_SAFE,
    richPromptMarkerMinRescue: RICH_PROMPT_MARKER_MIN_RESCUE,
    promptBuildDiagnostics: PROMPT_BUILD_DIAGNOSTICS,
    firstPrinciplesRecompilerMode: FIRST_PRINCIPLES_RECOMPILER_MODE,
    firstPrinciplesSignalLevel: FIRST_PRINCIPLES_SIGNAL_LEVEL,
    firstPrinciplesAppendRawPrompt: FIRST_PRINCIPLES_APPEND_RAW_PROMPT,
    firstPrinciplesDirectiveCap: FIRST_PRINCIPLES_DIRECTIVE_CAP,
    noImageRecoveryRecompilerMode: NO_IMAGE_RECOVERY_RECOMPILER_MODE,
    safePolicyHardening: SAFE_POLICY_HARDENING,
    imageSafetyComplianceMode: IMAGE_SAFETY_COMPLIANCE_MODE,
    imageSafetyComplianceLevel: IMAGE_SAFETY_COMPLIANCE_LEVEL,
    imageSafetyComplianceDropLines: IMAGE_SAFETY_COMPLIANCE_DROP_LINES,
    microPhysicsLanguageEnforcement: MICRO_PHYSICS_LANGUAGE_ENFORCEMENT,
    safeFallbackSource: SAFE_FALLBACK_SOURCE_NORMALIZED,
    safeTransferPrimaryAnchors: SAFE_TRANSFER_PRIMARY_ANCHORS,
    safeAnchorSanitize: SAFE_ANCHOR_SANITIZE,
    safeImageSafetyRetryEnabled: SAFE_IMAGE_SAFETY_RETRY_ENABLED,
    safeImageSafetyRetryMaxAttempts: SAFE_IMAGE_SAFETY_RETRY_MAX_ATTEMPTS,
    safeImageSafetyRetryPromptWordCap: SAFE_IMAGE_SAFETY_RETRY_PROMPT_WORD_CAP,
    safeImageSafetyRetryCompactFinal: SAFE_IMAGE_SAFETY_RETRY_COMPACT_FINAL,
    safeImageSafetyRetryUltraWordCap: SAFE_IMAGE_SAFETY_RETRY_ULTRA_WORD_CAP,
    safeQualityRescueMaxAttempts: SAFE_QUALITY_RESCUE_MAX_ATTEMPTS,
    rescueSuperpositionMode: RESCUE_SUPERPOSITION_MODE,
    rescueSuperpositionTopBranches: RESCUE_SUPERPOSITION_TOP_BRANCHES,
    rescueSuperpositionDirectiveCap: RESCUE_SUPERPOSITION_DIRECTIVE_CAP,
    rescueSuperpositionMinBranchScore: RESCUE_SUPERPOSITION_MIN_BRANCH_SCORE,
    scorerIntentDigestMaxChars: SCORER_INTENT_DIGEST_MAX_CHARS,
    scorerUnavailablePolicy: SCORER_UNAVAILABLE_POLICY,
    identityFallbackAuditEnabled: IDENTITY_FALLBACK_AUDIT_ENABLED,
    identityFallbackAuditMinScore: IDENTITY_FALLBACK_AUDIT_MIN_SCORE,
    identityFallbackAuditMaxOutputTokens: IDENTITY_FALLBACK_AUDIT_MAX_OUTPUT_TOKENS,
    scorerForceSchema: SCORER_FORCE_SCHEMA,
    scorerCompactPrompt: SCORER_COMPACT_PROMPT,
    heuristicScorerAuditOnly: HEURISTIC_SCORER_AUDIT_ONLY,
    scorerParseRequeryOnFail: SCORER_PARSE_REQUERY_ON_FAIL,
    scorerParseRequeryMaxOutputTokens: SCORER_PARSE_REQUERY_MAX_OUTPUT_TOKENS,
    scorerStrictRequerySchema: SCORER_STRICT_REQUERY_SCHEMA,
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
    enableQualityAuditWhenGateOff: ENABLE_QUALITY_AUDIT_WHEN_GATE_OFF,
    enablePrimaryRescue: ENABLE_PRIMARY_RESCUE,
    primaryRescueMaxAttempts: PRIMARY_RESCUE_MAX_ATTEMPTS,
    enablePrimaryUpliftRescue: ENABLE_PRIMARY_UPLIFT_RESCUE,
    scorerSelfHealRetries: SCORER_SELF_HEAL_RETRIES,
    scorerParseRepairRetries: SCORER_PARSE_REPAIR_RETRIES,
    scorerHeuristicMinFields: SCORER_HEURISTIC_MIN_FIELDS,
    scorerRepairMaxOutputTokens: SCORER_REPAIR_MAX_OUTPUT_TOKENS,
    qualityThresholds: qualityThresholds(),
    qualityNearPass: {
      enabled: QUALITY_NEAR_PASS_ENABLE,
      minOverall: QUALITY_NEAR_PASS_MIN_OVERALL,
      maxFailedDimensions: QUALITY_NEAR_PASS_MAX_FAILED_DIMS,
      allowedKeys: Array.from(QUALITY_NEAR_PASS_ALLOWED_KEYS)
    },
    upliftTargets: upliftTargets(),
    qualityGateMaxOutputTokens: QUALITY_GATE_MAX_OUTPUT_TOKENS,
    promptCount: parsedPrompts.length,
    outputDirectory: runDir,
    runOutputDirOverride: RUN_OUTPUT_DIR || null,
    preflightOnly: PREFLIGHT_ONLY,
    promptIdFilter: PROMPT_ID_FILTER.size ? Array.from(PROMPT_ID_FILTER) : [],
    staleRunReconcileEnabled: STALE_RUN_RECONCILE_ENABLED,
    staleRunMinutes: STALE_RUN_MINUTES
  };
  await writeJson(path.join(runDir, 'run-info.json'), runInfo);

  const nowIso = new Date().toISOString();
  let summary;
  if (existingSummary && Number.isFinite(resumeFromPromptId)) {
    summary = existingSummary;
    summary.runInfo = runInfo;
    const priorCycles = Number(summary?.runState?.pauseCycles || 0);
    const pauseCycles = (
      summary?.runState?.status === 'paused_pressure'
      || summary?.runState?.status === 'resuming'
    )
      ? priorCycles + 1
      : priorCycles;
    summary.runState = {
      ...(summary.runState || {}),
      status: 'resuming',
      pid: process.pid,
      updatedAt: nowIso,
      resumedAt: nowIso,
      promptsExpected: parsedPrompts.length,
      promptsCompleted: Array.isArray(summary.prompts) ? summary.prompts.length : 0,
      pauseReason: null,
      nextResumeAt: null,
      resumeFromPromptId: String(resumeFromPromptId).padStart(2, '0'),
      pauseCycles
    };
    if (pauseCycles > PRESSURE_PAUSE_MAX_CYCLES) {
      summary.runState.status = 'failed';
      summary.runState.failedAt = nowIso;
      summary.runState.failureReason =
        `Auto-resume paused too many times (${pauseCycles} > ${PRESSURE_PAUSE_MAX_CYCLES}).`;
    }
  } else {
    summary = {
      runInfo,
      runState: {
        status: 'running',
        pid: process.pid,
        startedAt: runInfo.createdAt,
        updatedAt: nowIso,
        promptsExpected: parsedPrompts.length,
        promptsCompleted: 0,
        pauseReason: null,
        pauseCycles: 0,
        nextResumeAt: null,
        resumeFromPromptId: Number.isFinite(resumeFromPromptId)
          ? String(resumeFromPromptId).padStart(2, '0')
          : null
      },
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
        primaryRescueChosen: 0,
        rateLimitPressureFailures: 0
      },
      metrics: {},
      adaptationHistory: [],
      prompts: []
    };
  }
  ensureSummaryMetrics(summary, baselineDensitySnapshot.score);
  summary.metrics.physicsDensityRatio.baselinePromptId = baselineDensitySnapshot.promptId;
  summary.metrics.physicsDensityRatio.baselineScore = baselineDensitySnapshot.score;
  summary.metrics.physicsDensityRatio.targetRatio = PHYSICS_DENSITY_MIN_RATIO;
  updateAdaptiveMetrics(summary);
  activeRunContext = {
    summaryPath,
    summary
  };
  await writeJson(summaryPath, summary);

  if (summary.runState.status === 'failed') {
    throw new Error(summary.runState.failureReason || 'Resume cycle limit exceeded');
  }

  log(`Run directory: ${runDir}`);
  log(`Loaded ${parsedPrompts.length} prompt pairs from ${PROMPT_FILE}`);
  log(`Reference image: ${REFERENCE_IMAGE}`);
  log(`Model: ${MODEL}`);
  log(
    `Request timeout: base=${REQUEST_TIMEOUT_MS}ms, retryIncrement=${REQUEST_TIMEOUT_RETRY_INCREMENT_MS}ms, max=${REQUEST_TIMEOUT_MAX_MS}ms`
  );
  log(
    `Image HTTP retries: retries=${IMAGE_HTTP_RETRIES}, backoffBaseMs=${IMAGE_HTTP_BACKOFF_BASE_MS}, backoffMaxMs=${IMAGE_HTTP_BACKOFF_MAX_MS}`
  );
  log(
    `Adaptive 429 cooldown: ${RATE_LIMIT_ADAPTIVE_COOLDOWN
      ? `enabled (base=${RATE_LIMIT_COOLDOWN_BASE_S}s, max=${RATE_LIMIT_COOLDOWN_MAX_S}s, growth=${RATE_LIMIT_COOLDOWN_GROWTH}x, decay=${RATE_LIMIT_COOLDOWN_DECAY_S}s, retryFloor=${RATE_LIMIT_RETRY_FLOOR_S}s, retryCap=${RATE_LIMIT_RETRY_MAX_S}s)`
      : 'disabled'}`
  );
  log(`Rate-limit rescue abort threshold: ${RATE_LIMIT_RESCUE_ABORT_COOLDOWN_S}s`);
  log(
    `Rate-limit fail-fast: ${RATE_LIMIT_FAIL_FAST_MODE
      ? `enabled (cooldown>=${RATE_LIMIT_FAIL_FAST_COOLDOWN_S}s, minConsecutive429=${RATE_LIMIT_FAIL_FAST_MIN_CONSECUTIVE_429})`
      : 'disabled'}`
  );
  log(`Attempt pacing invariant: ${STRICT_61S_ATTEMPT_PACING ? 'strict 61.0s' : 'disabled'}`);
  log(
    `Skip safe fallback on pressure: ${RATE_LIMIT_SKIP_SAFE_FALLBACK_ON_PRESSURE ? 'enabled' : 'disabled'}`
  );
  log(
    `Pressure-degraded primary accept: ${RATE_LIMIT_PRESSURE_DEGRADED_ACCEPT
      ? `enabled (overall>=${RATE_LIMIT_PRESSURE_DEGRADED_OVERALL_MIN}, id>=${RATE_LIMIT_PRESSURE_DEGRADED_IDENTITY_MIN}, gaze>=${RATE_LIMIT_PRESSURE_DEGRADED_GAZE_MIN}, attire>=${RATE_LIMIT_PRESSURE_DEGRADED_ATTIRE_MIN}, realism>=${RATE_LIMIT_PRESSURE_DEGRADED_REALISM_MIN}, physics>=${RATE_LIMIT_PRESSURE_DEGRADED_PHYSICS_MIN})`
      : 'disabled'}`
  );
  log(
    `Pressure pause orchestration: ${PRESSURE_PAUSE_ENABLED
      ? `enabled (consecutivePrompts=${PRESSURE_PAUSE_CONSECUTIVE_PROMPTS}, cooldownMin=${PRESSURE_PAUSE_COOLDOWN_MIN}, maxCycles=${PRESSURE_PAUSE_MAX_CYCLES}, autoResume=${AUTO_RESUME_ENABLED ? `on poll=${AUTO_RESUME_POLL_S}s` : 'off'})`
      : `disabled (legacy abort threshold=${RATE_LIMIT_ABORT_RUN_CONSECUTIVE_PROMPTS})`}`
  );
  log(`Attempt wait jitter: ${ATTEMPT_WAIT_JITTER_S > 0 ? `enabled (0-${ATTEMPT_WAIT_JITTER_S}s)` : 'disabled'}`);
  log(`Output config: imageSize=${OUTPUT_IMAGE_SIZE} aspectRatio=${OUTPUT_ASPECT_RATIO}`);
  log(
    `Resolution optimization: ${RESOLUTION_OPTIMIZATION_MODE
      ? `enabled (microdetailLevel=${RESOLUTION_MICRODETAIL_LEVEL})`
      : 'disabled'}`
  );
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
  log(
    `Skip safe fallback on primary reject: ${SKIP_SAFE_FALLBACK_ON_PRIMARY_REJECT ? 'enabled' : 'disabled'}`
  );
  log(`Sensual editorial boost: ${SENSUAL_EDITORIAL_BOOST ? `enabled (level ${SENSUAL_EDITORIAL_LEVEL})` : 'disabled'}`);
  log(`Sensual variance guard: ${SENSUAL_VARIANCE_GUARD ? `enabled (level ${SENSUAL_VARIANCE_LEVEL})` : 'disabled'}`);
  log(
    `Research microdetail expansion: ${ENABLE_RESEARCH_MICRODETAIL_EXPANSION
      ? `enabled (targetWords=${PROMPT_TARGET_WORDS}, maxPasses=${getAdaptiveReinforcementPassCap()}, targeted=${TARGETED_MICRODETAIL_MODE ? `yes cap=${getAdaptiveMicrodetailModuleCap()}` : 'no'})`
      : 'disabled'}`
  );
  log(
    `Rich prompt minimal overlay: ${RICH_PROMPT_MINIMAL_OVERLAY
      ? `enabled (primary=${RICH_PROMPT_MARKER_MIN_PRIMARY}, safe=${RICH_PROMPT_MARKER_MIN_SAFE}, rescue=${RICH_PROMPT_MARKER_MIN_RESCUE})`
      : 'disabled'}`
  );
  log(
    `Prompt windows: primary=${PROMPT_WINDOW_PRIMARY_MIN}-${PROMPT_WINDOW_PRIMARY_MAX},`
    + ` safe=${PROMPT_WINDOW_SAFE_MIN}-${PROMPT_WINDOW_SAFE_MAX},`
    + ` rescue=${PROMPT_WINDOW_RESCUE_MIN}-${PROMPT_WINDOW_RESCUE_MAX}`
  );
  log(`Prompt build diagnostics: ${PROMPT_BUILD_DIAGNOSTICS ? `enabled (${promptBuildDiagnosticsPath})` : 'disabled'}`);
  log(
    `First-principles recompiler: ${FIRST_PRINCIPLES_RECOMPILER_MODE
      ? `enabled (signalLevel=${FIRST_PRINCIPLES_SIGNAL_LEVEL}, directiveCap=${FIRST_PRINCIPLES_DIRECTIVE_CAP}, rawAppend=${FIRST_PRINCIPLES_APPEND_RAW_PROMPT ? 'yes' : 'no'})`
      : 'disabled'}`
  );
  log(`No-image recovery recompiler: ${NO_IMAGE_RECOVERY_RECOMPILER_MODE ? 'enabled' : 'disabled'}`);
  log(`Prompt hard-cap: ${ENABLE_PROMPT_HARD_CAP ? `enabled (maxWords=${PROMPT_HARD_CAP_WORDS})` : 'disabled'}`);
  log(`Safe policy hardening: ${SAFE_POLICY_HARDENING ? 'enabled' : 'disabled'}`);
  log(
    `Image safety compliance filter: ${IMAGE_SAFETY_COMPLIANCE_MODE
      ? `enabled (level=${IMAGE_SAFETY_COMPLIANCE_LEVEL}, dropLines=${IMAGE_SAFETY_COMPLIANCE_DROP_LINES ? 'yes' : 'no'})`
      : 'disabled'}`
  );
  log(`Micro-physics language enforcement: ${MICRO_PHYSICS_LANGUAGE_ENFORCEMENT ? 'enabled' : 'disabled'}`);
  log(`Micro-physics broad-term policy: ${MICRO_PHYSICS_BANNED_TERMS_MODE}`);
  log(
    `Microdetail profile guard: ${microdetailProfileStatus.expected
      ? (microdetailProfileStatus.enforced ? 'enforced' : 'expected but lock disabled')
      : 'not-required'}`
  );
  if (microdetailProfileStatus.expected && !microdetailProfileStatus.enforced) {
    log('Microdetail profile guard warning: lock disabled; inherited env can override physics/detail controls.');
  }
  log(
    `Physics density gate: baselinePrompt=${baselineDensitySnapshot.promptId} baselineScore=${baselineDensitySnapshot.score}`
    + ` targetRatio>=${PHYSICS_DENSITY_MIN_RATIO} multiplier=${PHYSICS_DENSITY_MULTIPLIER}`
  );
  log(`Safe fallback source: ${SAFE_FALLBACK_SOURCE_NORMALIZED}`);
  log(`Safe transfer primary anchors: ${SAFE_TRANSFER_PRIMARY_ANCHORS ? 'enabled' : 'disabled'}`);
  log(`Safe anchor sanitize: ${SAFE_ANCHOR_SANITIZE ? 'enabled' : 'disabled'}`);
  log(
    `Safe IMAGE_SAFETY retry: ${SAFE_IMAGE_SAFETY_RETRY_ENABLED
      ? `enabled (maxAttempts=${SAFE_IMAGE_SAFETY_RETRY_MAX_ATTEMPTS}, wordCap=${SAFE_IMAGE_SAFETY_RETRY_PROMPT_WORD_CAP}, compactFinal=${SAFE_IMAGE_SAFETY_RETRY_COMPACT_FINAL ? 'yes' : 'no'}, ultraWordCap=${SAFE_IMAGE_SAFETY_RETRY_ULTRA_WORD_CAP})`
      : 'disabled'}`
  );
  log(`Safe quality rescue attempts: ${SAFE_QUALITY_RESCUE_MAX_ATTEMPTS}`);
  log(
    `Rescue superposition: ${RESCUE_SUPERPOSITION_MODE
      ? `enabled (topBranches=${RESCUE_SUPERPOSITION_TOP_BRANCHES}, directiveCap=${getAdaptiveRescueDirectiveCap()}, minBranchScore=${RESCUE_SUPERPOSITION_MIN_BRANCH_SCORE})`
      : 'disabled'}`
  );
  log(`Edge priority multiplier: ${EDGE_PRIORITY_MULTIPLIER}x`);
  log(
    `Edge-first acceptance: ${EDGE_FIRST_ACCEPTANCE_MODE
      ? `enabled (edge>=${EDGE_FIRST_ACCEPTANCE_EDGE_MIN}, id>=${EDGE_FIRST_ACCEPTANCE_IDENTITY_MIN}, gaze>=${EDGE_FIRST_ACCEPTANCE_GAZE_MIN}, attire>=${EDGE_FIRST_ACCEPTANCE_ATTIRE_MIN}, scene>=${EDGE_FIRST_ACCEPTANCE_SCENE_MIN}, pose>=${EDGE_FIRST_ACCEPTANCE_POSE_MIN})`
      : 'disabled'}`
  );
  log(
    `Direct camera gaze override: ${DIRECT_CAMERA_GAZE_OVERRIDE ? `enabled (realism level ${PHYSICS_REALISM_OVERRIDE_LEVEL})` : 'disabled'}`
  );
  log(`Physics/realism priority multiplier: ${getAdaptivePhysicsPriorityMultiplier()}x`);
  log(
    `Physics/realism prompt hard mode: ${PHYSICS_REALISM_PROMPT_HARD_MODE
      ? `enabled (density ${PHYSICS_REALISM_PROMPT_DENSITY})`
      : 'disabled'}`
  );
  log(`Anti-AI realism boost: ${ANTI_AI_REALISM_BOOST ? `enabled (level ${ANTI_AI_REALISM_LEVEL})` : 'disabled'}`);
  log(`Quality gate: ${ENABLE_QUALITY_GATE ? `enabled (scorer=${SCORER_MODEL})` : 'disabled'}`);
  log(
    `Quality near-pass policy: ${QUALITY_NEAR_PASS_ENABLE
      ? `enabled (minOverall=${QUALITY_NEAR_PASS_MIN_OVERALL}, maxFailed=${QUALITY_NEAR_PASS_MAX_FAILED_DIMS}, allowed=${Array.from(QUALITY_NEAR_PASS_ALLOWED_KEYS).join(',')})`
      : 'disabled'}`
  );
  if (!ENABLE_QUALITY_GATE) {
    log(
      `Quality audit when gate off: ${ENABLE_QUALITY_AUDIT_WHEN_GATE_OFF
        ? `enabled (scorer=${SCORER_MODEL}, audit-only)`
        : 'disabled'}`
    );
    if (!ENABLE_QUALITY_AUDIT_WHEN_GATE_OFF) {
      log('WARNING: quality scoring is fully disabled; attire/identity drift cannot be measured in this run.');
    }
  }
  log(`Scorer unavailable policy: ${SCORER_UNAVAILABLE_POLICY}`);
  log(
    `Identity fallback audit: ${IDENTITY_FALLBACK_AUDIT_ENABLED
      ? `enabled (minScore=${IDENTITY_FALLBACK_AUDIT_MIN_SCORE}, maxTokens=${IDENTITY_FALLBACK_AUDIT_MAX_OUTPUT_TOKENS})`
      : 'disabled'}`
  );
  if (IDENTITY_FALLBACK_AUDIT_ENABLED) {
    log('Identity fallback audit gating: scorer parse failures fail closed unless fallback audit explicitly passes.');
  }
  log(`Scorer schema enforcement: ${SCORER_FORCE_SCHEMA ? 'enabled' : 'disabled'}`);
  log(`Scorer compact prompt: ${SCORER_COMPACT_PROMPT ? 'enabled' : 'disabled'}`);
  log(`Heuristic scorer parser: ${HEURISTIC_SCORER_AUDIT_ONLY ? 'audit-only (non-blocking)' : 'gating-eligible'}`);
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

  const loopStartIndex = Number.isFinite(resumeFromPromptId)
    ? Math.max(0, findPromptIndexById(parsedPrompts, resumeFromPromptId))
    : 0;
  if (loopStartIndex > 0) {
    log(`Resume start index: ${loopStartIndex + 1}/${parsedPrompts.length} (promptId=${resumeFromPromptId})`);
  }

  let consecutivePromptRateLimitPressure = 0;
  for (let i = loopStartIndex; i < parsedPrompts.length; i += 1) {
    const prompt = parsedPrompts[i];
    const promptLabel = `${prompt.id} ${prompt.title}`;
    const promptSlug = `${prompt.id}-${slugify(prompt.title)}`;
    const buildStages = [];
    const promptMeta = {
      promptId: prompt.id,
      title: prompt.title,
      buildStages
    };
    const primaryIntentDigest = extractPromptIntentDigest(prompt.primaryPrompt);
    const safePromptBaseSource = SAFE_FALLBACK_SOURCE_NORMALIZED === 'primary_prompt'
      ? prompt.primaryPrompt
      : prompt.safePrompt;
    const primaryAnchorTransferBlock = (
      SAFE_FALLBACK_SOURCE_NORMALIZED === 'safe_prompt'
      && SAFE_TRANSFER_PRIMARY_ANCHORS
    )
      ? buildPrimaryAnchorTransferBlock(prompt.primaryPrompt, 'safe')
      : '';
    const safeIntentSourceText = primaryAnchorTransferBlock
      ? `${safePromptBaseSource}\n\n${primaryAnchorTransferBlock}`
      : safePromptBaseSource;
    const safeIntentDigest = extractPromptIntentDigest(safeIntentSourceText);
    const primaryPromptTextBaseRaw = applyPromptOverrides(prompt.primaryPrompt, 'primary', promptMeta);
    const safePromptSourceText = safeIntentSourceText;
    const safePromptTextBaseRaw = applyPromptOverrides(safePromptSourceText, 'safe', promptMeta);

    const primaryPreflight = runVariantPreflight({
      promptText: primaryPromptTextBaseRaw,
      variant: 'primary',
      promptMeta,
      baselineScore: baselineDensitySnapshot.score
    });
    const safePreflight = runVariantPreflight({
      promptText: safePromptTextBaseRaw,
      variant: 'safe',
      promptMeta,
      baselineScore: baselineDensitySnapshot.score
    });
    const preflightDiagnostics = {
      baselinePromptId: baselineDensitySnapshot.promptId,
      baselineScore: baselineDensitySnapshot.score,
      primary: primaryPreflight.diagnostics,
      safe: safePreflight.diagnostics
    };
    let preflightFailureReason = !primaryPreflight.ok
      ? `primary:${primaryPreflight.failureReason}`
      : (!safePreflight.ok ? `safe:${safePreflight.failureReason}` : null);
    const primaryPromptTextBase = primaryPreflight.promptText;
    const safePromptTextBase = safePreflight.promptText;

    const primaryPromptText = applyPromptNonce(primaryPromptTextBase, {
      runNonce,
      promptId: prompt.id,
      variant: 'primary',
      attemptIndex: 1
    });
    recordPromptBuildStage(promptMeta, 'primary', 'nonce-applied', primaryPromptText);
    const safePromptText = applyPromptNonce(safePromptTextBase, {
      runNonce,
      promptId: prompt.id,
      variant: 'safe',
      attemptIndex: 1
    });
    recordPromptBuildStage(promptMeta, 'safe', 'nonce-applied', safePromptText);
    const postNoncePrimaryDensity = computePhysicsDensityScore(primaryPromptText).score / Math.max(0.01, baselineDensitySnapshot.score);
    const postNonceSafeDensity = computePhysicsDensityScore(safePromptText).score / Math.max(0.01, baselineDensitySnapshot.score);
    preflightDiagnostics.primary.postNonceRatio = Number(postNoncePrimaryDensity.toFixed(3));
    preflightDiagnostics.safe.postNonceRatio = Number(postNonceSafeDensity.toFixed(3));
    const primaryTemplateCollapseSignals = detectWardrobeTemplateCollapse(primaryPromptText);
    const safeTemplateCollapseSignals = detectWardrobeTemplateCollapse(safePromptText);
    preflightDiagnostics.primary.templateCollapseSignals = primaryTemplateCollapseSignals;
    preflightDiagnostics.safe.templateCollapseSignals = safeTemplateCollapseSignals;
    if (!preflightFailureReason) {
      if (postNoncePrimaryDensity < PHYSICS_DENSITY_MIN_RATIO) {
        preflightFailureReason = `primary:post_nonce_density_ratio_below_target (${postNoncePrimaryDensity.toFixed(3)} < ${PHYSICS_DENSITY_MIN_RATIO})`;
      } else if (postNonceSafeDensity < PHYSICS_DENSITY_MIN_RATIO) {
        preflightFailureReason = `safe:post_nonce_density_ratio_below_target (${postNonceSafeDensity.toFixed(3)} < ${PHYSICS_DENSITY_MIN_RATIO})`;
      } else if (primaryTemplateCollapseSignals.length) {
        preflightFailureReason = `primary:wardrobe_template_collapse (${primaryTemplateCollapseSignals.join(',')})`;
      } else if (safeTemplateCollapseSignals.length) {
        preflightFailureReason = `safe:wardrobe_template_collapse (${safeTemplateCollapseSignals.join(',')})`;
      }
    }
    const primaryPromptHash = shortHash(primaryPromptText, 24);
    const safePromptHash = shortHash(safePromptText, 24);

    let primaryRescuePromptText = null;
    let primaryRescuePromptHash = null;

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
      qualityFinal: null,
      preflightDiagnostics,
      telemetry: {
        maxConsecutive429: 0,
        totalHttp429: 0,
        totalRetriesUsed: 0,
        finalFailureReason: null
      }
    };

    if (preflightFailureReason) {
      promptRecord.finalStatus = 'failed';
      promptRecord.telemetry.finalFailureReason = `preflight_failed:${preflightFailureReason}`;
      const reason = `[${i + 1}/${parsedPrompts.length}] ${promptLabel}: preflight failed (${preflightFailureReason})`;
      log(reason);
      upsertPromptRecord(summary, promptRecord);
      summary.runState.promptsCompleted = summary.prompts.length;
      summary.runState.updatedAt = new Date().toISOString();
      const adaptiveOutcome = applyAdaptiveStrategyCheckpoint(summary, {
        trigger: 'preflight_failure',
        context: `prompt=${prompt.id}`
      });
      if (adaptiveOutcome.hardStop) {
        summary.runState.status = 'failed';
        summary.runState.failureReason = adaptiveOutcome.reason;
      } else {
        summary.runState.status = 'failed';
        summary.runState.failureReason = reason;
      }
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
          primaryRescuePromptPreview: null
        };
        await writeJson(path.join(runDir, `${promptSlug}-prompt-preview.json`), preview);
      }
      await writeJson(path.join(runDir, `${promptSlug}-attempts.json`), promptRecord);
      await writeJson(summaryPath, summary);
      break;
    }

    if (PREFLIGHT_ONLY) {
      promptRecord.finalStatus = 'success';
      promptRecord.chosenVariant = 'preflight';
      promptRecord.telemetry.finalFailureReason = 'preflight_only';
      upsertPromptRecord(summary, promptRecord);
      summary.runState.promptsCompleted = summary.prompts.length;
      summary.runState.updatedAt = new Date().toISOString();
      applyAdaptiveStrategyCheckpoint(summary, {
        trigger: 'preflight_checkpoint',
        context: `prompt=${prompt.id}`
      });
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
          primaryRescuePromptPreview: null
        };
        await writeJson(path.join(runDir, `${promptSlug}-prompt-preview.json`), preview);
      }
      await writeJson(path.join(runDir, `${promptSlug}-attempts.json`), promptRecord);
      await writeJson(summaryPath, summary);
      log(`[${i + 1}/${parsedPrompts.length}] ${promptLabel}: preflight-only pass`);
      continue;
    }

    log(`[${i + 1}/${parsedPrompts.length}] ${promptLabel}: primary attempt`);
    log(`[${i + 1}/${parsedPrompts.length}] ${promptLabel}: primary promptHash=${primaryPromptHash}`);

    const primaryResult = await callImageModel({
      promptText: primaryPromptText,
      referenceInlineData,
      label: `Prompt ${prompt.id} primary`
    });

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
        requestMetrics: primaryResult.requestMetrics || null,
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
      const primaryParseNeedsRescue = (
        !primaryQuality.scorerAvailable
        && primaryQuality.scorerError?.errorType === 'parse'
        && primaryQuality?.identityFallbackAudit?.pass !== true
      );
      const shouldRunPrimaryRescue = ENABLE_QUALITY_GATE && ENABLE_PRIMARY_RESCUE && (
        (primaryQuality.scorerAvailable && !primaryQuality.pass)
        || upliftDeficiencies.length > 0
        || primaryParseNeedsRescue
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
            rescueRound,
            promptMeta
          });
          primaryRescuePromptText = applyPromptNonce(rescuePromptBase, {
            runNonce,
            promptId: prompt.id,
            variant: rescueVariant,
            attemptIndex: rescueAttemptIndex
          });
          recordPromptBuildStage(promptMeta, rescueVariant, 'nonce-applied', primaryRescuePromptText);
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
              requestMetrics: primaryRescueResult.requestMetrics || null,
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
              responseHeaders: primaryRescueResult.responseHeaders || null,
              requestMetrics: primaryRescueResult.requestMetrics || null
            });
            log(
              `[${i + 1}/${parsedPrompts.length}] ${promptLabel}: ${rescueVariant} failed (${primaryRescueResult.errorType})`
            );
            if (shouldAbortRescueDueToRateLimitPressure(primaryRescueResult.errorType, primaryRescueResult.status)) {
              const cooldownS = Math.ceil(getAdaptiveCooldownRemainingMs() / 1000);
              log(
                `[${i + 1}/${parsedPrompts.length}] ${promptLabel}: aborting further primary rescues due to sustained 429 pressure`
                + ` (cooldown=${cooldownS}s, threshold=${RATE_LIMIT_RESCUE_ABORT_COOLDOWN_S}s)`
              );
              break;
            }
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
          const continueDueToIdentityAuditFail = continueDueToParse
            && currentQuality?.identityFallbackAudit?.pass !== true;
          if (continueDueToFail || continueDueToUplift || continueDueToIdentityAuditFail) {
            const adaptiveCooldownS = getAdaptiveCooldownRemainingMs() / 1000;
            if (adaptiveCooldownS >= RATE_LIMIT_RESCUE_ABORT_COOLDOWN_S) {
              log(
                `[${i + 1}/${parsedPrompts.length}] ${promptLabel}: stopping additional primary rescues because adaptive cooldown is ${Math.ceil(adaptiveCooldownS)}s`
              );
              break;
            }
            const continuationReason = continueDueToFail
              ? 'still below quality thresholds'
              : continueDueToUplift
                ? `still below uplift targets (${rescueUpliftDeficiencies.join(', ')})`
                : 'identity fallback audit still failing on scorer parse';
            log(
              `[${i + 1}/${parsedPrompts.length}] ${promptLabel}: running another rescue because ${continuationReason}`
            );
            continue;
          }
          break;
        }
      }

      const primaryQualityAccepted = isQualityAcceptableForFinal(chosenPrimary.quality, 'primary');
      const promptHas429AttemptFailure = hasAny429Failure(promptRecord.attempts || []);
      const pressureSignalActive = promptHas429AttemptFailure
        || consecutivePromptRateLimitPressure > 0
        || isRateLimitFailFastPressure('rate_limit_pressure', 429);
      const pressureDegradedAccept = pressureSignalActive
        && isPressureDegradedQualityAcceptable(chosenPrimary.quality);
      const skipSafeFallbackOnPressure = RATE_LIMIT_SKIP_SAFE_FALLBACK_ON_PRESSURE && pressureSignalActive;
      if (primaryQualityAccepted) {
        promptRecord.finalStatus = 'success';
        promptRecord.chosenVariant = 'primary';
        promptRecord.outputFile = chosenPrimary.outputFile;
        promptRecord.qualityFinal = chosenPrimary.quality || null;
        summary.totals.primarySuccess += 1;
        log(`[${i + 1}/${parsedPrompts.length}] ${promptLabel}: primary success`);
      } else if (pressureDegradedAccept) {
        promptRecord.finalStatus = 'success';
        promptRecord.chosenVariant = 'primary';
        promptRecord.outputFile = chosenPrimary.outputFile;
        promptRecord.qualityFinal = {
          ...(chosenPrimary.quality || {}),
          pressureDegradedAccept: true
        };
        summary.totals.primarySuccess += 1;
        pushAdaptationHistory(summary, {
          trigger: 'rate_limit_pressure',
          change: `accept primary under pressure for prompt ${prompt.id}`,
          result: `overall=${Number(chosenPrimary?.quality?.overallScore || 0).toFixed(3)}, identity=${Number(chosenPrimary?.quality?.scores?.identity || 0).toFixed(2)}, attire=${Number(chosenPrimary?.quality?.scores?.attireReplacement || 0).toFixed(2)}`
        });
        log(
          `[${i + 1}/${parsedPrompts.length}] ${promptLabel}: primary accepted under pressure-degraded policy`
        );
      } else if (skipSafeFallbackOnPressure) {
        summary.totals.failed += 1;
        promptRecord.chosenVariant = 'primary';
        promptRecord.outputFile = chosenPrimary.outputFile;
        promptRecord.qualityFinal = chosenPrimary.quality || null;
        log(
          `[${i + 1}/${parsedPrompts.length}] ${promptLabel}: primary image rejected by quality gate; safe fallback skipped due to active rate-limit pressure`
        );
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

        const safeOutcome = await executeSafeFallbackSequence({
          indexLabel: `[${i + 1}/${parsedPrompts.length}] ${promptLabel}`,
          prompt,
          promptSlug,
          runDir,
          runNonce,
          buildStages,
          safePromptText,
          safePromptSourceText: safePromptTextBase,
          safePromptHash,
          safeIntentDigest,
          referenceInlineData,
          promptRecord,
          summary
        });

        if (safeOutcome.status === 'accepted') {
          promptRecord.finalStatus = 'success';
          promptRecord.chosenVariant = 'safe';
          promptRecord.outputFile = safeOutcome.outputFile;
          promptRecord.qualityFinal = safeOutcome.quality || null;
          summary.totals.safeSuccess += 1;
          log(`[${i + 1}/${parsedPrompts.length}] ${promptLabel}: safe fallback success`);
        } else {
          summary.totals.failed += 1;
          if (safeOutcome.status === 'quality_rejected') {
            log(`[${i + 1}/${parsedPrompts.length}] ${promptLabel}: safe fallback rejected by quality gate`);
          } else {
            log(`[${i + 1}/${parsedPrompts.length}] ${promptLabel}: safe fallback failed (${safeOutcome.errorType})`);
          }
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
        responseHeaders: primaryResult.responseHeaders || null,
        requestMetrics: primaryResult.requestMetrics || null
      });

      const skipSafeFallbackOnPressure = RATE_LIMIT_SKIP_SAFE_FALLBACK_ON_PRESSURE
        && (
          is429HttpFailure(primaryResult.errorType, primaryResult.status, primaryResult.requestMetrics || null)
          || isRateLimitFailFastPressure(primaryResult.errorType, primaryResult.status)
        );
      if (skipSafeFallbackOnPressure) {
        summary.totals.failed += 1;
        log(
          `[${i + 1}/${parsedPrompts.length}] ${promptLabel}: primary failed (${primaryResult.errorType}); safe fallback skipped due to sustained rate-limit pressure`
        );
      } else if (SKIP_SAFE_FALLBACK_ON_PRIMARY_REJECT) {
        summary.totals.failed += 1;
        log(
          `[${i + 1}/${parsedPrompts.length}] ${promptLabel}: primary failed (${primaryResult.errorType}); safe fallback skipped by config`
        );
      } else {
        log(`[${i + 1}/${parsedPrompts.length}] ${promptLabel}: primary failed (${primaryResult.errorType}), trying safe fallback`);
        log(`[${i + 1}/${parsedPrompts.length}] ${promptLabel}: safe promptHash=${safePromptHash}`);

        const safeOutcome = await executeSafeFallbackSequence({
          indexLabel: `[${i + 1}/${parsedPrompts.length}] ${promptLabel}`,
          prompt,
          promptSlug,
          runDir,
          runNonce,
          buildStages,
          safePromptText,
          safePromptSourceText: safePromptTextBase,
          safePromptHash,
          safeIntentDigest,
          referenceInlineData,
          promptRecord,
          summary
        });

        if (safeOutcome.status === 'accepted') {
          promptRecord.finalStatus = 'success';
          promptRecord.chosenVariant = 'safe';
          promptRecord.outputFile = safeOutcome.outputFile;
          promptRecord.qualityFinal = safeOutcome.quality || null;
          summary.totals.safeSuccess += 1;
          log(`[${i + 1}/${parsedPrompts.length}] ${promptLabel}: safe fallback success`);
        } else {
          summary.totals.failed += 1;
          if (safeOutcome.status === 'quality_rejected') {
            log(`[${i + 1}/${parsedPrompts.length}] ${promptLabel}: safe fallback rejected by quality gate`);
          } else {
            log(`[${i + 1}/${parsedPrompts.length}] ${promptLabel}: safe fallback failed (${safeOutcome.errorType})`);
          }
        }
      }
    }

    promptRecord.telemetry = computePromptRequestTelemetry(promptRecord.attempts);
    log(
      `[${i + 1}/${parsedPrompts.length}] ${promptLabel}: telemetry`
      + ` retriesUsed=${promptRecord.telemetry.totalRetriesUsed}, http429=${promptRecord.telemetry.totalHttp429},`
      + ` maxConsecutive429=${promptRecord.telemetry.maxConsecutive429}, finalFailureReason=${promptRecord.telemetry.finalFailureReason || 'none'}`
    );

    const promptEndedInRateLimitPressure = isPromptRateLimitPressure(promptRecord);
    const pressureThreshold = PRESSURE_PAUSE_ENABLED
      ? PRESSURE_PAUSE_CONSECUTIVE_PROMPTS
      : RATE_LIMIT_ABORT_RUN_CONSECUTIVE_PROMPTS;
    if (promptEndedInRateLimitPressure) {
      consecutivePromptRateLimitPressure += 1;
      summary.totals.rateLimitPressureFailures += 1;
      log(
        `[${i + 1}/${parsedPrompts.length}] ${promptLabel}: prompt ended in sustained rate-limit pressure`
        + ` (consecutive=${consecutivePromptRateLimitPressure}/${pressureThreshold})`
      );
    } else {
      consecutivePromptRateLimitPressure = 0;
    }

    if (PROMPT_BUILD_DIAGNOSTICS) {
      promptBuildDiagnostics.push({
        id: prompt.id,
        title: prompt.title,
        stages: buildStages
      });
      await writeJson(promptBuildDiagnosticsPath, promptBuildDiagnostics);
    }

    upsertPromptRecord(summary, promptRecord);
    const nextPrompt = parsedPrompts[i + 1] || null;
    summary.runState.promptsCompleted = summary.prompts.length;
    summary.runState.updatedAt = new Date().toISOString();
    summary.runState.resumeFromPromptId = promptRecord.finalStatus === 'success'
      ? (nextPrompt ? String(nextPrompt.id).padStart(2, '0') : null)
      : String(prompt.id).padStart(2, '0');
    const adaptiveOutcome = applyAdaptiveStrategyCheckpoint(summary, {
      trigger: 'prompt_checkpoint',
      context: `prompt=${prompt.id}`
    });
    if (adaptiveOutcome.hardStop) {
      summary.runState.status = 'failed';
      summary.runState.failureReason = adaptiveOutcome.reason;
      summary.runState.updatedAt = new Date().toISOString();
    }

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

    if (summary.runState.status === 'failed') {
      break;
    }

    if (PRESSURE_PAUSE_ENABLED && pressureThreshold > 0 && consecutivePromptRateLimitPressure >= pressureThreshold) {
      const nowMs = Date.now();
      const nextResumeAt = new Date(nowMs + (PRESSURE_PAUSE_COOLDOWN_MIN * 60 * 1000)).toISOString();
      const resumePromptId = String(prompt.id).padStart(2, '0');
      summary.runState.status = 'paused_pressure';
      summary.runState.pauseReason =
        `Sustained 429 pressure for ${consecutivePromptRateLimitPressure} consecutive prompts`
        + ` (threshold=${pressureThreshold}, cooldownMin=${PRESSURE_PAUSE_COOLDOWN_MIN})`;
      summary.runState.nextResumeAt = nextResumeAt;
      summary.runState.resumeFromPromptId = resumePromptId;
      summary.runState.updatedAt = new Date().toISOString();
      pushAdaptationHistory(summary, {
        trigger: 'rate_limit_pressure',
        change: `pause run and schedule resume from prompt ${resumePromptId}`,
        result: `nextResumeAt=${nextResumeAt}`
      });
      await writeJson(summaryPath, summary);
      log(
        `[${i + 1}/${parsedPrompts.length}] ${promptLabel}: entering paused_pressure state`
        + ` (resumeFromPromptId=${resumePromptId}, nextResumeAt=${nextResumeAt})`
      );
      break;
    }

    if (!PRESSURE_PAUSE_ENABLED && pressureThreshold > 0 && consecutivePromptRateLimitPressure >= pressureThreshold) {
      const failureReason =
        `Aborted after ${consecutivePromptRateLimitPressure} consecutive prompts under sustained rate-limit pressure`
        + ` (threshold=${pressureThreshold}, cooldown>=${RATE_LIMIT_FAIL_FAST_COOLDOWN_S}s)`;
      summary.runState.status = 'failed';
      summary.runState.failureReason = failureReason;
      summary.runState.updatedAt = new Date().toISOString();
      await writeJson(summaryPath, summary);
      log(failureReason);
      break;
    }
  }

  if (summary.runState.status === 'running' || summary.runState.status === 'resuming') {
    summary.runState.status = 'completed';
    summary.runState.completedAt = new Date().toISOString();
    summary.runState.updatedAt = summary.runState.completedAt;
    summary.runState.pauseReason = null;
    summary.runState.nextResumeAt = null;
    await writeJson(summaryPath, summary);
  }

  updateAdaptiveMetrics(summary);
  await writeJson(summaryPath, summary);

  log(
    `Finished (status=${summary.runState.status}). primarySuccess=${summary.totals.primarySuccess}, safeSuccess=${summary.totals.safeSuccess}, failed=${summary.totals.failed}`
  );
  log(
    `Quality totals: evaluated=${summary.totals.qualityEvaluated}, pass=${summary.totals.qualityPass}, fail=${summary.totals.qualityFail}, scorerUnavailable=${summary.totals.qualityScorerUnavailable}`
  );
  log(
    `Primary rescue totals: triggered=${summary.totals.primaryRescueTriggered}, success=${summary.totals.primaryRescueSuccess}, chosen=${summary.totals.primaryRescueChosen}`
  );
  log(`Rate-limit pressure prompt failures: ${summary.totals.rateLimitPressureFailures}`);
  log(
    `Adaptive metrics: completionRate=${summary.metrics.completionRate}, rateLimitPressureRate=${summary.metrics.rateLimitPressureRate},`
    + ` avgAttemptDurationMs=${summary.metrics.avgAttemptDurationMs}, densityMin=${summary.metrics.physicsDensityRatio.min},`
    + ` densityAvg=${summary.metrics.physicsDensityRatio.avg}, bannedTermViolations=${summary.metrics.bannedTermViolations}`
  );
  log(`Summary: ${summaryPath}`);

  if (summary.runState.status === 'paused_pressure') {
    process.exitCode = 75;
    return;
  }
  if (summary.runState.status === 'failed') {
    throw new Error(summary.runState.failureReason || 'Run aborted by rate-limit pressure guardrail');
  }
}

main().catch(async error => {
  const failureMessage = error instanceof Error ? error.message : String(error);
  try {
    await persistActiveRunState('failed', { failureReason: failureMessage });
  } catch {
    // Best-effort run-state persistence on failure.
  }
  const detailed = error instanceof Error ? `${error.message}\n${error.stack || ''}` : String(error);
  console.error(detailed);
  process.exit(1);
});
