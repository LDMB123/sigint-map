#!/usr/bin/env node

/**
 * V29 APEX - Two-pass, multi-turn refinement for max photorealism
 *
 * Pass A: scene + camera + light transport + skin physics + core attire
 * Pass B: garment microstructure + swimwear physics + imperfections, preserving pass A
 *
 * Model: gemini-3-pro-image-preview
 * Output: 1K, 4:5 (physics-max, ~1450 words)
 * Word target per pass: 1400-1500
 */

import { GoogleAuth } from 'google-auth-library';
import { spawnSync } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT || 'gen-lang-client-0925343693';
const LOCATION = 'global';
const MODEL = 'gemini-3-pro-image-preview';
const ENDPOINT = `https://aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/${MODEL}:generateContent`;
const PASS_B_MODEL = process.env.PASS_B_MODEL || 'gemini-2.5-flash-image';
const PASS_B_ENDPOINT = `https://aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/${PASS_B_MODEL}:generateContent`;
const PASS_B_REUSE_PASSA_MODEL_PARTS = process.env.PASS_B_REUSE_PASSA_MODEL_PARTS
  ? process.env.PASS_B_REUSE_PASSA_MODEL_PARTS === '1'
  : (PASS_B_MODEL === MODEL);
const SCORER_MODEL = process.env.SCORER_MODEL || 'gemini-2.5-flash';
const SCORER_ENDPOINT = `https://aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/${SCORER_MODEL}:generateContent`;
const OUTPUT_DIR = process.env.OUTPUT_DIR || path.join(process.env.HOME, 'nanobanana-output', 'pool-luxe-lace-v1');
const PASSA_DIR = path.join(OUTPUT_DIR, 'passA');
const SIMPLE_STAGE_ROOT = String(process.env.SIMPLE_STAGE_ROOT || '').trim();
const DEFAULT_INPUT_IMAGE = '/Users/louisherman/Documents/IMG_4385.jpeg';
const REQUIRE_EXPLICIT_INPUT_IMAGE = process.env.REQUIRE_EXPLICIT_INPUT_IMAGE !== '0';
const INPUT_IMAGE = process.argv[2] || (REQUIRE_EXPLICIT_INPUT_IMAGE ? '' : DEFAULT_INPUT_IMAGE);
const MIN_WAIT_FLOOR_S = Math.max(1, parseInt(process.env.MIN_WAIT_FLOOR_S || '5', 10));
const RETRY_WAIT_S = Math.max(MIN_WAIT_FLOOR_S, parseInt(process.env.RETRY_WAIT_S || '91', 10));
const CACHE_REUSE_WAIT_S = Math.max(MIN_WAIT_FLOOR_S, parseInt(process.env.CACHE_REUSE_WAIT_S || '90', 10));
const MAX_CONCEPT_ATTEMPTS = parseInt(process.env.MAX_CONCEPT_ATTEMPTS || '5', 10);
const RATE_LIMIT_BACKOFF_MIN_S = parseInt(process.env.RATE_LIMIT_BACKOFF_MIN_S || '120', 10);
const RATE_LIMIT_BACKOFF_MAX_S = parseInt(process.env.RATE_LIMIT_BACKOFF_MAX_S || '180', 10);
const REQUEST_PACING_BASE_S = Math.max(MIN_WAIT_FLOOR_S, parseFloat(process.env.REQUEST_PACING_BASE_S || '90'));
const REQUEST_PACING_MAX_S = Math.max(REQUEST_PACING_BASE_S, parseFloat(process.env.REQUEST_PACING_MAX_S || '180'));
const MIN_API_ATTEMPT_INTERVAL_S = Math.max(
  MIN_WAIT_FLOOR_S,
  parseInt(process.env.MIN_API_ATTEMPT_INTERVAL_S || '90', 10)
);
const RATE_LIMIT_BACKOFF_STEP_S = Math.max(0, parseInt(process.env.RATE_LIMIT_BACKOFF_STEP_S || '45', 10));
const RATE_LIMIT_STREAK_STEP_S = Math.max(0, parseInt(process.env.RATE_LIMIT_STREAK_STEP_S || '20', 10));
const RATE_LIMIT_MAX_BACKOFF_S = Math.max(1, parseInt(process.env.RATE_LIMIT_MAX_BACKOFF_S || '64', 10));
const RATE_LIMIT_RETRY_DEADLINE_S = Math.max(30, parseInt(process.env.RATE_LIMIT_RETRY_DEADLINE_S || '600', 10));
const RATE_LIMIT_CONSECUTIVE_FAILFAST = Math.max(1, parseInt(process.env.RATE_LIMIT_CONSECUTIVE_FAILFAST || '3', 10));
const RATE_LIMIT_PROFILE_NARROW_STREAK = Math.max(1, parseInt(process.env.RATE_LIMIT_PROFILE_NARROW_STREAK || '2', 10));
const RATE_LIMIT_FORCE_CACHE_STREAK = Math.max(
  RATE_LIMIT_PROFILE_NARROW_STREAK,
  parseInt(process.env.RATE_LIMIT_FORCE_CACHE_STREAK || '3', 10)
);
const HEARTBEAT_INTERVAL_S = Math.max(5, parseInt(process.env.HEARTBEAT_INTERVAL_S || '20', 10));
const AUTH_TIMEOUT_MS = Math.max(5000, parseInt(process.env.AUTH_TIMEOUT_MS || '45000', 10));
const AUTH_RETRIES_MAX = Math.max(0, parseInt(process.env.AUTH_RETRIES_MAX || '2', 10));
const AUTH_RETRY_WAIT_S = Math.max(1, parseInt(process.env.AUTH_RETRY_WAIT_S || '8', 10));
const ACCESS_TOKEN_EARLY_REFRESH_S = Math.max(0, parseInt(process.env.ACCESS_TOKEN_EARLY_REFRESH_S || '90', 10));
const REUSE_PASSA_ON_FAILURE = process.env.REUSE_PASSA_ON_FAILURE !== '0';
const MULTIMODAL_FILE_FIRST = process.env.MULTIMODAL_FILE_FIRST !== '0';
const FRONTIER_MODE = process.env.FRONTIER_MODE === '1';
const FRONTIER_BEAM_ORDER = (process.env.FRONTIER_BEAM_ORDER || 'intimate,balanced,clean')
  .split(',')
  .map(s => s.trim().toLowerCase())
  .filter(Boolean);
const SIMPLE_PROFILE_MODE = process.env.SIMPLE_PROFILE_MODE === '1';
const SIMPLE_STAGE_ENABLED = SIMPLE_PROFILE_MODE && SIMPLE_STAGE_ROOT.length > 0;
const FRONTIER_ACCEPT_SCORE = parseFloat(process.env.FRONTIER_ACCEPT_SCORE || '8.6');
const DUAL_STRATEGY_MODE = process.env.DUAL_STRATEGY_MODE
  ? process.env.DUAL_STRATEGY_MODE === '1'
  : FRONTIER_MODE;
const AB_AUDIT_FILE = path.join(OUTPUT_DIR, 'ab-comparison-audit.jsonl');
const AB_SUMMARY_FILE = path.join(OUTPUT_DIR, 'ab-comparison-summary.json');
const LEARNING_AUDIT_FILE = path.join(OUTPUT_DIR, 'learning-audit.jsonl');
const LEARNING_PLAN_FILE = path.join(OUTPUT_DIR, 'learning-plan.json');
const TARGET_QUALITY_GAIN_BASE_RAW = parseFloat(process.env.TARGET_QUALITY_GAIN_PCT || '50');
const TARGET_QUALITY_GAIN_BASE_PCT = Number.isFinite(TARGET_QUALITY_GAIN_BASE_RAW)
  ? TARGET_QUALITY_GAIN_BASE_RAW
  : 50;
const QUALITY_UPLIFT_MULTIPLIER_RAW = parseFloat(process.env.QUALITY_UPLIFT_MULTIPLIER || '1.0');
const QUALITY_UPLIFT_MULTIPLIER = Math.max(
  1.0,
  Number.isFinite(QUALITY_UPLIFT_MULTIPLIER_RAW) ? QUALITY_UPLIFT_MULTIPLIER_RAW : 1.0
);
const TARGET_QUALITY_GAIN_PCT = Math.max(0, TARGET_QUALITY_GAIN_BASE_PCT * QUALITY_UPLIFT_MULTIPLIER);
const INITIAL_ATTEMPT_HEADROOM_BOOST_PCT = Math.max(
  0,
  parseFloat(process.env.INITIAL_ATTEMPT_HEADROOM_BOOST_PCT || '50')
);
const INITIAL_ATTEMPT_HEADROOM_TARGET_PCT = Math.max(
  0,
  TARGET_QUALITY_GAIN_PCT * (1 + (INITIAL_ATTEMPT_HEADROOM_BOOST_PCT / 100))
);
const QUALITY_SCORE_CEILING = Math.max(9.0, parseFloat(process.env.QUALITY_SCORE_CEILING || '10'));
const C_GAIN_TARGET_HARD_GATE = process.env.C_GAIN_TARGET_HARD_GATE !== '0';
const STRATEGY_KEYS = ['A', 'B', 'C'];
const LESSON_RECENCY_WINDOW = Math.max(8, parseInt(process.env.LESSON_RECENCY_WINDOW || '24', 10));
const LESSON_MAX_PER_PROMPT = Math.max(8, parseInt(process.env.LESSON_MAX_PER_PROMPT || '12', 10));
const C_STRATEGY_LESSON_MAX = Math.max(6, parseInt(process.env.C_STRATEGY_LESSON_MAX || '10', 10));
const DEFAULT_IMAGE_SIZE = String(process.env.DEFAULT_IMAGE_SIZE || '4K').trim();
const C_IMAGE_SIZE = String(process.env.C_IMAGE_SIZE || '4K').trim();
const FORCE_4K_IMAGE_SIZE = process.env.FORCE_4K_IMAGE_SIZE !== '0';
const FOURK_MIN_ATTEMPT_INTERVAL_S = Math.max(
  MIN_WAIT_FLOOR_S,
  parseInt(process.env.FOURK_MIN_ATTEMPT_INTERVAL_S || '91', 10)
);
const NORMALIZE_OUTPUT_TO_TARGET_4K = process.env.NORMALIZE_OUTPUT_TO_TARGET_4K !== '0';
const IMAGE_SIZE_FALLBACK = String(process.env.IMAGE_SIZE_FALLBACK || '2K').trim();
const ENABLE_IMAGE_SIZE_FALLBACK = process.env.ENABLE_IMAGE_SIZE_FALLBACK === '1';
const ENFORCE_RENDERED_4K = process.env.ENFORCE_RENDERED_4K !== '0';
const RENDER_TARGET_WIDTH = Math.max(1, parseInt(process.env.RENDER_TARGET_WIDTH || '3072', 10));
const RENDER_TARGET_HEIGHT = Math.max(1, parseInt(process.env.RENDER_TARGET_HEIGHT || '3840', 10));
const RENDER_DIMENSION_STRICT_EXACT = process.env.RENDER_DIMENSION_STRICT_EXACT === '1';
const RENDER_TARGET_ASPECT_RATIO = RENDER_TARGET_WIDTH / RENDER_TARGET_HEIGHT;
const RENDER_TARGET_ASPECT_TOLERANCE = Math.max(
  0.0,
  parseFloat(process.env.RENDER_TARGET_ASPECT_TOLERANCE || '0.02')
);
const ENFORCE_NATIVE_4K_DIMS = process.env.ENFORCE_NATIVE_4K_DIMS === '1';
const NATIVE_4K_EXPECTED_WIDTH = Math.max(1, parseInt(process.env.NATIVE_4K_EXPECTED_WIDTH || '3712', 10));
const NATIVE_4K_EXPECTED_HEIGHT = Math.max(1, parseInt(process.env.NATIVE_4K_EXPECTED_HEIGHT || '4608', 10));
const RENDER_DIMENSION_CHECK_TIMEOUT_MS = Math.max(1000, parseInt(process.env.RENDER_DIMENSION_CHECK_TIMEOUT_MS || '6000', 10));
const RENDER_DIMENSION_TMP_DIR = path.join(OUTPUT_DIR, '.render-dimension-cache');
const ENABLE_C_HIGH_RES = process.env.ENABLE_C_HIGH_RES !== '0';
const PROFILE_HISTORY_WINDOW = Math.max(12, parseInt(process.env.PROFILE_HISTORY_WINDOW || '40', 10));
const WINNER_TIE_BAND = Math.max(0.05, parseFloat(process.env.WINNER_TIE_BAND || '0.12'));
const IDENTITY_GUARDRAIL = Math.max(8.5, parseFloat(process.env.IDENTITY_GUARDRAIL || '9.0'));
const COMPLIANCE_GUARDRAIL = Math.max(8.5, parseFloat(process.env.COMPLIANCE_GUARDRAIL || '9.0'));
const PASSA_IDENTITY_SELECT_FLOOR = Math.max(
  7.5,
  Math.min(
    IDENTITY_GUARDRAIL,
    parseFloat(process.env.PASSA_IDENTITY_SELECT_FLOOR || String(Math.max(7.5, IDENTITY_GUARDRAIL - 0.2)))
  )
);
const PASSA_COMPLIANCE_SELECT_FLOOR = Math.max(
  8.0,
  Math.min(
    COMPLIANCE_GUARDRAIL,
    parseFloat(process.env.PASSA_COMPLIANCE_SELECT_FLOOR || String(Math.max(8.0, COMPLIANCE_GUARDRAIL - 0.2)))
  )
);
const ATTIRE_GUARDRAIL = Math.max(7.5, Math.min(10, parseFloat(process.env.ATTIRE_GUARDRAIL || '8.8')));
const PASSA_ATTIRE_SELECT_FLOOR = Math.max(
  6.5,
  Math.min(
    ATTIRE_GUARDRAIL,
    parseFloat(process.env.PASSA_ATTIRE_SELECT_FLOOR || String(Math.max(7.8, ATTIRE_GUARDRAIL - 0.3)))
  )
);
const PASSB_ATTIRE_SELECT_FLOOR = Math.max(
  6.5,
  Math.min(
    ATTIRE_GUARDRAIL,
    parseFloat(process.env.PASSB_ATTIRE_SELECT_FLOOR || String(Math.max(7.6, ATTIRE_GUARDRAIL - 0.4)))
  )
);
const MODEL_POLICY_CLEAR_COMPLIANCE_FLOOR = Math.max(
  0,
  Math.min(10, parseFloat(process.env.MODEL_POLICY_CLEAR_COMPLIANCE_FLOOR || '6.0'))
);
const REFERENCE_IDENTITY_SIGNATURE = String(process.env.REFERENCE_IDENTITY_SIGNATURE || '').trim();
const REFERENCE_IDENTITY_NEGATIVE = String(process.env.REFERENCE_IDENTITY_NEGATIVE || '').trim();
const C_PROFILE_FOLLOW_AB = process.env.C_PROFILE_FOLLOW_AB === '1';
const ENABLE_AB_PHASE2_BOUNDARY = process.env.ENABLE_AB_PHASE2_BOUNDARY !== '0';
const AB_PHASE2_INTENSITY = Math.max(1.05, parseFloat(process.env.AB_PHASE2_INTENSITY || '1.2'));
const HAIL_MARY_MODE = process.env.HAIL_MARY_MODE !== '0';
const PHASE2_VARIANTS_PER_ROUND = Math.max(1, parseInt(process.env.PHASE2_VARIANTS_PER_ROUND || '2', 10));
const PHASE2_VARIANT_INTENSITY_STEP = Math.max(0.02, parseFloat(process.env.PHASE2_VARIANT_INTENSITY_STEP || '0.08'));
const AB_ITERATION_ROUNDS_MAX = Math.max(1, parseInt(process.env.AB_ITERATION_ROUNDS_MAX || '2', 10));
const AB_ITERATION_MIN_GAIN = Math.max(0.01, parseFloat(process.env.AB_ITERATION_MIN_GAIN || '0.08'));
const APPROACH_SELF_ITERATION_ROUNDS_MAX = Math.max(0, parseInt(process.env.APPROACH_SELF_ITERATION_ROUNDS_MAX || '1', 10));
const APPROACH_SELF_MIN_GAIN = Math.max(0.01, parseFloat(process.env.APPROACH_SELF_MIN_GAIN || '0.06'));
const C_SELF_ITERATION_ROUNDS_MAX = Math.max(0, parseInt(process.env.C_SELF_ITERATION_ROUNDS_MAX || '1', 10));
const C_SELF_MIN_GAIN = Math.max(0.01, parseFloat(process.env.C_SELF_MIN_GAIN || '0.05'));
const FINAL_AUDIT_BOOST_ROUNDS_MAX = Math.max(0, parseInt(process.env.FINAL_AUDIT_BOOST_ROUNDS_MAX || '1', 10));
const FINAL_AUDIT_BOOST_MIN_GAIN = Math.max(0.01, parseFloat(process.env.FINAL_AUDIT_BOOST_MIN_GAIN || '0.04'));
const FINAL_AUDIT_SHORTFALL_STEP = Math.max(0.05, parseFloat(process.env.FINAL_AUDIT_SHORTFALL_STEP || '0.35'));
const FINAL_AUDIT_SHORTFALL_EXTRA_ROUNDS_MAX = Math.max(0, parseInt(process.env.FINAL_AUDIT_SHORTFALL_EXTRA_ROUNDS_MAX || '2', 10));
const DARING_BOOST_LEVEL = Math.max(0, Math.min(2, parseInt(process.env.DARING_BOOST_LEVEL || '1', 10)));
const PHYSICS_BREAKTHROUGH_MULTIPLIER = Math.max(1, parseFloat(process.env.PHYSICS_BREAKTHROUGH_MULTIPLIER || '3'));
const PHYSICS_SCORE_FLOOR = Math.max(0, Math.min(10, parseFloat(process.env.PHYSICS_SCORE_FLOOR || '8.6')));
const PHYSICS_BREAKTHROUGH_PENALTY_GAIN = Math.max(0, parseFloat(process.env.PHYSICS_BREAKTHROUGH_PENALTY_GAIN || '0.55'));
const ATTIRE_SCORE_FLOOR = Math.max(0, Math.min(10, parseFloat(process.env.ATTIRE_SCORE_FLOOR || '8.8')));
const ATTIRE_PENALTY_GAIN = Math.max(0, parseFloat(process.env.ATTIRE_PENALTY_GAIN || '0.8'));
const PROMPT_SKILLSTACK_ENABLED = process.env.PROMPT_SKILLSTACK_ENABLED !== '0';
const PROMPT_BREAKTHROUGH_LEVEL = Math.max(1, Math.min(3, parseInt(process.env.PROMPT_BREAKTHROUGH_LEVEL || '3', 10)));
const PROMPT_FAILURE_HINTS_MAX = Math.max(2, Math.min(8, parseInt(process.env.PROMPT_FAILURE_HINTS_MAX || '4', 10)));
const PASS_A_PRIMARY_PROMPT_STYLE = String(process.env.PASS_A_PRIMARY_PROMPT_STYLE || 'compact').trim().toLowerCase();
const PASS_B_PRIMARY_PROMPT_STYLE = String(process.env.PASS_B_PRIMARY_PROMPT_STYLE || 'delta').trim().toLowerCase();
const BOLD_EDITORIAL_MODE = process.env.BOLD_EDITORIAL_MODE === '1';
const BOLD_EDITORIAL_INTENSITY = Math.max(1, Math.min(3, parseInt(process.env.BOLD_EDITORIAL_INTENSITY || '2', 10)));
const BOLD_MATRIX_EXPORT = process.env.BOLD_MATRIX_EXPORT !== '0';
const BOLD_MATRIX_FILE = path.join(OUTPUT_DIR, 'bold-editorial-experiment-matrix.json');
const HAIL_MARY_INTIMATE_FIRST = process.env.HAIL_MARY_INTIMATE_FIRST
  ? process.env.HAIL_MARY_INTIMATE_FIRST === '1'
  : !(BOLD_EDITORIAL_MODE && BOLD_EDITORIAL_INTENSITY >= 3);
const PROFILE_POLICY_BLOCK_PENALTY = Math.max(0, parseFloat(process.env.PROFILE_POLICY_BLOCK_PENALTY || '1.15'));
const PROFILE_HARD_BLOCK_PENALTY = Math.max(
  PROFILE_POLICY_BLOCK_PENALTY,
  parseFloat(process.env.PROFILE_HARD_BLOCK_PENALTY || '1.85')
);
const PROFILE_SAFETY_BLOCK_PENALTY = Math.max(
  PROFILE_POLICY_BLOCK_PENALTY,
  parseFloat(process.env.PROFILE_SAFETY_BLOCK_PENALTY || '1.45')
);
const PASS_B_DELTA_BEAMS = Math.max(1, Math.min(3, parseInt(process.env.PASS_B_DELTA_BEAMS || '2', 10)));
const PASS_B_USE_SCORER_RERANK = process.env.PASS_B_USE_SCORER_RERANK !== '0';
const PASS_B_BEAM_MIN_SCORE = Math.max(0, Math.min(10, parseFloat(process.env.PASS_B_BEAM_MIN_SCORE || '6.4')));
const PASS_B_REQUIRE_PASSA_AUDIT = process.env.PASS_B_REQUIRE_PASSA_AUDIT !== '0';
const PASS_B_PASSA_AUDIT_HINTS = Math.max(1, Math.min(5, parseInt(process.env.PASS_B_PASSA_AUDIT_HINTS || '3', 10)));
const PASS_B_PASSA_GAIN_TARGET_PCT = Math.max(0, parseFloat(process.env.PASS_B_PASSA_GAIN_TARGET_PCT || '50'));
const PASS_B_PASSA_GAIN_MAX_RETRIES = Math.max(0, Math.min(4, parseInt(process.env.PASS_B_PASSA_GAIN_MAX_RETRIES || '2', 10)));
const PASS_B_PASSA_GAIN_MIN_STEP = Math.max(0, parseFloat(process.env.PASS_B_PASSA_GAIN_MIN_STEP || '0.01'));
const PASS_B_PASSA_GAIN_HARD_GATE = process.env.PASS_B_PASSA_GAIN_HARD_GATE === '1';
const PASS_B_NO_REGRESSION_GUARD = process.env.PASS_B_NO_REGRESSION_GUARD !== '0';
const PASS_B_NO_REGRESSION_TOL = Math.max(0, parseFloat(process.env.PASS_B_NO_REGRESSION_TOL || '0.05'));
const GROUND_BREAKTHROUGH_ENABLED = process.env.GROUND_BREAKTHROUGH_ENABLED !== '0';
const GROUND_BREAKTHROUGH_PUSH_MULTIPLIER = Math.max(1.0, parseFloat(process.env.GROUND_BREAKTHROUGH_PUSH_MULTIPLIER || '2.0'));
const GROUND_BREAKTHROUGH_TRIGGER_SCORE = Math.max(0, Math.min(10, parseFloat(process.env.GROUND_BREAKTHROUGH_TRIGGER_SCORE || '9.65')));
const GROUND_BREAKTHROUGH_MAX_REFINES = Math.max(0, Math.min(3, parseInt(process.env.GROUND_BREAKTHROUGH_MAX_REFINES || '1', 10)));
const GROUND_BREAKTHROUGH_MIN_GAIN = Math.max(0, parseFloat(process.env.GROUND_BREAKTHROUGH_MIN_GAIN || '0.03'));
const LAST_PASS_REDO_ENABLED = process.env.LAST_PASS_REDO_ENABLED !== '0';
const LAST_PASS_REDO_ROUNDS_MAX = Math.max(0, parseInt(process.env.LAST_PASS_REDO_ROUNDS_MAX || '1', 10));
const LAST_PASS_REDO_TIE_BAND_ADD = Math.max(0.0, parseFloat(process.env.LAST_PASS_REDO_TIE_BAND_ADD || '0.08'));
const LAST_PASS_REDO_SHORTFALL_TRIGGER = Math.max(0.0, parseFloat(process.env.LAST_PASS_REDO_SHORTFALL_TRIGGER || '0.15'));
const HARDEN_ITERATION_PROCESS = process.env.HARDEN_ITERATION_PROCESS !== '0';
const HARDEN_MAX_EXTRA_PHASE2_VARIANTS = Math.max(0, parseInt(process.env.HARDEN_MAX_EXTRA_PHASE2_VARIANTS || '2', 10));
const HARDEN_MAX_EXTRA_ROUNDS = Math.max(0, parseInt(process.env.HARDEN_MAX_EXTRA_ROUNDS || '3', 10));
const HARDEN_MAX_EXTRA_SELF_ROUNDS = Math.max(0, parseInt(process.env.HARDEN_MAX_EXTRA_SELF_ROUNDS || '2', 10));
const HARDEN_MAX_EXTRA_LAST_PASS_ROUNDS = Math.max(0, parseInt(process.env.HARDEN_MAX_EXTRA_LAST_PASS_ROUNDS || '2', 10));
const QUALITY_ESCALATION_ENABLE = process.env.QUALITY_ESCALATION_ENABLE !== '0';
const QUALITY_ESCALATION_SCORE_TRIGGER = Math.max(8.5, parseFloat(process.env.QUALITY_ESCALATION_SCORE_TRIGGER || '9.35'));
const QUALITY_ESCALATION_TIE_TRIGGER = Math.max(0.05, parseFloat(process.env.QUALITY_ESCALATION_TIE_TRIGGER || '0.18'));
const QUALITY_ESCALATION_MAX_EXTRA_ROUNDS = Math.max(0, parseInt(process.env.QUALITY_ESCALATION_MAX_EXTRA_ROUNDS || '2', 10));
const QUALITY_ESCALATION_MAX_EXTRA_VARIANTS = Math.max(0, parseInt(process.env.QUALITY_ESCALATION_MAX_EXTRA_VARIANTS || '2', 10));
const PHASED_C_MAX_RETRIES = Math.max(1, parseInt(process.env.PHASED_C_MAX_RETRIES || '3', 10));
const PHASED_C_FORCE_PHASE2 = process.env.PHASED_C_FORCE_PHASE2 !== '0';
const PHASED_C_RETRY_WAIT_S = Math.max(0, parseInt(process.env.PHASED_C_RETRY_WAIT_S || '45', 10));
const PHASED_C_SKIP_POST_PASSB_PHASE2 = process.env.PHASED_C_SKIP_POST_PASSB_PHASE2 !== '0';
const PHASED_C_RESCUE_ENABLE = process.env.PHASED_C_RESCUE_ENABLE !== '0';
const PHASED_C_RESCUE_BASE_ROUNDS = Math.max(0, parseInt(
  process.env.PHASED_C_RESCUE_BASE_ROUNDS || String(Math.max(1, FINAL_AUDIT_BOOST_ROUNDS_MAX)),
  10
));
const PHASED_C_RESCUE_EXTRA_ROUNDS_MAX = Math.max(0, parseInt(process.env.PHASED_C_RESCUE_EXTRA_ROUNDS_MAX || '3', 10));
const PHASED_C_RESCUE_SHORTFALL_STEP_PCT = Math.max(1, parseFloat(process.env.PHASED_C_RESCUE_SHORTFALL_STEP_PCT || '10'));
const PHASED_C_RESCUE_MIN_GAIN = Math.max(0.01, parseFloat(process.env.PHASED_C_RESCUE_MIN_GAIN || '0.01'));
const PHASED_C_NEAR_MISS_MARGIN_PCT = Math.max(0, parseFloat(process.env.PHASED_C_NEAR_MISS_MARGIN_PCT || '1.5'));
const PHASED_C_NEAR_MISS_EXTRA_ROUNDS = Math.max(0, parseInt(process.env.PHASED_C_NEAR_MISS_EXTRA_ROUNDS || '1', 10));
const PHASED_C_NEAR_MISS_MIN_GAIN = Math.max(0.001, parseFloat(process.env.PHASED_C_NEAR_MISS_MIN_GAIN || '0.002'));
const PHASED_DEFER_SAFETY_FAILURES = process.env.PHASED_DEFER_SAFETY_FAILURES !== '0';
const PHASED_SAFETY_REVISIT_MAX = Math.max(0, parseInt(process.env.PHASED_SAFETY_REVISIT_MAX || '1', 10));
const ITER_ACCEPT_OVERALL_TOL = Math.max(0.0, parseFloat(process.env.ITER_ACCEPT_OVERALL_TOL || '0.02'));
const ITER_ACCEPT_METRIC_TOL = Math.max(0.0, parseFloat(process.env.ITER_ACCEPT_METRIC_TOL || '0.05'));
const LOCK_AB_VARIATION = process.env.LOCK_AB_VARIATION !== '0';
const LOCK_C_VARIATION_TO_AB = process.env.LOCK_C_VARIATION_TO_AB !== '0';
const INITIAL_QUALITY_TARGET_MULTIPLIER = Math.max(1.0, parseFloat(process.env.INITIAL_QUALITY_TARGET_MULTIPLIER || '3.0'));
const REVISED_QUALITY_TARGET_MULTIPLIER = Math.max(1.0, parseFloat(process.env.REVISED_QUALITY_TARGET_MULTIPLIER || '1.5'));
const FINAL_QUALITY_TARGET_MULTIPLIER = Math.max(1.0, parseFloat(process.env.FINAL_QUALITY_TARGET_MULTIPLIER || '3.0'));
const MIN_FINAL_MULTIPLIER_GATE = Math.max(1.0, parseFloat(process.env.MIN_FINAL_MULTIPLIER_GATE || '2.0'));
const STRICT_QUALITY_GATE = process.env.STRICT_QUALITY_GATE !== '0';
const RESUME_SKIP_COMPLETED_AB = process.env.RESUME_SKIP_COMPLETED_AB !== '0';
const PHASED_BATCH_MODE = process.env.PHASED_BATCH_MODE === '1';
const PHASED_STRICT_ORDER = process.env.PHASED_STRICT_ORDER !== '0';
const PHASE_A_RESUME_FROM_NUM = Math.max(0, parseInt(process.env.PHASE_A_RESUME_FROM_NUM || '0', 10));
const SIMPLE_INLINE_STAGE_WRITES = SIMPLE_STAGE_ENABLED && !PHASED_BATCH_MODE;
const SIMPLE_PHASE_STAGE_WRITES = SIMPLE_STAGE_ENABLED && PHASED_BATCH_MODE;
const RATE_LIMIT_RETRIES_MAX = parseInt(process.env.RATE_LIMIT_RETRIES_MAX || '6', 10);
const API_REQUEST_TIMEOUT_MS = parseInt(process.env.API_REQUEST_TIMEOUT_MS || '120000', 10);
const NETWORK_RETRIES_MAX = parseInt(process.env.NETWORK_RETRIES_MAX || '1', 10);
const NETWORK_RETRY_WAIT_S = parseInt(process.env.NETWORK_RETRY_WAIT_S || '15', 10);
const SERVER_RETRIES_MAX = parseInt(process.env.SERVER_RETRIES_MAX || '1', 10);
const SERVER_RETRY_WAIT_S = parseInt(process.env.SERVER_RETRY_WAIT_S || '30', 10);
const FORCE_ULTRA_PASS_A = process.env.FORCE_ULTRA_PASS_A === '1';
const INCLUDE_TEXT_MODALITY = process.env.INCLUDE_TEXT_MODALITY !== '0';
const FORCE_SAFE_MODE = process.env.FORCE_SAFE_MODE === '1';
const SKIP_EXISTING_OUTPUTS = process.env.SKIP_EXISTING_OUTPUTS !== '0';
const FACE_VERIFY_ENABLED = process.env.FACE_VERIFY_ENABLED !== '0';
const FACE_VERIFY_VERBOSE = process.env.FACE_VERIFY_VERBOSE === '1';
const FACE_VERIFY_FAIL_CLOSED = process.env.FACE_VERIFY_FAIL_CLOSED !== '0';
const FACE_VERIFY_MAX_DISTANCE = Math.max(0.01, parseFloat(process.env.FACE_VERIFY_MAX_DISTANCE || '0.82'));
const FACE_VERIFY_TIMEOUT_MS = Math.max(1000, parseInt(process.env.FACE_VERIFY_TIMEOUT_MS || '8000', 10));
const FACE_VERIFY_HELPER_PATH = process.env.FACE_VERIFY_HELPER_PATH
  ? path.resolve(String(process.env.FACE_VERIFY_HELPER_PATH))
  : fileURLToPath(new URL('./vegas-face-identity-vision.swift', import.meta.url));
const FACE_VERIFY_TMP_DIR = path.join(OUTPUT_DIR, '.face-identity-cache');
const ARCHIVE_IMAGE_ATTEMPTS = process.env.ARCHIVE_IMAGE_ATTEMPTS !== '0';
const ATTEMPT_ARCHIVE_LABEL = String(process.env.ATTEMPT_ARCHIVE_LABEL || '').trim()
  || new Date().toISOString().replace(/[:.]/g, '-');
const STAGE_IMMUTABLE_WRITES = process.env.STAGE_IMMUTABLE_WRITES !== '0';
const STAGE_ARTIFACT_RUN_LABEL = String(ATTEMPT_ARCHIVE_LABEL || 'run')
  .toLowerCase()
  .replace(/[^a-z0-9._-]+/g, '-')
  .replace(/^-+/, '')
  .replace(/-+$/, '') || 'run';
const ATTEMPTS_ROOT_DIR = path.join(OUTPUT_DIR, 'attempts');
const ATTEMPT_RUN_DIR = path.join(ATTEMPTS_ROOT_DIR, ATTEMPT_ARCHIVE_LABEL);
const ATTEMPTS_MANIFEST_FILE = path.join(OUTPUT_DIR, 'attempts-manifest.jsonl');

const auth = new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/cloud-platform'] });
await fs.mkdir(OUTPUT_DIR, { recursive: true });
await fs.mkdir(PASSA_DIR, { recursive: true });
if (ARCHIVE_IMAGE_ATTEMPTS) {
  await fs.mkdir(ATTEMPT_RUN_DIR, { recursive: true });
}

let GLOBAL_RATE_LIMIT_STREAK = 0;
let GLOBAL_NEXT_REQUEST_AT_MS = 0;
let GLOBAL_LAST_API_ATTEMPT_ENDED_AT_MS = 0;
let CURRENT_CONCEPT_ATTEMPT = 1;
let CURRENT_CONCEPT_MAX_ATTEMPTS = MAX_CONCEPT_ATTEMPTS;
let AUTH_CLIENT_PROMISE = null;
let CACHED_ACCESS_TOKEN = null;
let ATTEMPT_ARCHIVE_SEQ = 0;

function currentHardeningLevel() {
  if (!HARDEN_ITERATION_PROCESS) return 0;
  return Math.max(0, (Number(CURRENT_CONCEPT_ATTEMPT) || 1) - 1);
}

function effectivePhase2VariantsPerRound() {
  return Math.max(
    1,
    PHASE2_VARIANTS_PER_ROUND + Math.min(HARDEN_MAX_EXTRA_PHASE2_VARIANTS, currentHardeningLevel())
  );
}

async function waitWithHeartbeat(totalSeconds, label) {
  const total = Math.max(0, Math.ceil(Number(totalSeconds) || 0));
  if (total === 0) return;
  if (total <= HEARTBEAT_INTERVAL_S) {
    await new Promise(r => setTimeout(r, total * 1000));
    return;
  }
  let elapsed = 0;
  while (elapsed < total) {
    const step = Math.min(HEARTBEAT_INTERVAL_S, total - elapsed);
    await new Promise(r => setTimeout(r, step * 1000));
    elapsed += step;
    const remaining = total - elapsed;
    if (remaining > 0) {
      console.log(`WAIT ${label}: ${elapsed}s elapsed, ${remaining}s remaining`);
    }
  }
}

function withTimeout(promiseFactory, timeoutMs, label) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      reject(new Error(`${label} timed out after ${timeoutMs}ms`));
    }, timeoutMs);
    Promise.resolve()
      .then(() => promiseFactory())
      .then(result => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(result);
      })
      .catch(err => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        reject(err);
      });
  });
}

function decodeJwtExpiryMs(tokenValue) {
  if (typeof tokenValue !== 'string') return null;
  const parts = tokenValue.split('.');
  if (parts.length < 2) return null;
  try {
    const normalized = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(Buffer.from(normalized, 'base64').toString('utf8'));
    const exp = Number(payload?.exp);
    if (!Number.isFinite(exp) || exp <= 0) return null;
    return exp * 1000;
  } catch {
    return null;
  }
}

function extractTokenValue(tokenResponse) {
  if (typeof tokenResponse === 'string') return tokenResponse;
  if (!tokenResponse || typeof tokenResponse !== 'object') return null;
  if (typeof tokenResponse.token === 'string' && tokenResponse.token.length > 0) return tokenResponse.token;
  if (typeof tokenResponse.access_token === 'string' && tokenResponse.access_token.length > 0) return tokenResponse.access_token;
  return null;
}

function extractTokenExpiryMs(tokenResponse, tokenValue) {
  const explicitExpiry = Number(
    tokenResponse?.res?.data?.expiry_date
    || tokenResponse?.expiry_date
    || tokenResponse?.expiryDate
    || tokenResponse?.expires_at
    || tokenResponse?.expiresAt
  );
  if (Number.isFinite(explicitExpiry) && explicitExpiry > Date.now()) {
    return explicitExpiry;
  }
  const jwtExpiry = decodeJwtExpiryMs(tokenValue);
  if (jwtExpiry && jwtExpiry > Date.now()) return jwtExpiry;
  return Date.now() + (55 * 60 * 1000);
}

function hasUsableCachedToken() {
  if (!CACHED_ACCESS_TOKEN?.token || !CACHED_ACCESS_TOKEN?.expiresAtMs) return false;
  const refreshThresholdMs = ACCESS_TOKEN_EARLY_REFRESH_S * 1000;
  return (CACHED_ACCESS_TOKEN.expiresAtMs - refreshThresholdMs) > Date.now();
}

async function getAuthClientWithTimeout() {
  if (!AUTH_CLIENT_PROMISE) {
    AUTH_CLIENT_PROMISE = withTimeout(() => auth.getClient(), AUTH_TIMEOUT_MS, 'auth.getClient');
  }
  try {
    return await AUTH_CLIENT_PROMISE;
  } catch (err) {
    AUTH_CLIENT_PROMISE = null;
    throw err;
  }
}

async function getAccessTokenWithRetry() {
  if (hasUsableCachedToken()) {
    return CACHED_ACCESS_TOKEN.token;
  }
  let lastError = null;
  for (let attempt = 0; attempt <= AUTH_RETRIES_MAX; attempt += 1) {
    try {
      const client = await getAuthClientWithTimeout();
      const tokenResponse = await withTimeout(
        () => client.getAccessToken(),
        AUTH_TIMEOUT_MS,
        'auth.getAccessToken'
      );
      const tokenValue = extractTokenValue(tokenResponse);
      if (!tokenValue) {
        throw new Error('EMPTY_ACCESS_TOKEN');
      }
      const expiresAtMs = extractTokenExpiryMs(tokenResponse, tokenValue);
      CACHED_ACCESS_TOKEN = { token: tokenValue, expiresAtMs };
      return tokenValue;
    } catch (err) {
      lastError = err;
      AUTH_CLIENT_PROMISE = null;
      CACHED_ACCESS_TOKEN = null;
      if (attempt >= AUTH_RETRIES_MAX) break;
      const wait = AUTH_RETRY_WAIT_S * (attempt + 1);
      console.log(
        `Auth token acquisition failed (${attempt + 1}/${AUTH_RETRIES_MAX + 1}): ` +
        `${err?.message || err}. Waiting ${wait}s...`
      );
      await waitWithHeartbeat(wait, 'auth retry');
    }
  }
  throw new Error(`AUTH_TOKEN_ACQUISITION_FAILED: ${lastError?.message || lastError}`);
}

function compactSafety(ratings) {
  if (!Array.isArray(ratings) || ratings.length === 0) return '';
  return ratings
    .map(r => {
      const cat = r.category || r.name || 'unknown';
      const prob = r.probability || r.probabilityScore || r.severity || r.level || 'unknown';
      return `${cat}:${prob}`;
    })
    .join(', ');
}

function logModelDiagnostics(data, label) {
  const pf = data?.promptFeedback;
  const cand = data?.candidates?.[0];
  const finish = cand?.finishReason || cand?.finish_reason;
  const block = pf?.blockReason || pf?.block_reason || pf?.blockReasonMessage || pf?.block_reason_message;
  const pfSafety = compactSafety(pf?.safetyRatings || pf?.safety_ratings);
  const candSafety = compactSafety(cand?.safetyRatings || cand?.safety_ratings);
  if (finish || block || pfSafety || candSafety) {
    console.log(`DIAG ${label}: finish=${finish || 'n/a'} block=${block || 'n/a'} safety=[${candSafety || pfSafety || 'n/a'}]`);
  }
}

const POLICY_BLOCK_RE = /(IMAGE_PROHIBITED_CONTENT|IMAGE_SAFETY|SAFETY|PROHIBITED|BLOCK)/i;

function extractBlockSignal(data) {
  const pf = data?.promptFeedback;
  const cand = data?.candidates?.[0];
  const finish = String(cand?.finishReason || cand?.finish_reason || '').toUpperCase();
  const block = String(
    pf?.blockReason || pf?.block_reason || pf?.blockReasonMessage || pf?.block_reason_message || ''
  ).toUpperCase();
  const pfSafety = compactSafety(pf?.safetyRatings || pf?.safety_ratings);
  const candSafety = compactSafety(cand?.safetyRatings || cand?.safety_ratings);
  const safety = [candSafety, pfSafety].filter(Boolean).join(', ');
  const policyBlocked = POLICY_BLOCK_RE.test(finish) || POLICY_BLOCK_RE.test(block);
  const hardProhibited = finish.includes('IMAGE_PROHIBITED_CONTENT');
  const safetyBlocked = finish.includes('IMAGE_SAFETY') || finish === 'SAFETY';
  return { finish, block, safety, policyBlocked, hardProhibited, safetyBlocked };
}

function isSafetyFailureError(errorLike) {
  const msg = String(errorLike?.message || errorLike || '').trim();
  if (!msg) return false;
  const text = msg.toUpperCase();
  if (text.includes('IMAGE_SAFETY') || text.includes('IMAGE_PROHIBITED_CONTENT')) return true;
  if (text.includes('POLICY BLOCK') || text.includes('PROHIBITED')) return true;
  if (text.includes('SAFETY') && !text.includes('IDENTITY')) return true;
  return false;
}

function buildSafetyRevisitLessons(phaseLabel, reason = '') {
  const phase = String(phaseLabel || 'A').toUpperCase();
  const lastReason = String(reason || '').trim();
  return normalizeLessons([
    `Safety revisit ${phase}: preserve identity, pose, and framing exactly; revise only compliance-sensitive wording and geometry.`,
    'Use compliance-first, non-explicit editorial language with continuous opaque support zones and causal garment load paths.',
    'Reduce provocative phrasing and prioritize conservative material coverage while keeping physical realism and sensor fidelity.',
    lastReason ? `Previous safety failure context: ${lastReason}` : '',
  ], 8);
}

const expressions = [
  'confident gaze, relaxed eyelids, soft closed-mouth smile',
  'calm poise, gentle smile, steady eye contact',
  'serene confidence, neutral lips, relaxed jaw',
  'composed gaze, subtle smile, chin level',
  'quiet confidence, soft eyes, slight smile',
  'poised stillness, relaxed mouth, direct gaze',
  'warm friendliness, small smile, gentle head tilt',
  'knowing smile, eyes bright, chin slightly down',
  'cool composure, relaxed jaw, steady gaze',
  'relaxed elegance, soft gaze, effortless poise',
  'subtle smirk, eyes engaged, chin dipped',
  'radiant charm, soft smile, luminous eyes',
  'measured calm, composed and still',
  'intimate warmth, subtle smile, steady eye contact',
  'confident edge, focused eyes, controlled breath',
  'dreamy softness, calm gaze, relaxed mouth',
  'sharp wit, small smile, eyes lively',
  'regal poise, elongated neck, inviting gaze',
  'candid smile, relaxed face, direct gaze',
  'magnetic presence, unblinking gaze, quiet intensity',
];

const ROTATION_SEQUENCE = [
  'yaw -15° (right shoulder forward), subtle hip counter-rotation, chin to camera',
  'yaw -35° three-quarter left, torso rotated, face to camera',
  'yaw -85° near-profile left, face turned slightly to camera',
  'yaw +35° three-quarter right, torso rotated, face to camera',
  'yaw +85° near-profile right, face turned slightly to camera',
  'yaw +150° back three-quarter left, shoulder blade visible, head turned to camera',
  'yaw +210° back three-quarter right, head turned to camera',
  'yaw 0° front-facing, micro-tilt',
];

const THEME_BEATS = [
  { name: 'Nocturne Lattice', note: 'angular geometry, nocturnal luxury, electric edges' },
  { name: 'Neon Mirage', note: 'liquid highlights, neon spill, glassy reflections' },
  { name: 'Velvet Voltage', note: 'soft depth, sculpted shadow, plush glow' },
  { name: 'Chrome Ember', note: 'warm metallic glints, ember accents, firelight contrast' },
  { name: 'Glass Orchid', note: 'delicate translucency, botanical lines, crystalline accents' },
  { name: 'Obsidian Pulse', note: 'dark mass, pulsing edge light, graphite sheen' },
  { name: 'Starlight Noir', note: 'fine sparkle noise, tiny caustics, deep night palette' },
  { name: 'Ion Silk', note: 'smooth specular flow, cool gradients, high polish' },
];

const VIBE_BEATS = [
  { name: 'Bold couture poolside', note: 'high-contrast glamour, strong cuts, couture energy' },
  { name: 'Glossed‑couture', note: 'liquid sheen, sculpted curves, high polish' },
  { name: 'Dark‑glam edge', note: 'obsidian mass, sharp highlights, controlled presence' },
  { name: 'Neon‑charged', note: 'vibrant spill, electric accents, high contrast' },
  { name: 'Velvet‑smoke', note: 'soft depth, plush drape, warm glow' },
];

const COLORWAYS = [
  { name: 'midnight sapphire + mercury', primary: 'midnight sapphire', accent: 'liquid mercury', highlight: 'ice blue', spectral: 'PRIMARY peak ~460nm, low reflectance <10% in red; ACCENT broadband metallic; HIGHLIGHT ~500–520nm shoulder.' },
  { name: 'garnet noir + ember', primary: 'garnet noir', accent: 'ember copper', highlight: 'warm gold', spectral: 'PRIMARY peak ~620–650nm with suppressed blue; ACCENT metallic with warm 580–620nm bias; HIGHLIGHT ~560–590nm.' },
  { name: 'ion teal + graphite', primary: 'ion teal', accent: 'graphite', highlight: 'cool silver', spectral: 'PRIMARY peak ~500–520nm; ACCENT low reflectance neutral; HIGHLIGHT broadband metallic with cool bias.' },
  { name: 'obsidian + ice', primary: 'obsidian black', accent: 'ice blue', highlight: 'frosted chrome', spectral: 'PRIMARY reflectance <5% across spectrum; ACCENT peak ~480–500nm; HIGHLIGHT broadband metallic with soft blue tint.' },
  { name: 'amethyst smoke + rose gold', primary: 'amethyst smoke', accent: 'rose gold', highlight: 'soft champagne', spectral: 'PRIMARY peak ~410–430nm with muted green; ACCENT metallic with warm 570–600nm; HIGHLIGHT ~560nm soft.' },
  { name: 'copper oxide + charcoal', primary: 'copper oxide', accent: 'charcoal', highlight: 'brass glow', spectral: 'PRIMARY peak ~590–620nm with green dip; ACCENT low reflectance neutral; HIGHLIGHT ~560–590nm.' },
  { name: 'liquid bronze + onyx', primary: 'liquid bronze', accent: 'onyx', highlight: 'amber spark', spectral: 'PRIMARY metallic warm 560–610nm; ACCENT low reflectance; HIGHLIGHT ~580nm narrow sparkle.' },
  { name: 'pearl gunmetal + violet', primary: 'pearl gunmetal', accent: 'violet ink', highlight: 'cool pearl', spectral: 'PRIMARY neutral with slight blue lift; ACCENT peak ~400–420nm; HIGHLIGHT broadband with cool bias.' },
  { name: 'crimson lacquer + black chrome', primary: 'crimson lacquer', accent: 'black chrome', highlight: 'blood orange', spectral: 'PRIMARY peak ~640–680nm; ACCENT metallic neutral; HIGHLIGHT ~600–620nm.' },
  { name: 'electric cerulean + ink', primary: 'electric cerulean', accent: 'ink navy', highlight: 'cyan spark', spectral: 'PRIMARY peak ~470–490nm; ACCENT low reflectance in red; HIGHLIGHT ~500nm.' },
  { name: 'champagne quartz + onyx', primary: 'champagne quartz', accent: 'onyx', highlight: 'soft ivory', spectral: 'PRIMARY broad ~540–580nm; ACCENT low reflectance; HIGHLIGHT ~560nm soft.' },
  { name: 'emerald dusk + brass', primary: 'emerald dusk', accent: 'antique brass', highlight: 'forest glow', spectral: 'PRIMARY peak ~520–540nm; ACCENT metallic warm 560–600nm; HIGHLIGHT ~540–560nm.' },
  { name: 'ultraviolet ink + platinum', primary: 'ultraviolet ink', accent: 'platinum', highlight: 'cool pearl', spectral: 'PRIMARY peak ~400–420nm; ACCENT broadband metallic; HIGHLIGHT ~520nm.' },
  { name: 'ruby heat + graphite', primary: 'ruby heat', accent: 'graphite', highlight: 'warm copper', spectral: 'PRIMARY peak ~640nm; ACCENT low reflectance; HIGHLIGHT ~580–600nm.' },
  { name: 'aqua neon + obsidian', primary: 'aqua neon', accent: 'obsidian', highlight: 'ice mint', spectral: 'PRIMARY peak ~490–510nm; ACCENT <5% reflectance; HIGHLIGHT ~510–520nm.' },
  { name: 'rose smoke + black chrome', primary: 'rose smoke', accent: 'black chrome', highlight: 'soft champagne', spectral: 'PRIMARY peak ~560–580nm; ACCENT metallic neutral; HIGHLIGHT ~560nm.' },
  { name: 'golden haze + onyx', primary: 'golden haze', accent: 'onyx', highlight: 'amber spark', spectral: 'PRIMARY ~560–590nm; ACCENT low reflectance; HIGHLIGHT ~580nm.' },
  { name: 'cobalt shock + graphite', primary: 'cobalt shock', accent: 'graphite', highlight: 'cool silver', spectral: 'PRIMARY peak ~460nm; ACCENT low reflectance; HIGHLIGHT broadband.' },
  { name: 'scarlet neon + gunmetal', primary: 'scarlet neon', accent: 'gunmetal', highlight: 'blood orange', spectral: 'PRIMARY peak ~650–670nm; ACCENT neutral metallic; HIGHLIGHT ~600nm.' },
  { name: 'jade night + brass', primary: 'jade night', accent: 'brass', highlight: 'green glow', spectral: 'PRIMARY peak ~520–540nm; ACCENT warm metallic; HIGHLIGHT ~540–560nm.' },
  { name: 'smoke quartz + chrome', primary: 'smoke quartz', accent: 'chrome', highlight: 'cool pearl', spectral: 'PRIMARY ~520–560nm muted; ACCENT metallic broadband; HIGHLIGHT ~520nm.' },
  { name: 'ember rose + obsidian', primary: 'ember rose', accent: 'obsidian', highlight: 'warm gold', spectral: 'PRIMARY ~600–620nm; ACCENT low reflectance; HIGHLIGHT ~570–590nm.' },
  { name: 'neon lime + graphite', primary: 'neon lime', accent: 'graphite', highlight: 'acid green', spectral: 'PRIMARY peak ~550–565nm; ACCENT low reflectance; HIGHLIGHT ~560–570nm.' },
  { name: 'icy lilac + black chrome', primary: 'icy lilac', accent: 'black chrome', highlight: 'cool silver', spectral: 'PRIMARY peak ~420–440nm; ACCENT neutral metallic; HIGHLIGHT broadband.' },
  { name: 'sunset vermillion + graphite', primary: 'sunset vermillion', accent: 'graphite', highlight: 'ember gold', spectral: 'PRIMARY peak ~610–630nm; ACCENT low reflectance; HIGHLIGHT ~580–600nm.' },
  { name: 'arctic cyan + obsidian', primary: 'arctic cyan', accent: 'obsidian', highlight: 'ice white', spectral: 'PRIMARY peak ~485–505nm; ACCENT <5% reflectance; HIGHLIGHT broadband cool.' },
  { name: 'mocha noir + champagne', primary: 'mocha noir', accent: 'champagne', highlight: 'warm pearl', spectral: 'PRIMARY ~560–590nm with lowered blue; ACCENT metallic warm 560–590nm; HIGHLIGHT ~560nm.' },
  { name: 'opal mint + chrome', primary: 'opal mint', accent: 'chrome', highlight: 'seafoam', spectral: 'PRIMARY peak ~500–515nm; ACCENT metallic broadband; HIGHLIGHT ~510–520nm.' },
  { name: 'petrol blue + brass', primary: 'petrol blue', accent: 'brass', highlight: 'teal glow', spectral: 'PRIMARY peak ~470–490nm; ACCENT warm metallic 560–600nm; HIGHLIGHT ~500–520nm.' },
  { name: 'sunlit coral + onyx', primary: 'sunlit coral', accent: 'onyx', highlight: 'peach spark', spectral: 'PRIMARY peak ~585–610nm; ACCENT low reflectance; HIGHLIGHT ~580–590nm.' },
  { name: 'storm slate + silver', primary: 'storm slate', accent: 'silver', highlight: 'cool gray', spectral: 'PRIMARY neutral with slight blue lift; ACCENT metallic broadband; HIGHLIGHT ~520nm.' },
  { name: 'magenta dusk + gunmetal', primary: 'magenta dusk', accent: 'gunmetal', highlight: 'rose sheen', spectral: 'PRIMARY peak ~520–540nm with red lift; ACCENT metallic neutral; HIGHLIGHT ~560–580nm.' },
  { name: 'olive quartz + brass', primary: 'olive quartz', accent: 'brass', highlight: 'golden olive', spectral: 'PRIMARY peak ~540–560nm; ACCENT warm metallic; HIGHLIGHT ~560–580nm.' },
  { name: 'infrared ruby + black chrome', primary: 'infrared ruby', accent: 'black chrome', highlight: 'blood orange', spectral: 'PRIMARY peak ~650–680nm; ACCENT metallic neutral; HIGHLIGHT ~600–620nm.' },
  { name: 'blue steel + amber', primary: 'blue steel', accent: 'amber', highlight: 'cool steel', spectral: 'PRIMARY peak ~460–480nm; ACCENT warm 570–600nm; HIGHLIGHT ~480–500nm.' },
  { name: 'sandstone + espresso', primary: 'sandstone', accent: 'espresso', highlight: 'sunlit sand', spectral: 'PRIMARY ~560–590nm; ACCENT low reflectance; HIGHLIGHT ~580–590nm.' },
  { name: 'glacier teal + pewter', primary: 'glacier teal', accent: 'pewter', highlight: 'ice mint', spectral: 'PRIMARY peak ~495–510nm; ACCENT metallic neutral; HIGHLIGHT ~510–520nm.' },
  { name: 'ultramarine haze + gold', primary: 'ultramarine haze', accent: 'gold', highlight: 'pale cyan', spectral: 'PRIMARY peak ~440–460nm; ACCENT warm metallic; HIGHLIGHT ~500–520nm.' },
  { name: 'peach noir + graphite', primary: 'peach noir', accent: 'graphite', highlight: 'soft champagne', spectral: 'PRIMARY ~560–590nm; ACCENT low reflectance; HIGHLIGHT ~560–580nm.' },
  { name: 'forest emerald + copper', primary: 'forest emerald', accent: 'copper', highlight: 'green glow', spectral: 'PRIMARY peak ~520–540nm; ACCENT warm metallic 580–610nm; HIGHLIGHT ~540–560nm.' },
  { name: 'silicon gray + neon cyan', primary: 'silicon gray', accent: 'neon cyan', highlight: 'cool chrome', spectral: 'PRIMARY neutral; ACCENT peak ~490–510nm; HIGHLIGHT broadband cool.' },
  { name: 'midnight plum + rose gold', primary: 'midnight plum', accent: 'rose gold', highlight: 'lavender sheen', spectral: 'PRIMARY peak ~420–440nm; ACCENT warm metallic 570–600nm; HIGHLIGHT ~430–450nm.' },
  { name: 'turquoise smoke + titanium', primary: 'turquoise smoke', accent: 'titanium', highlight: 'sea glass', spectral: 'PRIMARY peak ~495–510nm; ACCENT metallic neutral; HIGHLIGHT ~510–520nm.' },
  { name: 'sunray gold + charcoal', primary: 'sunray gold', accent: 'charcoal', highlight: 'amber spark', spectral: 'PRIMARY ~560–590nm; ACCENT low reflectance; HIGHLIGHT ~580–600nm.' },
];

const SILHOUETTES = [
  'lace one-piece: dagger plunge to navel + tensioned mesh cradle + high-cut hips',
  'lace one-piece: keyhole plunge with split-cup illusion + lattice side cutouts',
  'lace one-piece: asymmetric one-shoulder strap + diagonal plunge + open back',
  'lace one-piece: cowl-drape plunge + sculpted underbust seam + high-cut hips',
  'lace one-piece: deep V-plunge + ring-anchored side cutouts + T-strap back',
  'lace one-piece: spiral seam mapping around plunge + open back to waist',
  'lace one-piece: arc cutouts + scalloped neckline edge + high-cut hips',
  'lace one-piece: veil panel over plunge + open back + razor-thin bridges',
  'lace one-piece: cathedral-arch lace paneling + narrow center gore + high-cut hips',
  'lace one-piece: chevron-lace bodice + corset-laced spine + open back',
  'lace one-piece: petal-applique plunge + negative-space windows + high-cut hips',
  'lace one-piece: double-strap halo + plunge to navel + open back to waist',
];

const DESIGN_TWISTS = [
  'corset-laced spine with micro-grommets under high tension',
  'scalloped eyelash-lace neckline with bonded edge thickness',
  'interlocked ring anchors at side seams with visible tension gradients',
  'offset ruched spine with measured tension bands and micro-folds',
  'diagonal seam tessellation across the bodice with bias-tension mapping',
  'micro-pleated edge fins that flicker in warm highlights',
  'folded petal panels overlapping with soft shadow pockets',
  'double-cowl overlay with tight inner tension line and secure underbust seam',
  'split-strap harness that converges at the center gore',
  'vertical rib channels that sculpt the plunge with stiffened lace ribs',
];

const SURFACE_TREATMENTS = [
  'satin-backed lace overlay with sheer illusion mesh',
  'matte crepe base with lace filaments at grazing angles',
  'hydrophobic wet-look finish on lace with micro-bead sparkle',
  'thin-film foil accents on lace edges for angle-dependent hue shifts',
  'sheer lace veil panel with soft diffusion and high-frequency thread sparkle',
  'micro-bead scatter embedded in lace motifs with caustic pinpoints',
  'glass-bead clusters stitched into lace patterns with anisotropic glints',
  'polished nylon base beneath lace overlay for crisp specular bands',
  'metallic filament lace with anisotropic sheen aligned to weave',
  'tonal ombre dye on lace filaments with stable metamerism',
];

const LACE_MOTIFS = [
  'corded guipure floral scrollwork with raised edges',
  'art-deco fan lattice with scalloped eyelash fringe',
  'hexagonal honeycomb lace with micro-beaded nodes',
  'cathedral-arch motif with vertical ribs and open vaults',
  'iris-petal lace applique over sheer tulle',
  'baroque arabesque lace with dense center and open perimeter',
  'geometric chevron lace with alternating open/closed cells',
  'micro-dot tulle with lace filigree overlays',
  'gothic rose-window lace with radial ribs',
  'wave-loop lace with repeating crescent apertures',
];

const HARDWARE_ACCENTS = [
  'brushed brass ringlets',
  'black chrome micro-clasps',
  'titanium micro-buckles',
  'onyx chain links',
  'crystal ring connectors',
  'micro-grommet lace-up eyelets',
  'graphite zipper teeth',
];

const EVENT_MOTIFS = [
  { name: 'Projection Facets', physics: 'triangular seam tessellation with alternating specular roughness; edge normals flip to mimic projected light breaks' },
  { name: 'Holo-Gauze', physics: 'ultra-thin organza overlay with phase-shift shimmer; interference bands align to warp direction' },
  { name: 'Wristband Ripple', physics: 'radial strap array with tension gradients that read like concentric ripples' },
  { name: 'Stage Halo', physics: 'circular harness geometry with even curvature and uniform strap tension' },
  { name: 'CO2 Plume', physics: 'vertical pleat channels that expand and collapse with airflow micro-lift' },
  { name: 'Laser Grid', physics: 'fine lattice cutouts with 90-degree intersections and clean bevel edges' },
  { name: 'Confetti Cascade', physics: 'micro-bead scatter zones with tiny caustic specks and randomized spark distribution' },
  { name: 'Firelight Pulse', physics: 'gradient roughness zones that intensify highlight flicker under warm light' },
];

function rand(min, max, step = 1) {
  const n = Math.floor((max - min) / step);
  return min + Math.floor(Math.random() * (n + 1)) * step;
}

function buildMeasurements() {
  const boost = DARING_BOOST_LEVEL;
  return {
    strapWidthMm: rand(Math.max(1, 2 - boost), Math.max(3, 7 - boost), 1),
    cutoutMajorMm: rand(270 + (20 * boost), 380 + (25 * boost), 5),
    cutoutMinorMm: rand(150 + (12 * boost), 240 + (15 * boost), 5),
    plungeDepthMm: rand(300 + (20 * boost), 380 + (25 * boost), 5),
    navelOffsetMm: rand(0, 2, 1),
    necklineAngleDeg: rand(78, 90, 2),
    cutoutRiseMm: rand(205 + (8 * boost), 260 + (10 * boost), 5),
    bridgeSpanMm: rand(Math.max(10, 18 - (2 * boost)), Math.max(20, 40 - (3 * boost)), 1),
    negSpacePercent: rand(Math.min(70, 52 + (6 * boost)), Math.min(80, 68 + (6 * boost)), 1),
    seamPitchMm: rand(8, 18, 2),
    stitchLengthMm: rand(2, 4, 0.5),
    panelBiasDeg: rand(20, 55, 3),
    boningWidthMm: rand(4, 9, 1),
    claspWidthMm: rand(6, 12, 1),
  };
}

const usedVariations = new Set();
const usedColorways = new Set();
function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function buildVariation() {
  for (let i = 0; i < 40; i++) {
    const theme = pick(THEME_BEATS);
    const availableColors = COLORWAYS.filter(c => !usedColorways.has(c.name));
    const colorway = (availableColors.length > 0 ? pick(availableColors) : pick(COLORWAYS));
    const vibe = pick(VIBE_BEATS);
    const silhouette = pick(SILHOUETTES);
    const twist = pick(DESIGN_TWISTS);
    const surface = pick(SURFACE_TREATMENTS);
    const laceMotif = pick(LACE_MOTIFS);
    const hardware = pick(HARDWARE_ACCENTS);
    const motif = pick(EVENT_MOTIFS);
    const measurements = buildMeasurements();
    const key = `${theme.name}|${vibe.name}|${colorway.name}|${silhouette}|${twist}|${surface}|${laceMotif}|${hardware}|${motif.name}|${measurements.strapWidthMm}`;
    if (!usedVariations.has(key)) {
      usedVariations.add(key);
      usedColorways.add(colorway.name);
      return {
        theme,
        vibe,
        colorway,
        silhouette,
        twist,
        surface,
        laceMotif,
        hardware,
        motif,
        measurements,
        desc: `Theme: ${theme.name} (${theme.note}). Vibe: ${vibe.name} (${vibe.note}). Colorway: ${colorway.name} — primary ${colorway.primary}, accent ${colorway.accent}, highlight ${colorway.highlight}. Silhouette: ${silhouette}. Design twist: ${twist}. Lace motif: ${laceMotif}. Surface: ${surface}. Hardware: ${hardware}. Event motif: ${motif.name}.`,
      };
    }
  }
  const theme = pick(THEME_BEATS);
  const vibe = pick(VIBE_BEATS);
  const colorway = pick(COLORWAYS);
  const motif = pick(EVENT_MOTIFS);
  const laceMotif = pick(LACE_MOTIFS);
  return {
    theme,
    vibe,
    colorway,
    silhouette: pick(SILHOUETTES),
    twist: pick(DESIGN_TWISTS),
    surface: pick(SURFACE_TREATMENTS),
    laceMotif,
    hardware: pick(HARDWARE_ACCENTS),
    motif,
    measurements: buildMeasurements(),
    desc: `Theme: ${theme.name}. Vibe: ${vibe.name}. Colorway: ${colorway.name}. Silhouette: ${pick(SILHOUETTES)}. Design twist: ${pick(DESIGN_TWISTS)}. Lace motif: ${laceMotif}. Event motif: ${motif.name}.`,
  };
}

function variationFingerprint(variation) {
  if (!variation || typeof variation !== 'object') return 'n/a';
  const parts = [
    variation?.theme?.name || '',
    variation?.vibe?.name || '',
    variation?.colorway?.name || '',
    variation?.motif?.name || '',
    variation?.laceMotif || '',
  ].map(x => String(x || '').trim()).filter(Boolean);
  return parts.length ? parts.join('|') : 'n/a';
}

function composeDesignSpec(concept, variation, fallback = false) {
  const materialBase = fallback ? concept.materialFallback : concept.material;
  const microBase = fallback ? concept.microFallback : concept.micro;
  const color = `COLORWAY: ${variation.colorway.name} — primary ${variation.colorway.primary}, accent ${variation.colorway.accent}, highlight ${variation.colorway.highlight}. SPECTRAL: ${variation.colorway.spectral}`;
  const brief = `GARMENT DESIGN BRIEF: ${variation.theme.name} (${variation.theme.note}); VIBE: ${variation.vibe.name} (${variation.vibe.note}); ${variation.silhouette}; ${variation.twist}; lace motif: ${variation.laceMotif}; ${variation.surface}; ${variation.hardware}; event motif: ${variation.motif.name}.`;
  const material = `${materialBase} + ${variation.surface}; lace motif: ${variation.laceMotif}; hardware accents in ${variation.hardware}; adhere to ${variation.colorway.name} palette.`;
  const micro = `${microBase} | ${variation.surface} microphysics; lace microstructure: ${variation.laceMotif}; hardware glints: ${variation.hardware}; motif physics: ${variation.motif.physics}.`;
  const m = variation.measurements;
  const physics = fallback
    ? `PHYSICS-ONLY GARMENT SPEC: panel thickness 0.3–0.6mm with lining 0.2–0.4mm; strap width ${m.strapWidthMm}mm; cutout ellipse major ${m.cutoutMajorMm}mm × minor ${m.cutoutMinorMm}mm; cutout rise ${m.cutoutRiseMm}mm toward iliac crest; neckline plunge depth ${m.plungeDepthMm}mm with apex ${m.navelOffsetMm}mm above the lower-abdomen reference; neckline angle ${m.necklineAngleDeg}°; bridge span ${m.bridgeSpanMm}mm between cutout edges; negative-space ratio ${m.negSpacePercent}% of front panel; sheer illusion mesh thickness 0.2–0.4mm; seam pitch ${m.seamPitchMm}mm with stitch length ${m.stitchLengthMm}mm; panel bias angle ${m.panelBiasDeg}°; boning width ${m.boningWidthMm}mm; clasp width ${m.claspWidthMm}mm; reinforcement tape follows cutout edges with 1–2mm shadow offset; lace motif geometry: ${variation.laceMotif}; tension gradient strongest at strap anchors and relaxes toward hem. Motif physics: ${variation.motif.physics}.`
    : `PHYSICS-ONLY GARMENT SPEC: panel thickness 0.3–0.6mm with lining 0.2–0.4mm; strap width ${m.strapWidthMm}mm; cutout ellipse major ${m.cutoutMajorMm}mm × minor ${m.cutoutMinorMm}mm; cutout rise ${m.cutoutRiseMm}mm toward iliac crest; neckline plunge depth ${m.plungeDepthMm}mm with apex ${m.navelOffsetMm}mm above the navel; neckline angle ${m.necklineAngleDeg}°; bridge span ${m.bridgeSpanMm}mm between cutout edges; negative-space ratio ${m.negSpacePercent}% of front panel; sheer illusion mesh thickness 0.2–0.4mm; seam pitch ${m.seamPitchMm}mm with stitch length ${m.stitchLengthMm}mm; panel bias angle ${m.panelBiasDeg}°; boning width ${m.boningWidthMm}mm; clasp width ${m.claspWidthMm}mm; reinforcement tape follows cutout edges with 1–2mm shadow offset; lace motif geometry: ${variation.laceMotif}; tension gradient strongest at strap anchors and relaxes toward hem. Motif physics: ${variation.motif.physics}.`;
  return { color, brief, material, micro, physics };
}

const IMAGE_INTENT_BLOCK = `IMAGE OUTPUT INTENT: generate one photoreal image (not text-only). Use explicit image language and keep the result as a raw editorial photograph.`;
const QUALITY_UPLIFT_OBJECTIVE_NOTE = QUALITY_UPLIFT_MULTIPLIER > 1.0
  ? ` QUALITY UPLIFT: enforce x${QUALITY_UPLIFT_MULTIPLIER.toFixed(2)} pressure over baseline ${TARGET_QUALITY_GAIN_BASE_PCT.toFixed(1)}% (effective target ${TARGET_QUALITY_GAIN_PCT.toFixed(1)}%).`
  : '';
const FOURK_QUALITY_OBJECTIVE_BLOCK = `4K QUALITY OBJECTIVE (HARD): render a native 4:5 frame at 3072x3840 (4K) and push toward ~${TARGET_QUALITY_GAIN_PCT.toFixed(1)}% headroom quality gain via physically causal improvements only: sharper lace filament separation, cleaner seam/load-path evidence, stronger wet-optics coherence, higher skin/cloth microtexture fidelity, and more lens-faithful sensor realism.${QUALITY_UPLIFT_OBJECTIVE_NOTE} No stylized shortcuts, no smoothing, no fake detail.`;
const INITIAL_ATTEMPT_MICRODETAIL_BLOCK = `INITIAL-ATTEMPT MICRODETAIL PUSH (MANDATORY): raise first-attempt quality pressure by +${INITIAL_ATTEMPT_HEADROOM_BOOST_PCT.toFixed(1)}% above the current target (effective first-attempt headroom target ~${INITIAL_ATTEMPT_HEADROOM_TARGET_PCT.toFixed(1)}%). Front-load physically causal sub-mm evidence: lace filament separation, stitch-pitch variance, seam-load continuity, edge-thickness cues, pore-level spec breakup, droplet contact-angle diversity, rivulet thickness gradients, and emitter-locked highlight fidelity. No macro composition changes; no synthetic sharpening halos; no denoise smear.`;
const POLICY_MICRODETAIL_RESOLUTION_BLOCK = `BLOCK-RESOLUTION MODE (MICRODETAIL-FIRST): when policy risk is elevated, reduce stylistic intensity by one notch and keep wording technical. Prioritize seam/load continuity, thread-level structure, wet/dry roughness separation, caustic coherence, and sensor-real microtexture. Keep coverage conservative, fully opaque support zones continuous, and framing strictly non-explicit.`;
const ELITE_EDITORIAL_BLOCK = `ELITE PHOTO BAR: deliver Pulitzer-grade editorial realism with intentional composition, physically causal lighting, lens-faithful rendering, and premium storytelling polish. OUTPUT FIDELITY: target true 4K output (or highest available model-native resolution), with aggressive high-frequency detail retention (lace filaments, seam edges, skin microtexture, droplets, pores, and clean optical acuity) and no mushy compression look.`;
const IDENTITY_SIGNATURE_BLOCK = REFERENCE_IDENTITY_SIGNATURE
  ? ` Identity signature anchors (must remain true): ${REFERENCE_IDENTITY_SIGNATURE}.`
  : '';
const IDENTITY_NEGATIVE_BLOCK = REFERENCE_IDENTITY_NEGATIVE
  ? ` Anti-substitution guard: do not output these non-reference traits: ${REFERENCE_IDENTITY_NEGATIVE}.`
  : '';
const IDENTITY_LOCK_BLOCK = `HIGH-FIDELITY IDENTITY LOCK: preserve eyebrow arcs, eyelid folds, iris color, nose bridge/tip geometry, lip contour, jawline, skin tone distribution, and age cues from the reference. Keep natural asymmetry; no beautification or face reshaping.${IDENTITY_SIGNATURE_BLOCK}${IDENTITY_NEGATIVE_BLOCK}`;
const REFERENCE_AUTHORITY_BLOCK = `REFERENCE AUTHORITY: the provided reference photo is the sole identity source-of-truth. Keep the same woman with unchanged facial proportions, age cues, ethnicity cues, and natural asymmetry.`;
const IDENTITY_DRIFT_FAILSAFE_BLOCK = `IDENTITY DRIFT FAILSAFE (HARD): do not recast the woman. Keep face-shape ratios, orbital spacing, eyebrow arc shape, nose bridge/tip width, lip proportions, jaw taper, and skin undertone locked to reference. Reject doll-like smoothing, age shift, ethnicity shift, face-swap traits, or synthetic symmetry cleanup.`;
const SOURCE_ATTIRE_REPLACEMENT_BLOCK = `WARDROBE REPLACEMENT LOCK (HARD): fully replace the source outfit from the reference image. Do not preserve source streetwear/casual garments (tops, tees, tanks, denim, pants, shorts, skirts, jackets) or their silhouette/color as the final look. Render only the specified couture lace one-piece/swimwear architecture for this concept.`;
const PASSB_ATTIRE_CONTINUITY_BLOCK = `WARDROBE CONTINUITY LOCK (PASS B): keep pass-A garment identity and geometry intact. Do not revert to source/reference clothing or introduce casual/streetwear items; refine microphysics only on the locked couture swimwear.`;
const STEPWISE_SCENE_BUILD_BLOCK = `STEPWISE SCENE BUILD (MANDATORY): 1) lock architecture/time-of-day; 2) place subject with plausible balance and contact pressure; 3) apply garment geometry + seam/load map; 4) apply wet interactions (film, droplets, rivulets, caustics); 5) apply camera pipeline artifacts and final tonal response.`;
const SEMANTIC_NEGATIVE_BLOCK = `SEMANTIC NEGATIVES (POSITIVE WORDING): depict clear limb counts, isolated shoulders, coherent reflections, continuous seams, stable lace scale, and artifact-free edges. Express desired clean states directly instead of long "do-not" lists.`;
const REFINEMENT_ORDER_BLOCK = `REFINEMENT PRIORITY: identity fidelity -> pose biomechanics -> garment load paths -> wet optics/caustics -> sensor artifacts. If trade-offs occur, preserve this order.`;
const FRONTIER_PROFILE_NOTES = {
  intimate: 'high-fashion closeness, magnetic confidence, and strictly non-explicit editorial framing',
  balanced: 'cinematic luxury realism, poised confidence, restraint-first editorial tone',
  clean: 'strictly elegant non-suggestive fashion portrait tone, high compliance robustness',
};

const BOLD_EDITORIAL_PROFILE_STYLE = {
  intimate: 'confident magnetic presence, glamour-forward posture, and refined closeness cues',
  balanced: 'cover-grade cinematic confidence with high contrast and disciplined elegance',
  clean: 'premium elegance-first portrait authority with compliance-robust framing',
};
const BOLD_EDITORIAL_KERNEL_BLOCK = `BOLD EDITORIAL REALISM KERNEL (SAFE): maximize visual impact through lighting architecture, couture line discipline, and camera intent. Keep identity unmodified and preserve non-explicit framing.`;
const BOLD_EDITORIAL_REALISM_BLOCK = `REALISM MICRO-EVIDENCE (MANDATORY): preserve pore-scale skin texture, vellus-hair edge response, stitch-pitch variance, edge thickness cues, droplet contact-angle diversity, emitter-locked highlights, and physically coherent reflections/refractions.`;
const BOLD_EDITORIAL_COMPOSITION_BLOCK = `COVER COMPOSITION INTENT: one decisive hero frame, assertive posture, premium lensing, and clean subject isolation. Boldness comes from composition + physics, never explicit exposure.`;
const BOLD_EDITORIAL_SAFETY_BLOCK = `SAFE GLAMOUR GUARDRAIL: keep opaque support zones continuous, avoid suggestive framing language, and keep the scene strictly tasteful and non-explicit.`;

function normalizeBoldEditorialProfile(profile = 'balanced') {
  const key = String(profile || '').trim().toLowerCase();
  if (key === 'intimate' || key === 'clean' || key === 'balanced') return key;
  return 'balanced';
}

function buildBoldEditorialKernel({ stage = 'passA', profile = 'balanced' } = {}) {
  if (!BOLD_EDITORIAL_MODE) return '';
  const profileKey = normalizeBoldEditorialProfile(profile);
  const stageTone = stage === 'passB'
    ? 'refinement-only boldness: preserve macro locks and lift only micro-believability'
    : 'first-pass boldness: establish confident macro composition with physically causal detail';
  const intensityDirective = BOLD_EDITORIAL_INTENSITY >= 3
    ? 'Apply peak safe editorial impact while preserving strict compliance and identity.'
    : (BOLD_EDITORIAL_INTENSITY === 2
      ? 'Apply strong editorial impact with controlled restraint.'
      : 'Apply measured editorial impact with conservative restraint.');
  return `BOLD MODE (LEVEL ${BOLD_EDITORIAL_INTENSITY}):
${BOLD_EDITORIAL_KERNEL_BLOCK}
PROFILE STYLE: ${BOLD_EDITORIAL_PROFILE_STYLE[profileKey]}
STAGE DIRECTIVE: ${stageTone}
${BOLD_EDITORIAL_COMPOSITION_BLOCK}
${BOLD_EDITORIAL_REALISM_BLOCK}
${BOLD_EDITORIAL_SAFETY_BLOCK}
${intensityDirective}`;
}

const CAMERA_BLOCK = `CAMERA CONTROL: photoreal capture using portrait-focused lens language (24-35mm environmental portrait or 50/85mm compression), shallow depth of field, precise perspective, and clean subject separation. Canon EOS R5 II full-frame 45MP BSI-CMOS look; f/1.4-f/2.8; ISO 800-3200; shutter near 1/125s with subtle motion blur on moving extremities only. Dual-pixel AF on nearest iris. Visible grain, mild vignetting, subtle chromatic aberration at high-contrast edges. No flash; available-light realism only.`;

const LIGHT_BLOCK = `3D LIGHT TRANSPORT: physically causal mixed-CCT field with cool pool emitters (4200-4800K), warm practicals (1800-2400K), architectural support lights (2700-3200K), and ambient sky/city fill (5000-6500K). Maintain source-to-highlight consistency, soft indirect bounce from wet stone, depth-varying haze scatter, and AO at body-contact zones.`;

const SKIN_BLOCK = `SKIN BIO-OPTICAL RENDERING: realistic subsurface scattering, visible pores and micro-lines, preserved natural asymmetry, and no smoothing. Keep T-zone sheen, faint vellus hair rim response, tiny perspiration micro-specs, and stable complexion under mixed lighting.`;

const NO_TOUCH_BLOCK = `SUBJECT IS SOLO: No other people touching or overlapping her. No extra arms or hands near her shoulders or body. Keep both shoulders clear. No stray hands in frame behind her. Background patrons, if present, are distant and fully separated.`;

const IMPERFECTIONS_BLOCK = `RAW IMPERFECTIONS: visible ISO grain, mild chromatic aberration, faint flare ghosts, subtle lens distortion, soft highlight rolloff, and realistic compression noise in shadows; no retouching.`;

const CLOTH_PHYSICS_BLOCK = `CLOTH + BODY PHYSICS (BREAKTHROUGH x${PHYSICS_BREAKTHROUGH_MULTIPLIER.toFixed(1)}): solve force continuity at every strap/bridge/seam node before styling. Use finite-strain anisotropic cloth with warp/weft modulus split, viscoelastic damping, bend-shear coupling, and seam-tape stiffness multipliers. Wet-state mass + capillary adhesion must measurably alter drape, stretch, and rebound. Strain localizes near underbust/waist/hip transitions with visible compression/rebound at anchors. Edge binding + bridge members retain 0.6-1.2mm thickness cues under load. No slack load paths, no impossible buckling, no floating garment geometry.`;

const SCENE_PHYSICS_BLOCK = `ENVIRONMENT PHYSICS (BREAKTHROUGH x${PHYSICS_BREAKTHROUGH_MULTIPLIER.toFixed(1)}): solve coupled fluid-light behavior: capillary ripples + low-frequency swell + boundary meniscus; Beer-Lambert depth tinting; Fresnel-weighted reflections tied to local normals; wave-locked caustic drift on stone. Wet deck microfilms/puddles show dual-lobe specular behavior with roughness halos. Mist extinction varies with depth and emitter distance. Droplets/rivulets follow gravity, curvature, and obstacle interaction with plausible breakup and merge events.`;

const OPTICS_BLOCK = `OPTICAL SURFACES: marble behaves as glossy dielectric; mirrors show slight distortion and mild ghosting; glass exhibits internal reflection + refractive caustic streaks; metals carry narrow spec bands with controlled dispersion. For underwater/split-level viewpoints, enforce port refraction, Snell's window, total internal reflection outside the window, reduced underwater contrast, and plausible spectral attenuation.`;

const MICROSTRUCTURE_BLOCK = `MATERIAL MICROSTRUCTURE: resolve weave frequency, stitch pitch, lace relief depth, and subtle moire at distance. Satin filaments show directional sparkle; inserts maintain clean edge transitions and soft diffusion without aliasing.`;

const CONTACT_PRESSURE_BLOCK = `CONTACT + PRESSURE: micro-occlusion at seams, realistic skin displacement at strap anchors, gradual pressure falloff toward edges, and anatomically plausible micro-shadowing at all contact points.`;

const SPECTRAL_PHYSICS_BLOCK = `SPECTRAL + POLARIZATION: satin highlights show polarization dimming; thin-film areas show soft interference bands; haze scatters warmer near-field, cooler far-field.`;

const SULTRY_MOOD_BLOCK = `GLAMOUR EDITORIAL MOOD: high-end nocturne poolside fashion with confident gaze, composed body language, and premium cinematic atmosphere. Keep tone elegant, restraint-first, and non-explicit. Documentary-real skin/texture response with natural expression and zero caricature.`;

const PHYSICS_INNOVATION_BLOCK = `PHYSICS INNOVATION PRIORITY (BREAKTHROUGH x${PHYSICS_BREAKTHROUGH_MULTIPLIER.toFixed(1)}): enforce first-principles closure chain: boundary conditions -> constitutive response -> transport -> sensor evidence. Use energy-conserving GGX/Smith with anisotropic weave-aligned lobes, multi-scatter compensation, and stable spectral response under mixed CCT lighting. Model cloth as finite-strain anisotropic shell with viscoelastic damping, seam-beam reinforcement, collision thickness, and frictional contact against skin. Apply fluid-structure coupling for wet cloth: capillary bridges, rivulet steering by seam topology, and roughness-state transitions. Optics must show source-consistent highlights, Fresnel behavior, and wave-coupled caustics; sensor output keeps microcontrast, grain, and non-smoothed pore/thread evidence.`;
const SENSUAL_REALISM_BLOCK = `CONFIDENT REALISM (TASTEFUL): emphasize calm eye contact, natural clavicle/shoulder tension, breathing plausibility, damp skin sheen, and believable fabric interaction. Keep tone elegant, non-explicit, and compliance-safe.`;
const PHYSICS_FORENSICS_BLOCK = `PHYSICS FORENSICS (MANDATORY, FAIL-CLOSED): run first-principles audit on every frame. (1) FORCE BALANCE: all strap/bridge/seam loads terminate at plausible supports. (2) MOMENT BALANCE: no torsion contradictions at narrow bridges. (3) GEOMETRY CONSISTENCY: no interpenetration, non-manifold edges, or seam discontinuities. (4) ENERGY PLAUSIBILITY: reflected + diffuse + transmitted light remains source-consistent. (5) OPTICAL CAUSALITY: each major highlight has a real emitter + valid normal. (6) WET/DRY SEPARATION: roughness + lobe width visibly diverge by moisture state. (7) SENSOR EVIDENCE: microcontrast/grain present with no plastic smoothing.`;
const WET_INTERACTION_BLOCK = `WET INTERACTION: thin water film on skin produces tight specular streaks; micro droplets bead on lace filaments and settle in concave weave cells; capillary bridges along cutout edges create darker wet lines; wet-to-dry transitions show a subtle roughness gradient.`;

const MEASURED_CONSTRAINTS_BLOCK = `MEASURED CONSTRAINTS: strap compression 1–3mm; seam puckering 1–2mm; hem curl 2–4mm; cutout edge thickness 0.6–1.2mm; fabric thickness 0.3–0.6mm with lining 0.2–0.4mm; microfold wavelengths 8–20mm; specular roughness 0.08–0.22; negative‑space ratio 45–60% with continuous load paths; bridge span 22–45mm; neckline angle 78–90°.`;

const CREATIVE_ATTIRE_BLOCK = `CREATIVE ATTIRE (DARING-FIRST): every attempt must debut a distinct stage-ready couture lace-swimsuit architecture plus a new colorway. Do not reuse layouts. Push deeper engineered plunge geometry, stacked/offset cutouts, assertive high-cut lines, asymmetric seam maps, ring/bridge tension members, and aggressive negative-space carving. Elevate daring by one notch beyond baseline while keeping structure luxe and coverage-safe with opaque support zones.`;

const PHYSICS_ONLY_ATTIRE_BLOCK = `PHYSICS-FIRST ATTIRE: prioritize dimensions, curvature, tension, stiffness, load paths, stitch pitch, stretch/shear response, edge binding tension, and compression fit. Keep aesthetic wording concise except lace‑motif IDs that support physics.`;

// Keep this "daring" in an engineering sense (geometry/tension), not in sexualized language.
const DARING_CUT_BLOCK = `ENGINEERED NECKLINE + CUTOUTS: plunge/keyhole extends to navel line with ultra-narrow center gore (3-8mm), dual hidden stays, and tensioned illusion-mesh cradle; stacked/offset side windows with reinforced beveled edges; open back to low waist. Maintain full coverage using opaque lined support panels (no explicit nudity; no see-through).`;

const NEGATIVE_SPACE_BLOCK = `NEGATIVE-SPACE GEOMETRY: front-panel void ratio 35–50% with continuous load paths; cutout edges reinforced and beveled; tension lines radiate from strap anchors and converge toward the waist seam.`;
const NEGATIVE_SPACE_MAX_BLOCK = `NEGATIVE-SPACE (MAX): front-panel void ratio 58–74% with uninterrupted load paths; cutout edges reinforced and beveled; tension lines radiate from strap anchors and converge toward waist/underbust seams; strap bridges remain under high tension without twisting, necking, or warping.`;

const AIRFLOW_PHYSICS_BLOCK = `AIRFLOW + HEAT: subtle HVAC airflow lifts a few hair strands; candle heat shimmer distorts background highlights; micro-cloth flutter at loose edges.`;

const WARDROBE_CONSTRUCTION_BLOCK = `WARDROBE CONSTRUCTION: internal boning and micro-stays stabilize the neckline; hidden clear tape prevents slip. Seams align to body landmarks with subtle stitch puckering; clasp hardware shows tiny specular edges; closures sit under tension without warping the fabric.`;

const SAFETY_BLOCK = `FASHION SAFETY: daring couture swimwear but fully covered; no explicit nudity; no see-through.`;

const LIGHT_TRANSPORT_DEEP_BLOCK = `LIGHT TRANSPORT: multi‑bounce radiance; tungsten pools hard falloff, neon spill adds wavelength tint. Specular obeys Fresnel; diffuse bounce warms near‑field. Haze adds soft halos; reflection sharpness varies with micro‑roughness.`;

const MATERIAL_MECHANICS_BLOCK = `MATERIAL MECHANICS (3x): orthotropic cloth with warp/weft stiffness; Young’s modulus 0.2–1.2 GPa, shear 0.05–0.25 GPa, bending 0.4–1.6 N·mm. Damping 0.08–0.18; density 0.9–1.2 g/cm³; seam tape adds localized stiffness 1.5–2.5x. Seams act as stiffened beams with torsional resistance; collision thickness prevents interpenetration. Edge binding tension keeps cutouts stable; fasteners carry tensile loads without warping.`;

const SENSOR_PIPELINE_BLOCK = `SENSOR PIPELINE: raw Bayer demosaic; preserve noise floor; gentle S‑curve rolloff; no beauty smoothing; keep micro‑contrast at pores and weave.`;

const FIT_TAILORING_BLOCK = `BESPOKE FIT (TAILORED TO THIS WOMAN): garment is drafted to her exact torso/waist/hip proportions, with contour seams aligned to her natural body landmarks. Bust shaping uses narrow‑span cups + internal stays + tensioned mesh to support a deep plunge without slip; waist suppression is subtle but precise; hip line follows her curvature without gapping. Strap tension and seam alignment are tuned to her posture and pose, producing realistic micro‑compression and rebound at anchor points.`;

const BIOMECH_BLOCK = `BIOMECHANICS: posture and pose remain identical, but fabric load paths respond to gravity and body curvature. Straps carry tensile load; seams carry shear; cutout edges behave as stiffened beams. The dress is stable without slipping; tension gradients are strongest at anchors and relax toward hem.`;

const ANATOMY_ANCHOR_BLOCK = `ANATOMY ANCHORS: neckline apex aligns just above the navel; strap anchors align to clavicle and posterior deltoid; waist seam aligns to her natural waist; hip cutout apex aligns near iliac crest. No geometry should drift off these landmarks.`;

const ATTIRE_GEOMETRY_DEEP_BLOCK = `GARMENT GEOMETRY DEEP DIVE: define curvature radii along the neckline lip (18–40mm), underbust arc (22–40mm), armhole arcs (35–60mm), and cutout edges (20–55mm). Edge bevels are 0.6–1.2mm with visible thickness. Load paths: straps -> neckline stays -> waist seam -> hip anchors. Keep continuous tensile paths; no slack bridges.`;

const COLOR_METAMERISM_BLOCK = `COLOR + METAMERISM: color appearance must remain stable under mixed tungsten/neon lighting; metallic highlights shift hue subtly with angle due to thin-film interference; avoid flat color patches.`;

const SCENE_CAUSTICS_BLOCK = `SCENE CAUSTICS: pool water casts moving caustic patterns on stone and nearby surfaces; wet deck shows glossy specular streaks; glassware shows small refractive streaks.`;

const SWIMSUIT_BLOCK = `LACE SWIMWEAR (PHYSICS): architectural couture lace one-piece with engineered plunge/keyhole, dual-stay stabilization, anchored stacked side windows, low-waist open-back span, and micro-rings/grommets/buckles that visibly carry load. Lace motif and cutout topology must be unique each attempt. Coverage remains intact via opaque lined support panels (no explicit nudity; no see-through).`;
const SAFE_SWIMSUIT_BLOCK = SWIMSUIT_BLOCK;

// Higher-signal physics guidance for realism without pushing safety boundaries.
const SWIMWEAR_PHYSICS_BLOCK = `SWIMWEAR PHYSICS (MANDATORY): solve from first principles: anchor forces -> seam strain -> optical evidence. Wet fabric adhesion follows surface tension and local curvature; lace/mesh tension is highest at anchors and decays continuously between supports; bonded edge thickness 0.6–1.2mm with bevel and visible compression zones; rings/grommets show contact pressure and plausible load transfer; droplets/rivulets obey gravity + surface normals and generate micro-caustic highlights; wet deck/coping shows coherent spec streaks and damp micro-pitting; no plastic skin, no smoothing, no decorative non-causal artifacts.`;

const EDGY_ATTITUDE_BLOCK = `EDGY ATTITUDE: confident nightlife-forward energy; bold presence with steady eye contact, controlled power, and elegant restraint.`;
const POSE_TENSION_BLOCK = `POSE ENERGY: within the specified pose, engage shoulders/core/hips with subtle tension; keep it natural and anatomically plausible.`;
// Removed: "AGGRESSIVE SEDUCTION" phrasing tends to correlate with model safety blocks.
const PLUNGE_ENGINEERING_BLOCK = `PLUNGE ENGINEERING: opaque micro‑cups with internal stays + tensioned mesh cradle the plunge; narrow center gore 6–12mm; underbust contour seam carries load; no slippage or gaping; coverage maintained.`;
const HIP_CUTOUT_BLOCK = `HIP CUTOUT GEOMETRY: high‑cut hips with cutout apex 2–5mm from iliac crest; bonded edge thickness 0.6–1.2mm; strap bridges 3–6mm under high tension; negative space reads extreme but stable.`;

const SCENE_BASE = `LUXURY POOL SETTING (BASE): high-end private luxury pool environment. Follow the concept-specific location, architecture, materials, props, and time-of-day. Wet surfaces, believable reflections, and pool-caustics where visible.`;

const POSE_PHYSICS_BLOCK = `POSE + CONTACT PHYSICS: anatomically plausible joint angles, balanced center of mass, believable contact pressure on deck/rail/lounger/waterline; no extra limbs; hands/feet count correct; no extra fingers; no fused hands.`;

const SCENE_SPECTACLE_BLOCK = `SCENE DESIGN + PHYSICS: underwater LED gradients, wet-deck speculars, rippling caustics on nearby surfaces, subtle haze; reflections obey Fresnel and distort with wave curvature.`;

const SEDUCTIVE_SCENE_BLOCK = `GLAMOUR SCENE: warm practical lantern clusters, low-key edge lighting, shallow steam/mist, wet stone reflections, and clean uncrowded composition. Warm light pools against cool water glow for cinematic contrast without explicit framing cues.`;
const SULTRY_SCENE_SAFE_BLOCK = `SULTRY SCENE DIRECTION (SAFE): emphasize low-key contrast lighting, warm practicals against cool pool spill, thin steam haze, and reflective wet surfaces. Keep the atmosphere moody and confident while preserving non-explicit composition and coverage-safe styling cues.`;

const ALLURE_ATTIRE_BLOCK = `EDITORIAL LINES: engineered deep supported V/keyhole architecture, narrow stabilized bridge network, stacked anchored side windows, open back to low waist, and sculpted ultra-high-cut legline; opaque panels maintain coverage. Emphasize tensioned edges, hardware load paths, and couture construction.`;
const SAFE_ALLURE_ATTIRE_BLOCK = `EDITORIAL FIT: bold couture geometry, sculpted waist, elevated high-cut legline, controlled side contour windows, and opaque support continuity.`;
const SENSUAL_INVITATION_BLOCK = `EDITORIAL TONE: refined, cinematic, and composed with confident presence. Prioritize luxe light contrast and tactile material realism while keeping all framing non-explicit.`;
const SAFE_DARING_CUT_BLOCK = `NECKLINE + CUTOUTS (SAFE): deep V neckline with narrow center gore, supportive mesh stabilization, and anchored side cutouts; open back to mid‑waist; coverage intact.`;
const SAFE_ANATOMY_ANCHOR_BLOCK = `ANATOMY ANCHORS (SAFE): neckline apex aligns to lower sternum; strap anchors align to clavicle and posterior deltoid; waist seam aligns to natural waist; hip cutout apex aligns near iliac crest.`;
const SAFEST_ATTIRE_BLOCK = `ATTIRE (SAFE BASELINE): high‑fashion lace swimwear, fully covered, no explicit content; unique motif and colorway; editorial styling with clean tension paths.`;

const PHYSICS_MAX_START = 601;
const PHYSICS_MAX_END = 620;

function conceptNumber(concept) {
  const n = parseInt((concept?.name || '').split('-')[0], 10);
  return Number.isNaN(n) ? null : n;
}

function isPhysicsMaxConcept(concept) {
  const n = conceptNumber(concept);
  return n !== null && n >= PHYSICS_MAX_START && n <= PHYSICS_MAX_END;
}

const PHYSICS_MAX_TONE_BLOCK = `EDITORIAL TONE (PHYSICS-MAX): documentary-fashion realism, composed and restrained expression, technical believability over stylization; no flirtatious framing language.`;
const PHYSICS_DRIVER_LOCK_BLOCK = `EVENT DRIVER LOCK (MANDATORY): keep exactly one dominant physical driver from the concept scene and at most one secondary support driver; do not add extra spectacle systems.`;
const PHYSICS_CAUSAL_CHAIN_BLOCK = `CAUSAL CHAIN (MANDATORY): explicitly preserve force field -> material response -> optical consequence -> camera evidence. If a detail does not support this chain, omit it.`;
const PHYSICS_CAMERA_EVIDENCE_BLOCK = `CAMERA EVIDENCE (MANDATORY): realism must be provable in-frame via coherent seam tension, wet/dry roughness separation, and highlight behavior consistent with lens/exposure settings.`;
const PHYSICS_ARTIFACT_EXCLUSION_BLOCK = `ARTIFACT EXCLUSIONS (HARD): no floating straps, no seam discontinuity, no texture swimming, no impossible reflections, no over-smoothed skin, no non-manifold garment geometry.`;
const DARING_5X_ALLURE_BLOCK = `ATTIRE INTENT (5X DARING): event-headliner couture swimwear with extreme architectural linework, aggressive negative-space carving, and assertive high-cut geometry. This is intentionally one notch bolder than baseline, expressed through engineering precision, not nudity; opaque support zones remain intact.`;
const DARING_5X_BLOCK = `ENGINEERED SILHOUETTE (5X DARING): plunge apex reaches navel line with rigid dual-stay stabilization; side windows are larger, vertically stacked, and asymmetrically offset; open-back span reaches low waist; bridge members are ultra-narrow but mechanically credible under visible tension.`;
const DARING_5X_PLUNGE_BLOCK = `PLUNGE ENGINEERING (5X): plunge depth 320–390mm to navel line with center gore 3–8mm, dual hidden stays, tensioned mesh cradle, and underbust load transfer seam; zero slip, zero gaping, coverage-safe opaque support remains intact.`;
const DARING_5X_HIP_BLOCK = `HIP CUTOUT GEOMETRY (5X): high-cut legline with cutout apex 0–2mm from iliac crest, bridge width 2–4mm, bonded edge thickness 0.6–1.1mm; strong tension gradients at anchors with stable deformation.`;
const DARING_5X_NEGATIVE_SPACE_BLOCK = `NEGATIVE-SPACE (5X DARING): front + lateral void ratio 68–82% with uninterrupted structural load paths; reinforced beveled edges; ultra-narrow strap bridges run at high tension without twist, buckle, or local collapse.`;
const PHYSICS_STANDARD_V2_BLOCK = `PHYSICS STANDARD V2 (BREAKTHROUGH x${PHYSICS_BREAKTHROUGH_MULTIPLIER.toFixed(1)}): derive image detail from first principles: force balance, momentum continuity, constitutive response, transport, then camera evidence. Highlights map only to explicit emitters; shadow families share direction logic; caustics remain wave/geometry-coupled; no orphan reflections, contradictory rim lights, or non-causal glow halos.`;
const PHYSICS_MATERIAL_CAL_BLOCK = `MATERIAL CALIBRATION (MANDATORY): fabric areal density 180-320 g/m^2; anisotropic stretch with larger weft elongation than warp; wet-state mass increase 6-14%; seam reinforcement extension below adjacent panel strain; bridge members show localized compression/rebound and strain gradients at anchors; edge curl constrained to 1-4mm unless mechanically locked.`;
const PHYSICS_FLUID_CAL_BLOCK = `FLUID CALIBRATION (MANDATORY): water film thickness 8-160um; droplet radii 0.1-2.4mm; boundary meniscus is visible; rivulets follow gravity + curvature + stitch-channel guidance; splashes/spray show plausible ballistic arcs, breakup timing, depth-dependent blur, and emitter-consistent sparkle.`;
const PHYSICS_OPTICS_CAL_BLOCK = `OPTICS CALIBRATION (MANDATORY): water IOR ~1.333, glass ~1.50; wet regions have lower roughness + narrower spec lobes than dry regions; Fresnel gain rises at grazing angles; mixed CCT lighting keeps neutral skin baseline while allowing controlled colored spill; highlight rolloff follows lens/sensor response without clipped neon halos.`;
const PHYSICS_VALIDATION_GATE_BLOCK = `VALIDATION GATE (FAIL IF ANY BREAK): (1) seam/bridge tension continuity, (2) anchor loads visibly supported, (3) moment balance at narrow bridges, (4) wet/dry roughness separation, (5) primary event driver affects cloth + fluid + light, (6) reflection/refraction geometry source-consistent, (7) no interpenetration/non-manifold cloth, (8) no orphan highlights, (9) no contradictory shadow families, (10) no listed artifacts.`;
const PHYSICS_CAMERA_COMPACT_BLOCK = `CAMERA EVIDENCE CORE: full-frame capture, shallow-DOF natural optics, available-light exposure, visible ISO grain, and physically consistent highlight rolloff.`;
const PHYSICS_LIGHT_COMPACT_BLOCK = `LIGHT TRANSPORT CORE: one coherent key family plus controlled support spill; shadow-direction consistency; wet specular tracks tied only to actual emitters.`;
const PHYSICS_SENSOR_COMPACT_BLOCK = `RAW PIPELINE CORE: mild CA/vignette/compression and preserved microcontrast in pores, seams, and lace thread relief (no beauty smoothing).`;
const PHYSICS_CLOTH_COMPACT_BLOCK = `CLOTH CORE: anisotropic stretch/shear, anchor-to-seam tension continuity, visible edge thickness, local bridge compression/rebound, and stable motif scale under deformation.`;
const POLICY_RECOVERY_DARING_CONSTRAINT_BLOCK = `POLICY-RECOVERY DARING CONSTRAINT: preserve runway-bold couture impact with safety-robust geometry: target negative-space ratio 58-70% using opaque tonal power-mesh infill, center gore >= 6mm, bridge width >= 3mm, assertive ultra-high-cut legline, asymmetric side contour windows, and reinforced edge architecture with visible load paths. Keep non-explicit framing and uninterrupted opaque support zones.`;
const POLICY_RETRY_PRECISION_BLOCK = `FIRST-RETRY PRECISION MODE (ANTI-FLAG): keep coverage constraints explicit while increasing deterministic detail fidelity: seam/load continuity, edge thickness cues, stitch-pitch variance, emitter-locked highlights, wet/dry roughness split, and microtexture realism. Prefer measurable constraints over stylistic intensity.`;
const POLICY_RETRY_PRECISION_DOUBLE_BLOCK = `FIRST-RETRY PRECISION CHECKLIST (HARD): explicitly preserve opaque support map and non-explicit framing while enforcing measurable closure: (1) seam network force residual <= 5%, (2) bridge continuity drift <= 2mm, (3) wet/dry roughness split >= 0.06, (4) highlight-to-emitter reprojection error <= 2px, (5) thread-level microcontrast retained with no denoise smear.`;
const POLICY_ESCAPE_DELTA_BLOCK = `POLICY ESCAPE DELTA MODE (MANDATORY): hold identity/pose/framing/scene/camera locks exactly and reduce risk aperture one notch while preserving engineered support continuity. Do not add deeper plunge or additional cutout exposure; prioritize physically causal microphysics + optics gains only.`;
const POLICY_SAFE_DARING_BLOCK = `DARING WITHOUT FLAG RISK (MANDATORY): increase boldness through engineering, not exposure: deeper supported V/keyhole architecture, asymmetric seam routing, sculpted ultra-high-cut legline, stacked contour channels, narrow but stable bridge members, metallic hardware accents, and tension-defined silhouette. Coverage stays fully opaque in core zones with uninterrupted power-mesh support; no explicit styling language; no suggestive framing cues.`;
const INNOVATIVE_DARING_TECHNIQUES_BLOCK = `INNOVATIVE DARING TECHNIQUES (MANDATORY): apply computational couture methods: topology-optimized cutline map, tensegrity micro-bridge network, dual-layer shell (lace exoskeleton + opaque power-mesh underlay), asymmetric phase-offset contour channels (15-35mm), variable-width edge binding (0.7-1.3mm), and hardware-coupled load redirection nodes. Read as bolder through structure, not exposure; opaque core support remains continuous.`;
const INNOVATIVE_PHYSICS_TECHNIQUES_BLOCK = `INNOVATIVE PHYSICS TECHNIQUES (MANDATORY): solve garment + fluid + optics with measurable closure: seam-network force residual <= 5%, anchor displacement continuity <= 2mm, wet/dry roughness split >= 0.06, and highlight-to-emitter reprojection error <= 2px. Apply capillary-flow routing along stitch channels, anisotropic strain transfer from bridges to waist seam, and emitter-locked caustic coherence on nearby wet surfaces.`;
const FOURK_MICRODETAIL_FORENSICS_BLOCK = `4K MICRODETAIL FORENSICS (MANDATORY): resolve sub-mm evidence at 3-32px scale: thread twist relief, stitch-pitch variance (±0.2mm), edge-fiber fray, adhesive seam meniscus, anchor pressure blanching, pore-level spec breakup, micro-droplet contact angle spread, and rivulet thickness gradients. Reject any denoise smear, texture washout, or repetitive synthetic patterns.`;
const FOURK_DELTA_EDIT_WINDOW_BLOCK = `4K DELTA WINDOW: in refinement passes, edits are local and high-frequency only (3-32px structures). Preserve macro silhouette/framing/lighting exactly; improve only physically causal microdetail.`;
const BREAKTHROUGH_PROMPT_OS_BLOCK = `BREAKTHROUGH PROMPTING OS: optimize by objective hierarchy, not style drift. Objective order is immutable: (1) identity fidelity, (2) compliance safety, (3) physical causality, (4) daring couture geometry, (5) sensor realism. If any higher objective is threatened, repair it before advancing lower objectives.`;
const BREAKTHROUGH_QUALITY_UPLIFT_BLOCK = QUALITY_UPLIFT_MULTIPLIER > 1.0
  ? `QUALITY UPLIFT MANDATE: treat baseline target ${TARGET_QUALITY_GAIN_BASE_PCT.toFixed(1)}% as floor and enforce +${((QUALITY_UPLIFT_MULTIPLIER - 1) * 100).toFixed(0)}% uplift pressure to effective target ${TARGET_QUALITY_GAIN_PCT.toFixed(1)}% using physically causal gains only (seam/load evidence, wet/dry roughness separation, emitter-locked highlights, thread-level detail).`
  : `QUALITY TARGET MANDATE: sustain effective target ${TARGET_QUALITY_GAIN_PCT.toFixed(1)}% using physically causal gains only.`;
const BREAKTHROUGH_PROMPT_DECISION_TREE_BLOCK = `DECISION TREE (FAIL-SAFE): if identity drifts -> restore identity geometry first; if policy risk rises -> reduce aperture one notch while preserving engineered load paths; if physics breaks -> reduce to one dominant scene driver and recompute force -> material -> optics chain; if detail is soft -> increase only physically causal micro-evidence (seam tension, wet/dry roughness split, emitter-consistent highlights).`;
const BREAKTHROUGH_PROMPT_VALIDATION_LOOP_BLOCK = `VALIDATION LOOP: generate candidate framing internally, then run a strict pass/fail gate for identity/compliance/physics/optics. Reject any candidate with contradictory shadow direction, orphan highlights, unstable bridge tension, or non-causal texture artifacts. Output only the best passing candidate.`;
const CREATIVE_EVENT_MOMENT_BLOCK = `CREATIVE EVENT MOMENT: include exactly one signature experiential cue per frame (for example halo light ring, waterwall prism, kinetic mist vortex, synchronized wristband glow, or laser helix) and force it to influence cloth response, fluid behavior, and reflections. Keep one hero cue only; avoid multi-effect clutter.`;
const PASSA_COARSE_TO_FINE_BLOCK = `PASS A COARSE-TO-FINE PHYSICS PLAN (INNOVATION): stage-1 lock macro scene/pose/contact; stage-2 solve garment force paths + seam/bridge support; stage-3 solve wet fluid transport + roughness-state transitions; stage-4 solve optics/sensor evidence (emitter-locked highlights, Fresnel-consistent reflections, thread/pore microcontrast). If a later stage breaks an earlier stage, rollback and preserve earlier-stage truth.`;
const PASSA_BOUNDARY_CONDITIONS_BLOCK = `PASS A BOUNDARY CONDITIONS: use one dominant scene driver + one support driver max; enforce continuity at anchor points, moment balance at narrow bridges, and no non-causal reflections. Keep prompts physically explicit and concise; prefer measurable constraints over stylistic adjectives.`;
const PASSB_DELTA_LOCK_BLOCK = `PASS B DELTA EDIT LOCK (DIFFERENT APPROACH): treat pass A as immutable scaffold. Preserve identity, face geometry, pose, framing, camera, and global light field exactly. Edit only microphysics deltas that are directly visible in-frame.`;
const PASSB_STRUCTURAL_BEAM_BLOCK = `DELTA BEAM A (STRUCTURAL): improve seam/load continuity, bridge tension, edge thickness cues, compression/rebound at anchors, and lace filament topology under strain.`;
const PASSB_OPTICAL_BEAM_BLOCK = `DELTA BEAM B (OPTICAL): improve wet/dry roughness separation, caustic coherence, emitter-locked highlight placement, spectral stability, and sensor microcontrast/grain realism.`;
const PASSB_BALANCED_BEAM_BLOCK = `DELTA BEAM C (BALANCED): apply only the intersection of structural + optical edits that do not perturb composition or compliance safety.`;
const PASSB_FIRST_PRINCIPLES_RESET_BLOCK = `FIRST-PRINCIPLES RESET (PASS B): start from immutable truths only: identity lock, coverage lock, pose/framing lock, camera/light lock, and physically causal micro-edits. Remove any instruction that does not directly support these truths.`;
const PASSB_ASSUMPTION_BREAKER_BLOCK = `ASSUMPTION BREAKER (PASS B): reject cargo-cult heuristics: (1) more exposure does not mean more impact, (2) more visual effects do not mean more realism, (3) more adjectives do not mean more detail. Impact must come from causal evidence and coherent timing.`;
const PASSB_EVENT_LAYER_STACK_BLOCK = `EVENT LAYER STACK (PASS B): L1 architecture/set dressing (static), L2 kinetic atmosphere (water/mist/light), L3 performer + garment interaction. Every visible refinement must map to exactly one layer and one causal link.`;
const PASSB_MOMENT_CAPTURE_RULE_BLOCK = `MOMENT CAPTURE RULE (PASS B): output one decisive peak-memory frame at cue apex where cue timing, cloth tension, and caustic placement are maximally coherent. No multi-moment composites and no extra spectacle systems.`;
const PASSB_FIRST_PRINCIPLES_QA_BLOCK = `FIRST-PRINCIPLES QA (PASS B): before output verify: (a) identity unchanged, (b) cue -> material response -> optical evidence chain closes, (c) edits stay local/micro and do not recompose the frame, (d) compliance-safe framing remains intact.`;

function formatPromptFailureHints(lessons = [], max = PROMPT_FAILURE_HINTS_MAX) {
  const hints = normalizeLessons(lessons, Math.max(2, max));
  if (!hints.length) {
    return '- Keep identity/compliance hard-locked while increasing measurable physics evidence.';
  }
  return hints.slice(0, max).map((item, idx) => `- H${idx + 1}: ${item}`).join('\n');
}

function buildRetryPrecisionBlock(mode = '') {
  const normalized = String(mode || '').trim().toLowerCase();
  if (!normalized || normalized === 'off' || normalized === 'none') return '';
  if (normalized === 'double') {
    return `${POLICY_RETRY_PRECISION_BLOCK}\n${POLICY_RETRY_PRECISION_DOUBLE_BLOCK}`;
  }
  return POLICY_RETRY_PRECISION_BLOCK;
}

function buildPolicyEscapeBlock(mode = '') {
  const normalized = String(mode || '').trim().toLowerCase();
  if (!normalized || normalized === 'off' || normalized === 'none') return '';
  return POLICY_ESCAPE_DELTA_BLOCK;
}

function appendInitialAttemptBoost(promptText) {
  const src = String(promptText || '').trim();
  if (!src) return src;
  if (src.includes('INITIAL-ATTEMPT MICRODETAIL PUSH (MANDATORY):')) return src;
  return `${src}\n\n${INITIAL_ATTEMPT_MICRODETAIL_BLOCK}\n${POLICY_MICRODETAIL_RESOLUTION_BLOCK}`;
}

function buildBreakthroughPromptSkillBlock({ stage = 'passA', approach = 'A', lessons = [], profile = 'balanced' } = {}) {
  if (!PROMPT_SKILLSTACK_ENABLED) return '';
  const approachKey = normalizeApproach(approach, 'A');
  const stageFocus = stage === 'passB'
    ? 'microphysics refinement and sensor-evidence closure under fixed macro locks'
    : 'macro scene lock plus first-pass physics closure from scene to sensor';
  const approachFocus = approachKey === 'B'
    ? 'directorial execution with hard QA gates'
    : (approachKey === 'C'
      ? 'A/B fusion guided strictly by measured audit wins'
      : 'physics-spec execution with explicit causal contracts');
  const hintBlock = formatPromptFailureHints(lessons);
  const boldBlock = buildBoldEditorialKernel({ stage, profile });
  const wardrobeLockBlock = stage === 'passB'
    ? PASSB_ATTIRE_CONTINUITY_BLOCK
    : SOURCE_ATTIRE_REPLACEMENT_BLOCK;
  return `PROMPT SKILL STACK (LEVEL ${PROMPT_BREAKTHROUGH_LEVEL}):
${BREAKTHROUGH_PROMPT_OS_BLOCK}
${BREAKTHROUGH_QUALITY_UPLIFT_BLOCK}
STAGE FOCUS: ${stageFocus}
APPROACH FOCUS: ${approachFocus}
${IDENTITY_DRIFT_FAILSAFE_BLOCK}
${wardrobeLockBlock}
${BREAKTHROUGH_PROMPT_DECISION_TREE_BLOCK}
${BREAKTHROUGH_PROMPT_VALIDATION_LOOP_BLOCK}
RECENT FAILURE HINTS:
${hintBlock}
${boldBlock}`;
}

function passBHeroCueForProfile(profile = 'balanced', beam = '') {
  const key = normalizeFrontierProfile(profile || 'balanced');
  const beamKey = String(beam || '').trim().toLowerCase();
  if (beamKey === 'optical') {
    return 'projection-mapped ripple pass across wet marble with emitter-locked caustic drift';
  }
  if (beamKey === 'structural') {
    return 'single halo key pulse that reveals seam tension and bridge compression at peak load';
  }
  if (key === 'clean') {
    return 'architectural light sweep through balustrade with restrained mist edge';
  }
  if (key === 'intimate') {
    return 'lantern pulse + thin mist halo with low-amplitude caustic surge';
  }
  return 'one cinematic activation cue (water/light intersection) at a single peak instant';
}

function buildPassBInnovativeMethodBlock({ profile = 'balanced', approach = 'B', safeMode = false, beam = '' } = {}) {
  const approachKey = normalizeApproach(approach, 'B');
  const cue = passBHeroCueForProfile(profile, beam);
  const safetyClause = safeMode
    ? 'Use compliance-forward wording and keep opaque support continuity explicit in every edit directive.'
    : 'Keep direction bold but non-explicit; express daring through engineering precision and cue timing, not exposure.';
  return `PASS B METHOD SHIFT (${approachKey}):
${PASSB_FIRST_PRINCIPLES_RESET_BLOCK}
${PASSB_ASSUMPTION_BREAKER_BLOCK}
CREATIVE EVENT CUE (PASS B): treat this frame as a private one-night activation. Keep exactly one hero cue: ${cue}.
${PASSB_EVENT_LAYER_STACK_BLOCK}
${PASSB_MOMENT_CAPTURE_RULE_BLOCK}
${PASSB_FIRST_PRINCIPLES_QA_BLOCK}
${safetyClause}`;
}

function buildPromptPassA(concept, expression, variation, fallback = false) {
  const variationLine = variation
    ? `\nVARIATION TAG (UNIQUE): ${variation.theme.name} | ${variation.vibe.name} | ${variation.colorway.name} | ${variation.motif.name}\n`
    : '';
  const physicsMax = isPhysicsMaxConcept(concept);
  const design = variation ? composeDesignSpec(concept, variation, fallback) : { color: '', brief: '', material: fallback ? concept.materialFallback : concept.material };
  const physicsMaxPrimary = physicsMax && !fallback;
  const swimsuitBlock = fallback ? SAFE_SWIMSUIT_BLOCK : SWIMSUIT_BLOCK;
  const allureBlock = physicsMaxPrimary ? DARING_5X_ALLURE_BLOCK : (fallback ? SAFE_ALLURE_ATTIRE_BLOCK : ALLURE_ATTIRE_BLOCK);
  const daringBlock = physicsMaxPrimary ? DARING_5X_BLOCK : (fallback ? SAFE_DARING_CUT_BLOCK : DARING_CUT_BLOCK);
  const plungeBlock = physicsMaxPrimary ? DARING_5X_PLUNGE_BLOCK : PLUNGE_ENGINEERING_BLOCK;
  const hipBlock = physicsMaxPrimary ? DARING_5X_HIP_BLOCK : HIP_CUTOUT_BLOCK;
  const negativeSpaceBlock = physicsMaxPrimary ? DARING_5X_NEGATIVE_SPACE_BLOCK : NEGATIVE_SPACE_MAX_BLOCK;
  const moodBlock = physicsMax ? PHYSICS_MAX_TONE_BLOCK : SULTRY_MOOD_BLOCK;
  const invitationBlock = physicsMax ? '' : SENSUAL_INVITATION_BLOCK;
  const edgyBlock = physicsMax ? '' : EDGY_ATTITUDE_BLOCK;
  const sceneFlavorBlock = physicsMax ? '' : SEDUCTIVE_SCENE_BLOCK;
  const physicsMaxContractBlock = physicsMax
    ? `${PHYSICS_DRIVER_LOCK_BLOCK}\n${PHYSICS_CAUSAL_CHAIN_BLOCK}\n${PHYSICS_CAMERA_EVIDENCE_BLOCK}\n${PHYSICS_ARTIFACT_EXCLUSION_BLOCK}`
    : '';
  const physicsStandardBlock = physicsMax
    ? `${PHYSICS_STANDARD_V2_BLOCK}\n${PHYSICS_MATERIAL_CAL_BLOCK}\n${PHYSICS_FLUID_CAL_BLOCK}\n${PHYSICS_OPTICS_CAL_BLOCK}\n${PHYSICS_VALIDATION_GATE_BLOCK}`
    : '';
  const deepSkillBlock = buildBreakthroughPromptSkillBlock({ stage: 'passA', approach: 'A' });
  if (fallback) {
    return `Generate an image of this photograph edited into a raw real-life luxury pool photograph indistinguishable from an unretouched candid shot from a real poolside night. Subject is an adult woman (21+). Preserve exact identity, face, bone structure, eyes, nose, mouth, and age. Use the photo as an identity reference; allow a different full-body pose. Expression: ${expression}. Change outfit and environment as described. Avoid retouching.

INVARIANTS:
- Preserve exact identity/face/age; keep the specified expression: ${expression}.
- Pose must be different for this concept; follow POSE DIRECTIVE precisely with realistic anatomy and camera physics.
- Only change environment + outfit; subject is solo; no retouching.
ENVIRONMENT: ${SCENE_BASE} ${concept.scene}
POSE DIRECTIVE (DIFFERENT EACH IMAGE): ${concept.pose}
${POSE_PHYSICS_BLOCK}
${IMAGE_INTENT_BLOCK}
${FOURK_QUALITY_OBJECTIVE_BLOCK}
${deepSkillBlock}
${IDENTITY_LOCK_BLOCK}
${REFERENCE_AUTHORITY_BLOCK}
${STEPWISE_SCENE_BUILD_BLOCK}
${REFINEMENT_ORDER_BLOCK}
${SEMANTIC_NEGATIVE_BLOCK}
${SENSUAL_REALISM_BLOCK}

${moodBlock}
${invitationBlock}
${edgyBlock}
${POSE_TENSION_BLOCK}

${SCENE_SPECTACLE_BLOCK}
${CREATIVE_EVENT_MOMENT_BLOCK}
${sceneFlavorBlock}
${physicsMaxContractBlock}
${physicsStandardBlock}

${CREATIVE_ATTIRE_BLOCK}
${PHYSICS_ONLY_ATTIRE_BLOCK}
${swimsuitBlock}
${SWIMWEAR_PHYSICS_BLOCK}
${allureBlock}
${variationLine}

${design.brief}
${design.color}
${design.physics}

${daringBlock}
${plungeBlock}
${hipBlock}
${negativeSpaceBlock}
${FIT_TAILORING_BLOCK}

GARMENT GEOMETRY (COVERAGE + CUTOUTS): ${concept.geometry}
GARMENT MATERIAL CLASS (MACRO PHYSICS): ${design.material}

${NO_TOUCH_BLOCK}

${CAMERA_BLOCK}
${SENSOR_PIPELINE_BLOCK}
${IMPERFECTIONS_BLOCK}

${LIGHT_BLOCK}

${SKIN_BLOCK}

${CLOTH_PHYSICS_BLOCK}
${WET_INTERACTION_BLOCK}
${CONTACT_PRESSURE_BLOCK}
${PHYSICS_FORENSICS_BLOCK}

${PHYSICS_INNOVATION_BLOCK}

${SAFETY_BLOCK}`;
  }
  return `Generate an image of this photograph edited into an ultra-raw real-life luxury pool photograph indistinguishable from an unretouched candid shot from a real poolside night. Raw documentary poolside photography. Subject is an adult woman (21+). Preserve exact identity, face, bone structure, eyes, nose, mouth, and age. Use the photo as an identity reference; allow a different full-body pose. Expression: ${expression}. Change outfit and environment as described. Avoid retouching.

INVARIANTS:
- Preserve exact identity/face/age; keep the specified expression: ${expression}.
- Pose must be different for this concept; follow POSE DIRECTIVE precisely with realistic anatomy and camera physics.
- Only change environment + outfit; subject is solo; no retouching.
ENVIRONMENT: ${SCENE_BASE} ${concept.scene}
POSE DIRECTIVE (DIFFERENT EACH IMAGE): ${concept.pose}
${POSE_PHYSICS_BLOCK}
${IMAGE_INTENT_BLOCK}
${FOURK_QUALITY_OBJECTIVE_BLOCK}
${deepSkillBlock}
${IDENTITY_LOCK_BLOCK}
${REFERENCE_AUTHORITY_BLOCK}
${STEPWISE_SCENE_BUILD_BLOCK}
${REFINEMENT_ORDER_BLOCK}
${SEMANTIC_NEGATIVE_BLOCK}
${SENSUAL_REALISM_BLOCK}

${moodBlock}
${physicsMaxContractBlock}
${physicsStandardBlock}

${SCENE_SPECTACLE_BLOCK}
${CREATIVE_EVENT_MOMENT_BLOCK}

${CREATIVE_ATTIRE_BLOCK}
${PHYSICS_ONLY_ATTIRE_BLOCK}
${swimsuitBlock}
${SWIMWEAR_PHYSICS_BLOCK}
${allureBlock}
${variationLine}

${design.brief}
${design.color}
${design.physics}

${daringBlock}
${plungeBlock}
${hipBlock}
${negativeSpaceBlock}
${FIT_TAILORING_BLOCK}

GARMENT GEOMETRY (COVERAGE + CUTOUTS): ${concept.geometry}
GARMENT MATERIAL CLASS (MACRO PHYSICS): ${design.material}

${NO_TOUCH_BLOCK}

${CAMERA_BLOCK}
${SENSOR_PIPELINE_BLOCK}
${IMPERFECTIONS_BLOCK}

${LIGHT_BLOCK}

${SKIN_BLOCK}

${CLOTH_PHYSICS_BLOCK}
${WET_INTERACTION_BLOCK}
${CONTACT_PRESSURE_BLOCK}
${PHYSICS_FORENSICS_BLOCK}

${SCENE_PHYSICS_BLOCK}

${OPTICS_BLOCK}


${PHYSICS_INNOVATION_BLOCK}

${SAFETY_BLOCK}`;
}

function buildPromptPassACompact(concept, expression, variation, fallback = false) {
  const physicsMax = isPhysicsMaxConcept(concept);
  const moodBlock = physicsMax
    ? PHYSICS_MAX_TONE_BLOCK
    : (fallback
      ? 'calm, poised, compliance-forward luxury editorial realism; non-explicit framing.'
      : `${SULTRY_MOOD_BLOCK} ${SENSUAL_INVITATION_BLOCK} ${EDGY_ATTITUDE_BLOCK}`);
  const sultrySceneBlock = physicsMax
    ? ''
    : (fallback ? '' : SULTRY_SCENE_SAFE_BLOCK);
  const daringCompactBlock = physicsMax && !fallback
    ? `${DARING_5X_ALLURE_BLOCK} ${DARING_5X_BLOCK} ${DARING_5X_PLUNGE_BLOCK} ${DARING_5X_HIP_BLOCK} ${DARING_5X_NEGATIVE_SPACE_BLOCK}`
    : '';
  const physicsMaxContractBlock = physicsMax
    ? `${PHYSICS_DRIVER_LOCK_BLOCK} ${PHYSICS_CAUSAL_CHAIN_BLOCK} ${PHYSICS_CAMERA_EVIDENCE_BLOCK} ${PHYSICS_ARTIFACT_EXCLUSION_BLOCK}`
    : '';
  const physicsStandardBlock = physicsMax
    ? `${PHYSICS_STANDARD_V2_BLOCK} ${PHYSICS_MATERIAL_CAL_BLOCK} ${PHYSICS_FLUID_CAL_BLOCK} ${PHYSICS_OPTICS_CAL_BLOCK} ${PHYSICS_VALIDATION_GATE_BLOCK}`
    : '';
  const deepSkillBlock = buildBreakthroughPromptSkillBlock({ stage: 'passA', approach: 'A' });
  const design = variation
    ? composeDesignSpec(concept, variation, fallback)
    : { color: '', brief: '', material: fallback ? concept.materialFallback : concept.material };
  return `Generate an image of this photograph edited into a raw, real-life luxury pool photo. Subject is an adult woman (21+). Preserve exact identity, face, bone structure, eyes, nose, mouth, and age. Use the photo as identity reference; allow a different full-body pose. Expression: ${expression}. Subject is solo.

SCENE: ${SCENE_BASE} ${concept.scene}
MOOD: ${moodBlock}
${CREATIVE_EVENT_MOMENT_BLOCK}
${sultrySceneBlock}
${physicsMaxContractBlock}
${physicsStandardBlock}
POSE (DIFFERENT EACH IMAGE): ${concept.pose}
${POSE_PHYSICS_BLOCK}
${IMAGE_INTENT_BLOCK}
${FOURK_QUALITY_OBJECTIVE_BLOCK}
${deepSkillBlock}
${IDENTITY_LOCK_BLOCK}
${REFERENCE_AUTHORITY_BLOCK}
${STEPWISE_SCENE_BUILD_BLOCK}
${PASSA_COARSE_TO_FINE_BLOCK}
${PASSA_BOUNDARY_CONDITIONS_BLOCK}
${REFINEMENT_ORDER_BLOCK}
${SEMANTIC_NEGATIVE_BLOCK}
${SENSUAL_REALISM_BLOCK}

ATTIRE (MANDATORY, LACE SWIMSUIT): ${SAFEST_ATTIRE_BLOCK}
${SWIMWEAR_PHYSICS_BLOCK}
${INNOVATIVE_DARING_TECHNIQUES_BLOCK}
${INNOVATIVE_PHYSICS_TECHNIQUES_BLOCK}
${FOURK_MICRODETAIL_FORENSICS_BLOCK}
${daringCompactBlock}
DESIGN: ${design.brief} ${design.color}
GEOMETRY: ${concept.geometry}
MATERIAL: ${design.material}

CAMERA/LIGHT: ${CAMERA_BLOCK} ${LIGHT_BLOCK}
PHYSICS: ${CLOTH_PHYSICS_BLOCK} ${WET_INTERACTION_BLOCK} ${CONTACT_PRESSURE_BLOCK} ${PHYSICS_FORENSICS_BLOCK} ${PHYSICS_INNOVATION_BLOCK}
RAW PIPELINE: ${SENSOR_PIPELINE_BLOCK}
SAFETY: ${SAFETY_BLOCK}
NO RETOUCHING; RAW LOOK.`;
}

function buildPromptPassAUltra(concept, expression, variation) {
  const physicsMax = isPhysicsMaxConcept(concept);
  const safeMoodBlock = 'confident editorial pool portrait tone, calm and poised, non-sexual expression, tasteful high-fashion energy';
  const safeModeAttireGuard = 'SAFE-MODE ATTIRE LOCK (MANDATORY): coverage-safe couture one-piece with bold geometry; neckline stays at/above lower sternum with supported V architecture; controlled side contour windows with opaque under-support; full back panel to low waist; high-cut leg line; no transparent core zones; no explicit or suggestive framing.';
  const moodBlock = FORCE_SAFE_MODE
    ? safeMoodBlock
    : (physicsMax ? PHYSICS_MAX_TONE_BLOCK : `${SULTRY_MOOD_BLOCK} ${SENSUAL_INVITATION_BLOCK} ${EDGY_ATTITUDE_BLOCK}`);
  const daringUltraBlock = FORCE_SAFE_MODE
    ? ''
    : (physicsMax ? `${DARING_5X_ALLURE_BLOCK} ${DARING_5X_BLOCK} ${DARING_5X_PLUNGE_BLOCK} ${DARING_5X_HIP_BLOCK} ${DARING_5X_NEGATIVE_SPACE_BLOCK}` : '');
  const physicsMaxContractBlock = physicsMax
    ? `${PHYSICS_DRIVER_LOCK_BLOCK} ${PHYSICS_CAUSAL_CHAIN_BLOCK} ${PHYSICS_CAMERA_EVIDENCE_BLOCK} ${PHYSICS_ARTIFACT_EXCLUSION_BLOCK}`
    : '';
  const physicsStandardBlock = physicsMax
    ? `${PHYSICS_STANDARD_V2_BLOCK} ${PHYSICS_MATERIAL_CAL_BLOCK} ${PHYSICS_FLUID_CAL_BLOCK} ${PHYSICS_OPTICS_CAL_BLOCK} ${PHYSICS_VALIDATION_GATE_BLOCK}`
    : '';
  const design = variation ? composeDesignSpec(concept, variation, true) : { color: '', brief: '', material: concept.materialFallback };
  const deepSkillBlock = buildBreakthroughPromptSkillBlock({ stage: 'passA', approach: 'A' });
  const safeGeometry = `coverage-safe couture one-piece silhouette with supported V neckline at lower sternum, controlled side contour windows with opaque under-support, full back panel to low waist, high-cut legline, reinforced seam architecture, and opaque lined lace overlay (${variation?.laceMotif || 'fine lace filigree'}).`;
  const geometryLine = FORCE_SAFE_MODE ? safeGeometry : concept.geometry;
  const materialLine = FORCE_SAFE_MODE
    ? `${design.material} Opaque-lined coverage only; no transparent zones; no deep plunge; no open-back cutout geometry.`
    : design.material;
  return `Generate an image of this photograph edited into a raw, real-life luxury pool photo. Subject is an adult woman (21+). Preserve exact identity, face, bone structure, eyes, nose, mouth, age. Use the photo as identity reference; allow a different full-body pose. Expression: ${expression}. Subject is solo.

SCENE: ${SCENE_BASE} ${concept.scene}
MOOD: ${moodBlock}
${CREATIVE_EVENT_MOMENT_BLOCK}
${physicsMaxContractBlock}
${physicsStandardBlock}
POSE (DIFFERENT EACH IMAGE): ${concept.pose}
${POSE_PHYSICS_BLOCK}
${IMAGE_INTENT_BLOCK}
${FOURK_QUALITY_OBJECTIVE_BLOCK}
${deepSkillBlock}
${IDENTITY_LOCK_BLOCK}
${REFERENCE_AUTHORITY_BLOCK}
${STEPWISE_SCENE_BUILD_BLOCK}
${REFINEMENT_ORDER_BLOCK}
${SEMANTIC_NEGATIVE_BLOCK}
${SENSUAL_REALISM_BLOCK}

ATTIRE (MANDATORY): ${SAFEST_ATTIRE_BLOCK}
${SWIMWEAR_PHYSICS_BLOCK}
${daringUltraBlock}
${FORCE_SAFE_MODE ? safeModeAttireGuard : ''}

GEOMETRY: ${geometryLine}
MATERIAL: ${materialLine}
COLOR: ${design.color}

CAMERA/LIGHT: ${CAMERA_BLOCK} ${LIGHT_BLOCK}
RAW PIPELINE: ${SENSOR_PIPELINE_BLOCK}
IMPERFECTIONS: ${IMPERFECTIONS_BLOCK}
SAFETY: fully covered; no explicit nudity; no see-through. Raw, unretouched realism.`;
}

function buildPromptPassASafeEmergency(concept, expression, variation) {
  const design = variation ? composeDesignSpec(concept, variation, true) : { color: '', brief: '', material: concept.materialFallback };
  const deepSkillBlock = buildBreakthroughPromptSkillBlock({ stage: 'passA', approach: 'A' });
  const safeGeometry = `coverage-safe couture one-piece silhouette with supported V neckline at lower sternum, controlled side contour windows with opaque under-support, full back panel to low waist, high-cut legline, reinforced seam architecture, and opaque lined lace overlay (${variation?.laceMotif || 'fine lace filigree'}).`;
  return `Generate an image of this photograph edited into a raw, real-life luxury pool photo. Subject is an adult woman (21+). Preserve exact identity, face, bone structure, eyes, nose, mouth, and age. Use the photo as identity reference; allow a different full-body pose. Expression: ${expression}. Subject is solo.

SCENE: ${SCENE_BASE} ${concept.scene}
${CREATIVE_EVENT_MOMENT_BLOCK}
POSE (DIFFERENT EACH IMAGE): ${concept.pose}
${POSE_PHYSICS_BLOCK}
${IMAGE_INTENT_BLOCK}
${FOURK_QUALITY_OBJECTIVE_BLOCK}
${deepSkillBlock}
${IDENTITY_LOCK_BLOCK}
${REFERENCE_AUTHORITY_BLOCK}
${STEPWISE_SCENE_BUILD_BLOCK}
${REFINEMENT_ORDER_BLOCK}
${SEMANTIC_NEGATIVE_BLOCK}

MOOD: calm, poised, tasteful high-fashion editorial portrait; strictly non-sexual framing.
ATTIRE (MANDATORY SAFE): coverage-safe couture one-piece swimsuit with fully opaque lining under lace overlay. Neckline uses a supported V to lower sternum, side contour windows stay controlled with opaque under-support, full back panel to low waist, high-cut legline, no transparent core zones, no explicit or suggestive styling.
${POLICY_SAFE_DARING_BLOCK}
${INNOVATIVE_DARING_TECHNIQUES_BLOCK}
${INNOVATIVE_PHYSICS_TECHNIQUES_BLOCK}
${FOURK_MICRODETAIL_FORENSICS_BLOCK}
DESIGN: ${design.brief}
COLOR: ${design.color}
GEOMETRY: ${safeGeometry}
MATERIAL: ${design.material}

CAMERA/LIGHT: ${CAMERA_BLOCK} ${LIGHT_BLOCK}
RAW PIPELINE: ${SENSOR_PIPELINE_BLOCK}
IMPERFECTIONS: ${IMPERFECTIONS_BLOCK}
PHYSICS: ${CLOTH_PHYSICS_BLOCK} ${WET_INTERACTION_BLOCK} ${CONTACT_PRESSURE_BLOCK} ${PHYSICS_FORENSICS_BLOCK}
${NO_TOUCH_BLOCK}
SAFETY: fully covered; no explicit nudity; no see-through; no suggestive framing.`;
}

function buildPromptPassASafetyRecovery(concept, expression, variation, options = {}) {
  const design = variation ? composeDesignSpec(concept, variation, true) : { color: '', brief: '', material: concept.materialFallback };
  const precisionRetry = options?.precisionRetry === true;
  const precisionMode = precisionRetry ? (options?.precisionMode || 'standard') : '';
  const precisionBlock = buildRetryPrecisionBlock(precisionMode);
  const deepSkillBlock = buildBreakthroughPromptSkillBlock({ stage: 'passA', approach: 'A' });
  return `Generate an image of this photograph edited into a physically realistic luxury pool fashion editorial image. Subject is an adult woman (21+). Preserve exact identity, face, bone structure, eyes, nose, mouth, and age. Use the reference photo for identity; allow a different full-body pose. Expression: ${expression}. Subject is solo.

SCENE: ${SCENE_BASE} ${concept.scene}
${CREATIVE_EVENT_MOMENT_BLOCK}
POSE (DIFFERENT EACH IMAGE): ${concept.pose}
${POSE_PHYSICS_BLOCK}
${IMAGE_INTENT_BLOCK}
${FOURK_QUALITY_OBJECTIVE_BLOCK}
${deepSkillBlock}
${IDENTITY_LOCK_BLOCK}
${REFERENCE_AUTHORITY_BLOCK}
${STEPWISE_SCENE_BUILD_BLOCK}
${REFINEMENT_ORDER_BLOCK}
${SEMANTIC_NEGATIVE_BLOCK}

STYLE INTENT: premium couture pool fashion realism with technical garment/optical fidelity and compliance-safe editorial framing. Prioritize realism, engineering detail, and optical coherence.
ATTIRE (MANDATORY): coverage-safe couture lace one-piece with opaque lining, stable seams, and plausible support geometry.
${precisionBlock}
${POLICY_MICRODETAIL_RESOLUTION_BLOCK}
${POLICY_RECOVERY_DARING_CONSTRAINT_BLOCK}
${POLICY_SAFE_DARING_BLOCK}
${INNOVATIVE_DARING_TECHNIQUES_BLOCK}
${INNOVATIVE_PHYSICS_TECHNIQUES_BLOCK}
${FOURK_MICRODETAIL_FORENSICS_BLOCK}
DESIGN: ${design.brief}
COLOR: ${design.color}
GEOMETRY: ${concept.geometry}
MATERIAL: ${design.material}

CAMERA/LIGHT: ${CAMERA_BLOCK} ${LIGHT_BLOCK}
RAW PIPELINE: ${SENSOR_PIPELINE_BLOCK}
IMPERFECTIONS: ${IMPERFECTIONS_BLOCK}
PHYSICS: ${CLOTH_PHYSICS_BLOCK} ${WET_INTERACTION_BLOCK} ${CONTACT_PRESSURE_BLOCK} ${PHYSICS_FORENSICS_BLOCK}
${NO_TOUCH_BLOCK}
SAFETY: fully covered, opaque support zones, and non-explicit framing.`;
}

function buildPromptPassAPhysicsMax(concept, expression, variation, fallback = false) {
  if (FORCE_SAFE_MODE) {
    return buildPromptPassASafeEmergency(concept, expression, variation);
  }
  const design = variation ? composeDesignSpec(concept, variation, fallback) : { color: '', brief: '', material: fallback ? concept.materialFallback : concept.material };
  const swimsuitBlock = fallback ? SAFE_SWIMSUIT_BLOCK : SWIMSUIT_BLOCK;
  const allureBlock = fallback ? SAFE_ALLURE_ATTIRE_BLOCK : DARING_5X_ALLURE_BLOCK;
  const daringBlock = fallback ? SAFE_DARING_CUT_BLOCK : DARING_5X_BLOCK;
  const plungeBlock = fallback ? PLUNGE_ENGINEERING_BLOCK : DARING_5X_PLUNGE_BLOCK;
  const hipBlock = fallback ? HIP_CUTOUT_BLOCK : DARING_5X_HIP_BLOCK;
  const negSpaceBlock = fallback ? NEGATIVE_SPACE_MAX_BLOCK : DARING_5X_NEGATIVE_SPACE_BLOCK;
  const variationLine = variation
    ? `VARIATION TAG (UNIQUE): ${variation.theme.name} | ${variation.vibe.name} | ${variation.colorway.name} | ${variation.motif.name}`
    : '';
  const deepSkillBlock = buildBreakthroughPromptSkillBlock({ stage: 'passA', approach: 'A' });

  return `Generate an image of this photograph edited into a raw, physically coherent luxury pool photograph. Subject is an adult woman (21+). Preserve exact identity, face, bone structure, eyes, nose, mouth, and age. Use the photo as identity reference; allow a different full-body pose. Expression: ${expression}. Subject is solo.

SCENE: ${SCENE_BASE} ${concept.scene}
POSE (DIFFERENT EACH IMAGE): ${concept.pose}
${POSE_PHYSICS_BLOCK}
${PHYSICS_MAX_TONE_BLOCK}
${IMAGE_INTENT_BLOCK}
${FOURK_QUALITY_OBJECTIVE_BLOCK}
${deepSkillBlock}
${IDENTITY_LOCK_BLOCK}
${REFERENCE_AUTHORITY_BLOCK}
${STEPWISE_SCENE_BUILD_BLOCK}
${REFINEMENT_ORDER_BLOCK}
${SEMANTIC_NEGATIVE_BLOCK}
${SENSUAL_REALISM_BLOCK}

${PHYSICS_DRIVER_LOCK_BLOCK}
${PHYSICS_CAUSAL_CHAIN_BLOCK}
${PHYSICS_STANDARD_V2_BLOCK}
${PHYSICS_MATERIAL_CAL_BLOCK}
${PHYSICS_FLUID_CAL_BLOCK}
${PHYSICS_OPTICS_CAL_BLOCK}

ATTIRE: ${allureBlock}
${swimsuitBlock}
${SWIMWEAR_PHYSICS_BLOCK}
${daringBlock}
${plungeBlock}
${hipBlock}
${negSpaceBlock}
${MEASURED_CONSTRAINTS_BLOCK}
${variationLine}
DESIGN: ${design.brief}
COLOR: ${design.color}
GEOMETRY: ${concept.geometry}
MATERIAL: ${design.material}

CAMERA: ${PHYSICS_CAMERA_COMPACT_BLOCK}
LIGHT: ${PHYSICS_LIGHT_COMPACT_BLOCK}
RAW PIPELINE: ${PHYSICS_SENSOR_COMPACT_BLOCK}
IMPERFECTIONS: ${IMPERFECTIONS_BLOCK}
PHYSICS: ${PHYSICS_CLOTH_COMPACT_BLOCK} ${WET_INTERACTION_BLOCK} ${PHYSICS_FLUID_CAL_BLOCK} ${PHYSICS_OPTICS_CAL_BLOCK} ${PHYSICS_FORENSICS_BLOCK}

${PHYSICS_CAMERA_EVIDENCE_BLOCK}
${PHYSICS_ARTIFACT_EXCLUSION_BLOCK}
${PHYSICS_VALIDATION_GATE_BLOCK}
${NO_TOUCH_BLOCK}
${SAFETY_BLOCK}`;
}

function buildPromptPassB(concept, expression, variation, fallback = false) {
  const physicsMax = isPhysicsMaxConcept(concept);
  const physicsMaxPrimary = physicsMax && !fallback;
  const design = variation ? composeDesignSpec(concept, variation, fallback) : { color: '', brief: '', micro: fallback ? concept.microFallback : concept.micro };
  const variationLine = variation
    ? `\nVARIATION TAG (LOCKED): ${variation.theme.name} | ${variation.vibe.name} | ${variation.colorway.name} | ${variation.motif.name}\n`
    : '';
  const swimsuitBlock = fallback ? SAFE_SWIMSUIT_BLOCK : SWIMSUIT_BLOCK;
  const allureBlock = physicsMaxPrimary ? DARING_5X_ALLURE_BLOCK : '';
  const daringBlock = physicsMaxPrimary ? DARING_5X_BLOCK : (fallback ? SAFE_DARING_CUT_BLOCK : DARING_CUT_BLOCK);
  const plungeBlock = physicsMaxPrimary ? DARING_5X_PLUNGE_BLOCK : PLUNGE_ENGINEERING_BLOCK;
  const hipBlock = physicsMaxPrimary ? DARING_5X_HIP_BLOCK : HIP_CUTOUT_BLOCK;
  const negativeSpaceBlock = physicsMaxPrimary ? DARING_5X_NEGATIVE_SPACE_BLOCK : NEGATIVE_SPACE_MAX_BLOCK;
  const anatomyBlock = fallback ? SAFE_ANATOMY_ANCHOR_BLOCK : ANATOMY_ANCHOR_BLOCK;
  const moodBlock = physicsMax ? PHYSICS_MAX_TONE_BLOCK : SULTRY_MOOD_BLOCK;
  const invitationBlock = physicsMax ? '' : SENSUAL_INVITATION_BLOCK;
  const edgyBlock = physicsMax ? '' : EDGY_ATTITUDE_BLOCK;
  const physicsMaxContractBlock = physicsMax
    ? `${PHYSICS_DRIVER_LOCK_BLOCK}\n${PHYSICS_CAUSAL_CHAIN_BLOCK}\n${PHYSICS_CAMERA_EVIDENCE_BLOCK}\n${PHYSICS_ARTIFACT_EXCLUSION_BLOCK}`
    : '';
  const physicsStandardBlock = physicsMax
    ? `${PHYSICS_STANDARD_V2_BLOCK}\n${PHYSICS_MATERIAL_CAL_BLOCK}\n${PHYSICS_FLUID_CAL_BLOCK}\n${PHYSICS_OPTICS_CAL_BLOCK}\n${PHYSICS_VALIDATION_GATE_BLOCK}`
    : '';
  const deepSkillBlock = buildBreakthroughPromptSkillBlock({ stage: 'passB', approach: 'A' });
  const innovativeMethodBlock = buildPassBInnovativeMethodBlock({
    profile: fallback ? 'clean' : 'balanced',
    approach: 'B',
    safeMode: fallback,
  });
  if (fallback) {
    return `Generate an image of this photograph edited from the previous pass. Preserve the same identity, face, pose, framing, expression, and scene. Keep camera, lighting, and color balance unchanged from pass A. Refine only garment microstructure (lace/mesh), swimwear physics, and realistic imperfections. Maintain raw documentary look with no retouching. Expression: ${expression}.

REFINEMENT LOCKS: do not change pose/framing/lighting; preserve garment geometry + coverage.
SCENE (LOCKED): ${SCENE_BASE} ${concept.scene}
HERO EVENT MOMENT (LOCKED): preserve exactly one signature experiential cue from pass A and keep its physical influence coherent.
${IMAGE_INTENT_BLOCK}
${FOURK_QUALITY_OBJECTIVE_BLOCK}
${deepSkillBlock}
${innovativeMethodBlock}
${IDENTITY_LOCK_BLOCK}
${REFERENCE_AUTHORITY_BLOCK}
${STEPWISE_SCENE_BUILD_BLOCK}
${REFINEMENT_ORDER_BLOCK}
${SEMANTIC_NEGATIVE_BLOCK}
${SENSUAL_REALISM_BLOCK}

${moodBlock}
${invitationBlock}
${physicsMaxContractBlock}
${physicsStandardBlock}

${CREATIVE_ATTIRE_BLOCK}
${PHYSICS_ONLY_ATTIRE_BLOCK}
${swimsuitBlock}
${SWIMWEAR_PHYSICS_BLOCK}
${allureBlock}
${variationLine}
${design.brief}
${design.color}

GARMENT GEOMETRY (UNCHANGED): ${concept.geometry}
MATERIAL MICROSTRUCTURE (MICRO PHYSICS): ${design.micro}
SWIMSUIT REFINEMENT: lace filaments, mesh tension, bonded edge thickness, and micro-shadowing.
${MICROSTRUCTURE_BLOCK}
${CONTACT_PRESSURE_BLOCK}

${daringBlock}
${plungeBlock}
${hipBlock}
${negativeSpaceBlock}
${FIT_TAILORING_BLOCK}
${anatomyBlock}
${ATTIRE_GEOMETRY_DEEP_BLOCK}
${SCENE_CAUSTICS_BLOCK}
${COLOR_METAMERISM_BLOCK}
${physicsMaxContractBlock}
${physicsStandardBlock}

${NO_TOUCH_BLOCK}

${CAMERA_BLOCK}

${LIGHT_BLOCK}

${SKIN_BLOCK}

${CLOTH_PHYSICS_BLOCK}
${WET_INTERACTION_BLOCK}
${PHYSICS_FORENSICS_BLOCK}

${OPTICS_BLOCK}

${PHYSICS_INNOVATION_BLOCK}

${SAFETY_BLOCK}`;
  }
  return `Generate an image of this photograph edited from the previous pass. Preserve the same identity, face, pose, framing, expression, and scene. Keep camera, lighting, and color balance unchanged from pass A. Refine only garment microstructure (lace/mesh), swimwear physics, and realistic imperfections. Maintain raw documentary look with no retouching. Expression: ${expression}.

REFINEMENT LOCKS: do not change pose/framing/lighting; preserve garment geometry + coverage.
SCENE (LOCKED): ${SCENE_BASE} ${concept.scene}
HERO EVENT MOMENT (LOCKED): preserve exactly one signature experiential cue from pass A and keep its physical influence coherent.
${IMAGE_INTENT_BLOCK}
${FOURK_QUALITY_OBJECTIVE_BLOCK}
${deepSkillBlock}
${innovativeMethodBlock}
${IDENTITY_LOCK_BLOCK}
${STEPWISE_SCENE_BUILD_BLOCK}
${REFINEMENT_ORDER_BLOCK}
${SEMANTIC_NEGATIVE_BLOCK}
${SENSUAL_REALISM_BLOCK}

${CREATIVE_ATTIRE_BLOCK}
${PHYSICS_ONLY_ATTIRE_BLOCK}
${swimsuitBlock}
${SWIMWEAR_PHYSICS_BLOCK}
${allureBlock}
${variationLine}
${design.brief}
${design.color}

GARMENT GEOMETRY (UNCHANGED): ${concept.geometry}
MATERIAL MICROSTRUCTURE (MICRO PHYSICS): ${design.micro}
SWIMSUIT REFINEMENT: lace filaments, mesh tension, bonded edge thickness, and micro-shadowing.
${MICROSTRUCTURE_BLOCK}
${CONTACT_PRESSURE_BLOCK}

${daringBlock}
${plungeBlock}
${hipBlock}
${negativeSpaceBlock}
${FIT_TAILORING_BLOCK}
${anatomyBlock}
${ATTIRE_GEOMETRY_DEEP_BLOCK}
${SCENE_CAUSTICS_BLOCK}
${COLOR_METAMERISM_BLOCK}

${moodBlock}
${edgyBlock}
${invitationBlock}
${physicsMaxContractBlock}
${physicsStandardBlock}

${NO_TOUCH_BLOCK}

${CAMERA_BLOCK}

${LIGHT_BLOCK}

${SKIN_BLOCK}

${CLOTH_PHYSICS_BLOCK}
${WET_INTERACTION_BLOCK}
${PHYSICS_FORENSICS_BLOCK}

${SCENE_PHYSICS_BLOCK}

${OPTICS_BLOCK}


${PHYSICS_INNOVATION_BLOCK}

${SAFETY_BLOCK}
`;
}

function buildPromptPassBPhysicsMax(concept, expression, variation, fallback = false) {
  const design = variation ? composeDesignSpec(concept, variation, fallback) : { color: '', brief: '', micro: fallback ? concept.microFallback : concept.micro };
  const swimsuitBlock = fallback ? SAFE_SWIMSUIT_BLOCK : SWIMSUIT_BLOCK;
  const allureBlock = fallback ? SAFE_ALLURE_ATTIRE_BLOCK : DARING_5X_ALLURE_BLOCK;
  const daringBlock = fallback ? SAFE_DARING_CUT_BLOCK : DARING_5X_BLOCK;
  const plungeBlock = fallback ? PLUNGE_ENGINEERING_BLOCK : DARING_5X_PLUNGE_BLOCK;
  const hipBlock = fallback ? HIP_CUTOUT_BLOCK : DARING_5X_HIP_BLOCK;
  const negSpaceBlock = fallback ? NEGATIVE_SPACE_MAX_BLOCK : DARING_5X_NEGATIVE_SPACE_BLOCK;
  const variationLine = variation
    ? `VARIATION TAG (LOCKED): ${variation.theme.name} | ${variation.vibe.name} | ${variation.colorway.name} | ${variation.motif.name}`
    : '';
  const deepSkillBlock = buildBreakthroughPromptSkillBlock({ stage: 'passB', approach: 'A' });
  const innovativeMethodBlock = buildPassBInnovativeMethodBlock({
    profile: fallback ? 'clean' : 'balanced',
    approach: 'B',
    safeMode: fallback,
  });

  return `Generate an image of this photograph edited from the previous pass. Preserve identity, pose, framing, scene, camera, and lighting. Refine only microstructure and physically causal interactions.

SCENE (LOCKED): ${SCENE_BASE} ${concept.scene}
${PHYSICS_MAX_TONE_BLOCK}
${PHYSICS_DRIVER_LOCK_BLOCK}
${PHYSICS_CAUSAL_CHAIN_BLOCK}
${PHYSICS_STANDARD_V2_BLOCK}
${IMAGE_INTENT_BLOCK}
${FOURK_QUALITY_OBJECTIVE_BLOCK}
${deepSkillBlock}
${innovativeMethodBlock}
${IDENTITY_LOCK_BLOCK}
${STEPWISE_SCENE_BUILD_BLOCK}
${REFINEMENT_ORDER_BLOCK}
${SEMANTIC_NEGATIVE_BLOCK}
${SENSUAL_REALISM_BLOCK}

ATTIRE (LOCKED GEOMETRY, REFINED MICRO): ${allureBlock}
${swimsuitBlock}
${SWIMWEAR_PHYSICS_BLOCK}
${daringBlock}
${plungeBlock}
${hipBlock}
${negSpaceBlock}
${variationLine}
GEOMETRY (UNCHANGED): ${concept.geometry}
MACRO DESIGN (LOCKED): ${design.brief}
COLOR (LOCKED): ${design.color}
MICRO MATERIAL PHYSICS: ${design.micro}
${MICROSTRUCTURE_BLOCK}
${CONTACT_PRESSURE_BLOCK}
${MEASURED_CONSTRAINTS_BLOCK}

OPTICS + FLUID: ${PHYSICS_FLUID_CAL_BLOCK} ${PHYSICS_OPTICS_CAL_BLOCK} ${SCENE_PHYSICS_BLOCK} ${OPTICS_BLOCK}
PHYSICS FORENSICS: ${PHYSICS_FORENSICS_BLOCK}
CAMERA EVIDENCE: ${PHYSICS_CAMERA_EVIDENCE_BLOCK}
NO ARTIFACTS: ${PHYSICS_ARTIFACT_EXCLUSION_BLOCK}
VALIDATION: ${PHYSICS_VALIDATION_GATE_BLOCK}
${NO_TOUCH_BLOCK}
${SAFETY_BLOCK}`;
}

function buildPromptPassBSafetyRecovery(concept, expression, variation, options = {}) {
  const design = variation ? composeDesignSpec(concept, variation, true) : { color: '', brief: '', micro: concept.microFallback };
  const precisionRetry = options?.precisionRetry === true;
  const precisionMode = precisionRetry ? (options?.precisionMode || 'standard') : '';
  const precisionBlock = buildRetryPrecisionBlock(precisionMode);
  const deepSkillBlock = buildBreakthroughPromptSkillBlock({ stage: 'passB', approach: 'A' });
  const innovativeMethodBlock = buildPassBInnovativeMethodBlock({
    profile: 'clean',
    approach: 'B',
    safeMode: true,
  });
  return `Generate an image of this photograph edited from the previous pass. Preserve identity, face, pose, framing, scene, camera, and lighting exactly. Refine only garment microstructure and physically causal wet/optical details. Expression remains: ${expression}.

SCENE (LOCKED): ${SCENE_BASE} ${concept.scene}
${IMAGE_INTENT_BLOCK}
${FOURK_QUALITY_OBJECTIVE_BLOCK}
${deepSkillBlock}
${innovativeMethodBlock}
${IDENTITY_LOCK_BLOCK}
${REFERENCE_AUTHORITY_BLOCK}
${STEPWISE_SCENE_BUILD_BLOCK}
${REFINEMENT_ORDER_BLOCK}
${SEMANTIC_NEGATIVE_BLOCK}

STYLE INTENT: premium fashion realism with technical garment/optical fidelity and compliance-safe editorial framing.
ATTIRE: coverage-safe couture lace one-piece with opaque support zones and stable seam architecture.
${precisionBlock}
${POLICY_MICRODETAIL_RESOLUTION_BLOCK}
${POLICY_RECOVERY_DARING_CONSTRAINT_BLOCK}
${POLICY_SAFE_DARING_BLOCK}
${INNOVATIVE_DARING_TECHNIQUES_BLOCK}
${INNOVATIVE_PHYSICS_TECHNIQUES_BLOCK}
${FOURK_MICRODETAIL_FORENSICS_BLOCK}
GEOMETRY (UNCHANGED): ${concept.geometry}
COLOR (LOCKED): ${design.color}
MICRO MATERIAL PHYSICS: ${design.micro}
${MICROSTRUCTURE_BLOCK}
${CONTACT_PRESSURE_BLOCK}

CAMERA/LIGHT LOCK: ${CAMERA_BLOCK} ${LIGHT_BLOCK}
RAW PIPELINE: ${SENSOR_PIPELINE_BLOCK}
IMPERFECTIONS: ${IMPERFECTIONS_BLOCK}
PHYSICS: ${CLOTH_PHYSICS_BLOCK} ${WET_INTERACTION_BLOCK} ${PHYSICS_FORENSICS_BLOCK}
${NO_TOUCH_BLOCK}
SAFETY: fully covered, opaque support zones, and non-explicit framing.`;
}

function extractFirstImagePart(parts = []) {
  for (const part of parts) {
    if (part?.inlineData?.data) return part;
  }
  return null;
}

function buildPromptPassBDeltaBeam(
  concept,
  expression,
  variation,
  beam = 'structural',
  safeMode = false,
  passAAuditBlock = '',
  options = {}
) {
  const design = variation
    ? composeDesignSpec(concept, variation, safeMode)
    : { color: '', brief: '', micro: safeMode ? concept.microFallback : concept.micro };
  const beamBlock = beam === 'optical'
    ? PASSB_OPTICAL_BEAM_BLOCK
    : (beam === 'balanced' ? PASSB_BALANCED_BEAM_BLOCK : PASSB_STRUCTURAL_BEAM_BLOCK);
  const safetyTone = safeMode
    ? 'strict compliance-safe editorial framing; fully covered, opaque support zones; no suggestive emphasis.'
    : 'premium editorial realism with confident but non-explicit styling.';
  const retryPrecisionMode = String(options?.retryPrecisionMode || '').trim().toLowerCase();
  const retryPrecisionBlock = buildRetryPrecisionBlock(retryPrecisionMode);
  const policyEscapeMode = String(options?.policyEscapeMode || '').trim().toLowerCase();
  const policyEscapeBlock = buildPolicyEscapeBlock(policyEscapeMode);
  const innovativeMethodBlock = buildPassBInnovativeMethodBlock({
    profile: safeMode ? 'clean' : 'balanced',
    approach: 'B',
    safeMode,
    beam,
  });
  return `Generate an image of this photograph edited from the previous pass. Preserve identity, face geometry, pose, framing, scene, camera, and lighting exactly. Expression remains: ${expression}.

${PASSB_DELTA_LOCK_BLOCK}
${innovativeMethodBlock}
${passAAuditBlock}
${beamBlock}
SCENE (LOCKED): ${SCENE_BASE} ${concept.scene}
ATTIRE GEOMETRY (LOCKED): ${concept.geometry}
STYLE TONE: ${safetyTone}
${retryPrecisionBlock}
${policyEscapeBlock}
${POLICY_MICRODETAIL_RESOLUTION_BLOCK}
${POLICY_SAFE_DARING_BLOCK}
${INNOVATIVE_DARING_TECHNIQUES_BLOCK}
${INNOVATIVE_PHYSICS_TECHNIQUES_BLOCK}
${FOURK_MICRODETAIL_FORENSICS_BLOCK}
${FOURK_DELTA_EDIT_WINDOW_BLOCK}
${IMAGE_INTENT_BLOCK}
${FOURK_QUALITY_OBJECTIVE_BLOCK}
${IDENTITY_LOCK_BLOCK}
${REFERENCE_AUTHORITY_BLOCK}
${REFINEMENT_ORDER_BLOCK}
${SEMANTIC_NEGATIVE_BLOCK}

EDIT DELTA ONLY:
- preserve all macro composition and silhouette.
- refine microstructure: ${design.micro}
- preserve design/color intent: ${design.brief} ${design.color}
- enforce measured cues: edge thickness 0.6-1.2mm, seam puckering 1-2mm, microfold wavelengths 8-20mm.
- improve only physically causal details visible in-frame; if uncertain, leave unchanged.

PHYSICS CHECKS: ${PHYSICS_FORENSICS_BLOCK}
OPTICS CHECKS: ${PHYSICS_OPTICS_CAL_BLOCK}
WET CHECKS: ${WET_INTERACTION_BLOCK}
SAFETY: fully covered, opaque support zones, non-explicit framing.`;
}

function scoringWeaknessDirectives(score, maxHints = 3) {
  const metrics = score?.metrics || {};
  const dimensions = [
    {
      key: 'garment_physics_score',
      label: 'garment physics',
      action: 'tighten seam/load continuity, bridge strain realism, and edge-thickness cues',
    },
    {
      key: 'optics_score',
      label: 'optics',
      action: 'improve emitter-locked highlights, Fresnel-consistent reflections, and caustic coherence',
    },
    {
      key: 'realism_score',
      label: 'realism',
      action: 'increase non-smoothed sensor evidence and physically causal micro-imperfections',
    },
    {
      key: 'anatomy_score',
      label: 'anatomy',
      action: 'refine contact pressure transitions and posture-consistent soft tissue response',
    },
    {
      key: 'lighting_intent_score',
      label: 'lighting intent',
      action: 'reinforce cinematic key/fill separation while preserving source consistency',
    },
    {
      key: 'editorial_consistency_score',
      label: 'editorial consistency',
      action: 'unify styling cues so attire daring and scene tone read as one coherent look',
    },
  ];
  return dimensions
    .map(d => ({ ...d, value: Number(metrics?.[d.key]) }))
    .filter(d => Number.isFinite(d.value))
    .sort((a, b) => a.value - b.value)
    .slice(0, Math.max(1, maxHints))
    .map((d, idx) => `- Focus ${idx + 1}: ${d.label} ${d.value.toFixed(2)}/10 -> ${d.action}.`);
}

function buildGroundBreakthroughDirective(score, refineRound = 1) {
  const hints = scoringWeaknessDirectives(score, 3);
  const hintBlock = hints.length
    ? hints.join('\n')
    : '- Focus: increase thread-level physics evidence and wet-optical causality without altering macro composition.';
  return `GROUND-BREAKTHROUGH PUSH (ROUND ${refineRound}, ${GROUND_BREAKTHROUGH_PUSH_MULTIPLIER.toFixed(1)}x HARDER):
- Use scorer feedback to target weakest physics/optics dimensions first.
- Preserve macro composition and identity lock; push only microphysics and editorial scene fidelity.
- Improve 4K detail density with physically causal evidence only.
${hintBlock}`;
}

function buildPassAAuditLessons(score, maxHints = PASS_B_PASSA_AUDIT_HINTS) {
  return scoringWeaknessDirectives(score, maxHints)
    .map(line => line.replace(/^- Focus \d+:\s*/i, '').trim())
    .map(line => `Pass A audit focus: ${line}`);
}

function buildPassAAuditPromptBlock(passAAudit) {
  const score = passAAudit?.score || null;
  if (!score) return '';
  const metrics = score?.metrics || {};
  const weakest = Array.isArray(passAAudit?.weakest_directives) && passAAudit.weakest_directives.length
    ? passAAudit.weakest_directives
    : scoringWeaknessDirectives(score, PASS_B_PASSA_AUDIT_HINTS);
  const weakestBlock = weakest.map(line => line.startsWith('- ') ? line : `- ${line}`).join('\n');
  return `PASS A AUDIT BASELINE (MANDATORY):
- Pass A overall ${Number(score?.overall || 0).toFixed(2)}/10.
- Audit metrics: identity ${(Number(metrics?.identity_score) || 0).toFixed(2)}, physics ${(Number(metrics?.garment_physics_score) || 0).toFixed(2)}, optics ${(Number(metrics?.optics_score) || 0).toFixed(2)}, realism ${(Number(metrics?.realism_score) || 0).toFixed(2)}, compliance ${(Number(metrics?.compliance_score) || 0).toFixed(2)}.
- Pass A is the immutable macro baseline for identity, pose, framing, and scene.
- Pass B objective: close at least ${PASS_B_PASSA_GAIN_TARGET_PCT.toFixed(1)}% of the remaining quality headroom above this Pass A baseline.
- Improvements must be audit-traceable to these weakest dimensions:
${weakestBlock}
- If an edit is not justified by the Pass A audit, do not apply it.`;
}

async function ensurePassAAudit({
  concept,
  expression,
  passA,
  referenceMimeType,
  referenceB64,
  profileTag = 'passA-audit',
}) {
  if (passA?.passAAudit?.score) return passA.passAAudit;

  let score = null;
  if (Number(passA?.frontierPassAScore?.overall) > 0) {
    score = passA.frontierPassAScore;
  } else {
    if (!passA?.fp) {
      if (PASS_B_REQUIRE_PASSA_AUDIT) {
        throw new Error('PASS_B_REQUIRE_PASSA_AUDIT enabled but passA.fp is missing.');
      }
      return null;
    }
    const passABuffer = await fs.readFile(passA.fp);
    const passAB64 = passABuffer.toString('base64');
    const passAMimeType = mimeTypeFromPath(passA.fp) || 'image/png';
    score = await scoreFrontierCandidate({
      referenceMimeType,
      referenceB64,
      candidateMimeType: passAMimeType,
      candidateB64: passAB64,
      concept,
      expression,
      profile: profileTag,
    });
  }

  const passAAudit = {
    audited: true,
    profile: profileTag,
    score,
    weakest_directives: scoringWeaknessDirectives(score, PASS_B_PASSA_AUDIT_HINTS),
    lessons: buildPassAAuditLessons(score, PASS_B_PASSA_AUDIT_HINTS),
  };
  passA.passAAudit = passAAudit;
  passA.frontierPassAScore = score;
  return passAAudit;
}

async function tryPassBDeltaBeams({ concept, passA, inputImage, index }) {
  const expression = expressions[index % expressions.length];
  const variation = passA.variation || buildVariation();
  const passAAuditBlock = buildPassAAuditPromptBlock(passA?.passAAudit);
  if (PASS_B_REQUIRE_PASSA_AUDIT && !passAAuditBlock) {
    console.log('Pass B delta beams skipped: Pass A audit is required but missing.');
    return null;
  }
  const baseImageBuffer = await fs.readFile(inputImage);
  const base64Image = baseImageBuffer.toString('base64');
  const baseMimeType = mimeTypeFromPath(inputImage);
  const passAImageBuffer = await fs.readFile(passA.fp);
  const passAB64 = passAImageBuffer.toString('base64');
  const passAPromptForContext = passA.promptUsed || buildPromptPassACompact(concept, expression, variation);
  const beamOrder = ['optical', 'balanced', 'structural'].slice(0, PASS_B_DELTA_BEAMS);
  const candidates = [];
  let policyBlockCount = 0;
  const beamPolicyBlocked = new Set();
  const beamPolicyRecovered = new Set();

  for (const beam of beamOrder) {
    const variants = [false, true];
    for (const safeMode of variants) {
      const retryPrecisionMode = safeMode ? (beamPolicyBlocked.has(beam) ? 'double' : 'standard') : '';
      const policyEscapeMode = safeMode && beamPolicyBlocked.has(beam) ? 'strict' : '';
      const prompt = appendInitialAttemptBoost(
        buildPromptPassBDeltaBeam(
          concept,
          expression,
          variation,
          beam,
          safeMode,
          passAAuditBlock,
          { retryPrecisionMode, policyEscapeMode }
        )
      );
      const label = `Pass B Delta (${beam}${safeMode ? '/safe' : ''})`;
      validatePrompt(prompt, label);
      const contents = buildPassBConversation({
        passAPromptForContext,
        baseMimeType,
        base64Image,
        passAModelParts: PASS_B_REUSE_PASSA_MODEL_PARTS ? passA.modelParts : [],
        prompt,
        passAMimeType: passA.mimeType,
        passAB64,
      });

      let data;
      try {
        data = await callModel(contents, 0, true, null, PASS_B_ENDPOINT, Date.now(), null, {
          concept: concept.name,
          stage: `passB-delta-${beam}${safeMode ? '-safe' : ''}`,
          profile: beam,
        });
      } catch (err) {
        console.log(`${label} error: ${err.message}`);
        continue;
      }
      logModelDiagnostics(data, label);
      const imagePart = extractFirstImagePart(data?.candidates?.[0]?.content?.parts || []);
      if (!imagePart?.inlineData?.data) {
        const signal = extractBlockSignal(data);
        if (signal.policyBlocked) {
          policyBlockCount += 1;
          beamPolicyBlocked.add(beam);
        }
        if (!signal.policyBlocked || safeMode) {
          break;
        }
        continue;
      }

      const candidateMimeType = imagePart.inlineData.mimeType || 'image/png';
      const candidateBuffer = Buffer.from(imagePart.inlineData.data, 'base64');
      if (isSourceCloneBuffer(candidateBuffer, baseImageBuffer)) {
        console.log(`${label} rejected: source-identical candidate.`);
        continue;
      }
      const beamIdentityGate = await enforceDeterministicIdentityGate({
        referencePath: inputImage,
        candidateBuffer,
        candidateMimeType,
        approachKey: 'legacy',
        profile: `delta-${beam}${safeMode ? '-safe' : ''}`,
        stage: `passB-delta-${beam}${safeMode ? '-safe' : ''}`,
      });
      if (!beamIdentityGate.accepted) {
        continue;
      }
      let score = { overall: 5.0, metrics: {} };
      if (PASS_B_USE_SCORER_RERANK) {
        score = await scoreFrontierCandidate({
          referenceMimeType: baseMimeType,
          referenceB64: base64Image,
          candidateMimeType,
          candidateB64: candidateBuffer.toString('base64'),
          concept,
          expression,
          profile: `delta-${beam}${safeMode ? '-safe' : ''}`,
        });
      }
      if (safeMode && beamPolicyBlocked.has(beam)) {
        beamPolicyRecovered.add(beam);
      }
      candidates.push({
        beam,
        safeMode,
        score,
        buffer: candidateBuffer,
        mimeType: candidateMimeType,
        policyRecovered: safeMode && beamPolicyBlocked.has(beam),
      });
      break;
    }
  }

  if (!candidates.length) return null;
  candidates.sort((a, b) => {
    const scoreGap = (Number(b?.score?.overall) || 0) - (Number(a?.score?.overall) || 0);
    if (Math.abs(scoreGap) > 1e-6) return scoreGap;
    if (a.safeMode !== b.safeMode) return a.safeMode ? 1 : -1;
    return 0;
  });
  let best = candidates[0];
  if (PASS_B_USE_SCORER_RERANK && (Number(best?.score?.overall) || 0) < PASS_B_BEAM_MIN_SCORE) {
    console.log(
      `Pass B delta beams rejected: best score ${(Number(best?.score?.overall) || 0).toFixed(2)} ` +
      `< minimum ${PASS_B_BEAM_MIN_SCORE.toFixed(2)}.`
    );
    return null;
  }

  let deltaSafetyPressure = policyBlockCount > 0 || best.safeMode || beamPolicyRecovered.size > 0;
  if (
    PASS_B_USE_SCORER_RERANK &&
    GROUND_BREAKTHROUGH_ENABLED &&
    GROUND_BREAKTHROUGH_MAX_REFINES > 0 &&
    (Number(best?.score?.overall) || 0) < GROUND_BREAKTHROUGH_TRIGGER_SCORE
  ) {
    console.log(
      `Groundbreak escalation: best delta score ${(Number(best?.score?.overall) || 0).toFixed(2)} ` +
      `< trigger ${GROUND_BREAKTHROUGH_TRIGGER_SCORE.toFixed(2)}; running ${GROUND_BREAKTHROUGH_MAX_REFINES} targeted refine round(s).`
    );
    let currentBuffer = best.buffer;
    let currentMimeType = best.mimeType;
    let currentScore = best.score;

    for (let refineRound = 1; refineRound <= GROUND_BREAKTHROUGH_MAX_REFINES; refineRound++) {
      const directive = buildGroundBreakthroughDirective(currentScore, refineRound);
      const promptBase = buildPromptPassBDeltaBeam(
        concept,
        expression,
        variation,
        'balanced',
        deltaSafetyPressure,
        passAAuditBlock,
        {
          retryPrecisionMode: deltaSafetyPressure ? 'double' : 'standard',
          policyEscapeMode: deltaSafetyPressure ? 'strict' : '',
        }
      );
      const prompt = `${promptBase}\n\n${directive}`;
      validatePrompt(prompt, `Pass B Delta (groundbreak-${refineRound})`);

      const contents = buildPassBConversation({
        passAPromptForContext,
        baseMimeType,
        base64Image,
        passAModelParts: PASS_B_REUSE_PASSA_MODEL_PARTS ? passA.modelParts : [],
        prompt,
        passAMimeType: currentMimeType,
        passAB64: currentBuffer.toString('base64'),
      });

      let data;
      try {
        data = await callModel(contents, 0, true, null, PASS_B_ENDPOINT, Date.now(), null, {
          concept: concept.name,
          stage: `passB-delta-groundbreak-r${refineRound}`,
          profile: 'balanced',
        });
      } catch (err) {
        console.log(`Pass B Delta (groundbreak-${refineRound}) error: ${err.message}`);
        continue;
      }
      logModelDiagnostics(data, `Pass B Delta (groundbreak-${refineRound})`);
      const imagePart = extractFirstImagePart(data?.candidates?.[0]?.content?.parts || []);
      if (!imagePart?.inlineData?.data) {
        const signal = extractBlockSignal(data);
        if (signal.policyBlocked) {
          deltaSafetyPressure = true;
        }
        console.log(`Pass B Delta (groundbreak-${refineRound}) produced no image; keeping current best.`);
        continue;
      }

      const candidateMimeType = imagePart.inlineData.mimeType || 'image/png';
      const candidateBuffer = Buffer.from(imagePart.inlineData.data, 'base64');
      if (isSourceCloneBuffer(candidateBuffer, baseImageBuffer)) {
        console.log(`Pass B Delta (groundbreak-${refineRound}) rejected source-identical candidate.`);
        continue;
      }
      const groundbreakIdentityGate = await enforceDeterministicIdentityGate({
        referencePath: inputImage,
        candidateBuffer,
        candidateMimeType,
        approachKey: 'legacy',
        profile: 'delta-groundbreak',
        stage: `passB-delta-groundbreak-r${refineRound}`,
      });
      if (!groundbreakIdentityGate.accepted) {
        continue;
      }
      let candidateScore = { overall: Number(currentScore?.overall) || 5.0, metrics: {} };
      if (PASS_B_USE_SCORER_RERANK) {
        candidateScore = await scoreFrontierCandidate({
          referenceMimeType: baseMimeType,
          referenceB64: base64Image,
          candidateMimeType,
          candidateB64: candidateBuffer.toString('base64'),
          concept,
          expression,
          profile: `delta-groundbreak-${refineRound}`,
        });
      }

      const gain = (Number(candidateScore?.overall) || 0) - (Number(currentScore?.overall) || 0);
      if (!PASS_B_USE_SCORER_RERANK || gain >= GROUND_BREAKTHROUGH_MIN_GAIN) {
        currentBuffer = candidateBuffer;
        currentMimeType = candidateMimeType;
        currentScore = candidateScore;
        console.log(
          `Groundbreak accepted (round ${refineRound}): ` +
          `score ${(Number(currentScore?.overall) || 0).toFixed(2)} (gain ${gain.toFixed(2)}).`
        );
      } else {
        console.log(
          `Groundbreak rejected (round ${refineRound}): ` +
          `score ${(Number(candidateScore?.overall) || 0).toFixed(2)} (gain ${gain.toFixed(2)} < ${GROUND_BREAKTHROUGH_MIN_GAIN.toFixed(2)}).`
        );
      }
    }

    best = {
      ...best,
      beam: `${best.beam}+groundbreak`,
      buffer: currentBuffer,
      mimeType: currentMimeType,
      score: currentScore,
    };
  }

  const passABaselineScore = passA?.passAAudit?.score || passA?.frontierPassAScore || null;
  let passBGainEval = passABaselineScore
    ? evaluatePassBGainTarget(best?.score, passABaselineScore)
    : null;
  if (passBGainEval) {
    console.log(formatPassBGainLog('Pass B delta gain check:', passBGainEval));
  }

  if (
    PASS_B_USE_SCORER_RERANK &&
    passABaselineScore &&
    passBGainEval &&
    !passBGainEval.pass &&
    PASS_B_PASSA_GAIN_MAX_RETRIES > 0
  ) {
    console.log(
      `Pass B delta adaptive retries: headroom gain shortfall ${passBGainEval.shortfallPct.toFixed(1)}% ` +
      `(target ${passBGainEval.targetPct.toFixed(1)}%). Rounds=${PASS_B_PASSA_GAIN_MAX_RETRIES}.`
    );
    let currentBuffer = best.buffer;
    let currentMimeType = best.mimeType;
    let currentScore = best.score;
    let currentEval = passBGainEval;

    for (let retryRound = 1; retryRound <= PASS_B_PASSA_GAIN_MAX_RETRIES; retryRound++) {
      if (currentEval.pass) break;
      const directive = `${buildGroundBreakthroughDirective(currentScore, retryRound)}\n${buildPassBGainDirective(currentEval, retryRound)}`;
      const retryPrecisionMode = retryRound === 1 ? 'double' : 'standard';
      const promptBase = buildPromptPassBDeltaBeam(
        concept,
        expression,
        variation,
        'balanced',
        deltaSafetyPressure,
        passAAuditBlock,
        {
          retryPrecisionMode,
          policyEscapeMode: deltaSafetyPressure ? 'strict' : '',
        }
      );
      const prompt = `${promptBase}\n\n${directive}`;
      validatePrompt(prompt, `Pass B Delta (gain-retry-${retryRound})`);

      const contents = buildPassBConversation({
        passAPromptForContext,
        baseMimeType,
        base64Image,
        passAModelParts: PASS_B_REUSE_PASSA_MODEL_PARTS ? passA.modelParts : [],
        prompt,
        passAMimeType: currentMimeType,
        passAB64: currentBuffer.toString('base64'),
      });

      let data;
      try {
        data = await callModel(contents, 0, true, null, PASS_B_ENDPOINT, Date.now(), null, {
          concept: concept.name,
          stage: `passB-delta-gain-retry-r${retryRound}`,
          profile: 'balanced',
        });
      } catch (err) {
        console.log(`Pass B Delta (gain-retry-${retryRound}) error: ${err.message}`);
        continue;
      }
      logModelDiagnostics(data, `Pass B Delta (gain-retry-${retryRound})`);
      const imagePart = extractFirstImagePart(data?.candidates?.[0]?.content?.parts || []);
      if (!imagePart?.inlineData?.data) {
        const signal = extractBlockSignal(data);
        if (signal.policyBlocked) {
          deltaSafetyPressure = true;
        }
        console.log(`Pass B Delta (gain-retry-${retryRound}) produced no image; keeping current best.`);
        continue;
      }

      const candidateMimeType = imagePart.inlineData.mimeType || 'image/png';
      const candidateBuffer = Buffer.from(imagePart.inlineData.data, 'base64');
      if (isSourceCloneBuffer(candidateBuffer, baseImageBuffer)) {
        console.log(`Pass B Delta (gain-retry-${retryRound}) rejected source-identical candidate.`);
        continue;
      }
      const gainRetryIdentityGate = await enforceDeterministicIdentityGate({
        referencePath: inputImage,
        candidateBuffer,
        candidateMimeType,
        approachKey: 'legacy',
        profile: 'delta-gain-retry',
        stage: `passB-delta-gain-retry-r${retryRound}`,
      });
      if (!gainRetryIdentityGate.accepted) {
        continue;
      }
      let candidateScore = { overall: Number(currentScore?.overall) || 5.0, metrics: {} };
      if (PASS_B_USE_SCORER_RERANK) {
        candidateScore = await scoreFrontierCandidate({
          referenceMimeType: baseMimeType,
          referenceB64: base64Image,
          candidateMimeType,
          candidateB64: candidateBuffer.toString('base64'),
          concept,
          expression,
          profile: `delta-gain-retry-${retryRound}`,
        });
      }
      const candidateEval = evaluatePassBGainTarget(candidateScore, passABaselineScore);
      const scoreGain = (Number(candidateScore?.overall) || 0) - (Number(currentScore?.overall) || 0);
      const accept = candidateEval.pass || scoreGain >= PASS_B_PASSA_GAIN_MIN_STEP;
      if (accept) {
        currentBuffer = candidateBuffer;
        currentMimeType = candidateMimeType;
        currentScore = candidateScore;
        currentEval = candidateEval;
        console.log(
          formatPassBGainLog(`Pass B delta gain-retry accepted (round ${retryRound}):`, currentEval) +
          ` score_gain=${scoreGain.toFixed(2)}`
        );
      } else {
        console.log(
          formatPassBGainLog(`Pass B delta gain-retry rejected (round ${retryRound}):`, candidateEval) +
          ` score_gain=${scoreGain.toFixed(2)} < min_step ${PASS_B_PASSA_GAIN_MIN_STEP.toFixed(2)}`
        );
      }
    }

    best = {
      ...best,
      beam: `${best.beam}+gain-retries`,
      buffer: currentBuffer,
      mimeType: currentMimeType,
      score: currentScore,
    };
    passBGainEval = currentEval;
  }

  if (passBGainEval && !passBGainEval.pass) {
    console.log(
      `Pass B delta gain target unmet: achieved ${passBGainEval.headroomGainPct.toFixed(1)}% ` +
      `vs target ${passBGainEval.targetPct.toFixed(1)}% (shortfall ${passBGainEval.shortfallPct.toFixed(1)}%).`
    );
    if (PASS_B_PASSA_GAIN_HARD_GATE) {
      console.log('Pass B delta hard gate active: rejecting this candidate for not meeting Pass A->B gain target.');
      return null;
    }
  }

  if (isSourceCloneBuffer(best.buffer, baseImageBuffer)) {
    console.log('Pass B delta final rejected: source-identical best candidate.');
    return null;
  }
  const finalDeltaIdentityGate = await enforceDeterministicIdentityGate({
    referencePath: inputImage,
    candidateBuffer: best.buffer,
    candidateMimeType: best.mimeType || 'image/png',
    approachKey: 'legacy',
    profile: `delta-${best.beam}`,
    stage: 'passB-delta-final',
  });
  if (!finalDeltaIdentityGate.accepted) {
    console.log('Pass B delta final rejected by deterministic identity gate.');
    return null;
  }

  const fp = path.join(OUTPUT_DIR, `${concept.name}.png`);
  await fs.writeFile(fp, best.buffer);
  await saveSimpleStageArtifact('Pass B', concept.name, best.buffer, best.mimeType || 'image/png');
  console.log(
    `SAVED FINAL (PASS B DELTA beam=${best.beam}${best.safeMode ? '+safe' : ''} ` +
    `score=${(Number(best?.score?.overall) || 0).toFixed(2)}): ${fp} ` +
    `(${(best.buffer.length / 1024 / 1024).toFixed(2)} MB)`
  );
  return fp;
}

function normalizeFrontierProfile(profile) {
  const key = String(profile || '').toLowerCase().trim();
  if (key in FRONTIER_PROFILE_NOTES) return key;
  return 'balanced';
}

function getFrontierProfiles() {
  const ordered = FRONTIER_BEAM_ORDER.map(normalizeFrontierProfile);
  const unique = [...new Set(ordered)];
  if (SIMPLE_PROFILE_MODE) {
    if (unique.length === 0) return ['balanced'];
    return [unique[0]];
  }
  if (HAIL_MARY_MODE && HAIL_MARY_INTIMATE_FIRST) {
    const idx = unique.indexOf('intimate');
    if (idx >= 0) unique.splice(idx, 1);
    unique.unshift('intimate');
  }
  if (BOLD_EDITORIAL_MODE && BOLD_EDITORIAL_INTENSITY >= 3 && !HAIL_MARY_INTIMATE_FIRST) {
    const idx = unique.indexOf('intimate');
    if (idx >= 0) unique.splice(idx, 1);
  }
  if (!unique.includes('balanced')) unique.push('balanced');
  if (!unique.includes('clean')) unique.push('clean');
  if (BOLD_EDITORIAL_MODE && BOLD_EDITORIAL_INTENSITY >= 3 && !HAIL_MARY_INTIMATE_FIRST) {
    unique.push('intimate');
  }
  return [...new Set(unique)];
}

async function saveSimpleStageArtifact(stageName, conceptName, buffer, mimeType = 'image/png') {
  if (!SIMPLE_INLINE_STAGE_WRITES) return null;
  const stageDir = path.join(SIMPLE_STAGE_ROOT, stageName);
  const ext = String(mimeType || 'image/png').includes('jpeg')
    ? '.jpg'
    : String(mimeType || 'image/png').includes('webp')
      ? '.webp'
      : '.png';
  const targetBuffer = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer || '');
  await fs.mkdir(stageDir, { recursive: true });
  const fp = await resolveImmutableStagePath(stageDir, conceptName, ext, targetBuffer);
  if (!(await writeStageArtifactIfChanged(fp, targetBuffer))) {
    console.log(`SIMPLE STAGE SAVE (${stageName}): ${fp} (unchanged)`);
    return fp;
  }
  console.log(`SIMPLE STAGE SAVE (${stageName}): ${fp}`);
  return fp;
}

async function saveSimpleStageArtifactFromPath(stageName, conceptName, sourcePath) {
  if (!SIMPLE_PHASE_STAGE_WRITES) return null;
  if (!sourcePath) return null;
  const stageDir = path.join(SIMPLE_STAGE_ROOT, stageName);
  const ext = path.extname(sourcePath) || '.png';
  const sourceBuffer = await fs.readFile(sourcePath);
  await fs.mkdir(stageDir, { recursive: true });
  const fp = await resolveImmutableStagePath(stageDir, conceptName, ext, sourceBuffer);
  if (!(await writeStageArtifactIfChanged(fp, sourceBuffer))) {
    console.log(`SIMPLE STAGE SAVE (${stageName}): ${fp} (unchanged)`);
    return fp;
  }
  console.log(`SIMPLE STAGE SAVE (${stageName}): ${fp}`);
  return fp;
}

function stageNameForPassBFinal(_finalMeta, defaultStage = 'Pass B') {
  // Pass-B-stage artifacts must always stay in Pass B, including fallbacks.
  return defaultStage;
}

async function resolveImmutableStagePath(stageDir, conceptName, ext, nextBuffer = null) {
  const canonicalPath = path.join(stageDir, `${conceptName}${ext}`);
  if (!STAGE_IMMUTABLE_WRITES) return canonicalPath;
  if (!(await pathExists(canonicalPath))) return canonicalPath;

  if (Buffer.isBuffer(nextBuffer)) {
    try {
      const current = await fs.readFile(canonicalPath);
      if (buffersEqual(current, nextBuffer)) return canonicalPath;
    } catch {
      // Ignore read errors and continue with immutable fallback naming.
    }
  }

  for (let attempt = 0; attempt < 1000; attempt++) {
    const suffix = attempt === 0
      ? `__run-${STAGE_ARTIFACT_RUN_LABEL}`
      : `__run-${STAGE_ARTIFACT_RUN_LABEL}-${attempt + 1}`;
    const candidatePath = path.join(stageDir, `${conceptName}${suffix}${ext}`);
    if (!(await pathExists(candidatePath))) return candidatePath;
    if (Buffer.isBuffer(nextBuffer)) {
      try {
        const candidateBuffer = await fs.readFile(candidatePath);
        if (buffersEqual(candidateBuffer, nextBuffer)) return candidatePath;
      } catch {
        // Ignore read errors and continue searching for a safe target path.
      }
    }
  }

  const entropy = Date.now().toString(36);
  return path.join(stageDir, `${conceptName}__run-${STAGE_ARTIFACT_RUN_LABEL}-${entropy}${ext}`);
}

async function writeStageArtifactIfChanged(fp, nextBuffer) {
  if (await pathExists(fp)) {
    try {
      const current = await fs.readFile(fp);
      if (buffersEqual(current, nextBuffer)) return false;
    } catch {
      // If read fails, fall through and attempt to write.
    }
  }
  await fs.writeFile(fp, nextBuffer);
  return true;
}

function normalizeApproach(approach, fallback = 'A') {
  const key = String(approach || fallback).toUpperCase().trim();
  if (STRATEGY_KEYS.includes(key)) return key;
  return fallback;
}

function imageSizeForApproach(approach = 'A', override = null) {
  if (FORCE_4K_IMAGE_SIZE) return '4K';
  const explicit = String(override || '').trim();
  if (explicit) return explicit;
  const approachKey = normalizeApproach(approach, 'A');
  if (ENABLE_C_HIGH_RES && approachKey === 'C') return C_IMAGE_SIZE || DEFAULT_IMAGE_SIZE;
  return DEFAULT_IMAGE_SIZE;
}

function normalizeLessons(lessons, max = 8) {
  if (!Array.isArray(lessons)) return [];
  return [...new Set(
    lessons
      .map(x => String(x || '').trim())
      .filter(Boolean)
      .map(x => x.replace(/\s+/g, ' '))
  )].slice(0, max);
}

function mergeLessonsByPriority(priorityLessons = [], carryLessons = [], max = LESSON_MAX_PER_PROMPT) {
  const cap = Math.max(1, parseInt(max, 10) || LESSON_MAX_PER_PROMPT);
  const primary = normalizeLessons(priorityLessons, Math.max(cap * 3, 24));
  const carry = normalizeLessons(carryLessons, Math.max(cap * 3, 24));
  const merged = [];
  for (const lesson of primary) {
    if (merged.length >= cap) break;
    if (!merged.includes(lesson)) merged.push(lesson);
  }
  for (const lesson of carry) {
    if (merged.length >= cap) break;
    if (!merged.includes(lesson)) merged.push(lesson);
  }
  return merged;
}

function formatLessonsForPrompt(lessons) {
  const base = normalizeLessons(lessons, LESSON_MAX_PER_PROMPT);
  const hailMaryDirective = HAIL_MARY_MODE
    ? ['HAIL MARY OBJECTIVE: pursue a breakthrough quality leap in detail/realism while preserving strict identity, pose, and compliance locks.']
    : [];
  const list = normalizeLessons([...hailMaryDirective, ...base], LESSON_MAX_PER_PROMPT);
  if (!list.length) {
    return '- Maintain strict identity lock, physically causal optics, and compliance-safe framing.';
  }
  return list.map((item, idx) => `- P${idx + 1}: ${item}`).join('\n');
}

function formatCSynthesisCharterBlock(charter) {
  const text = String(charter || '').trim();
  if (!text) return '- No charter provided; derive all decisions from explicit A/B audit evidence and keep shared outcome goals fixed.';
  return text;
}

function prioritizeProfiles(baseProfiles, preferredProfiles = []) {
  const base = [...new Set((baseProfiles || []).map(normalizeFrontierProfile))];
  const preferred = normalizeLessons(
    (preferredProfiles || []).map(p => normalizeFrontierProfile(p)),
    8
  ).filter(p => base.includes(p));
  const ordered = [...preferred, ...base.filter(p => !preferred.includes(p))];
  if (SIMPLE_PROFILE_MODE) {
    if (ordered.length === 0) return ['balanced'];
    return [ordered[0]];
  }
  if (!ordered.includes('balanced')) ordered.push('balanced');
  if (!ordered.includes('clean')) ordered.push('clean');
  return [...new Set(ordered)];
}

function buildApproachProfileOrder(approach, records) {
  const approachKey = normalizeApproach(approach, 'A');
  const baseProfiles = getFrontierProfiles();
  const profileScores = new Map(baseProfiles.map(p => [p, 0]));
  const failurePenalties = new Map(baseProfiles.map(p => [p, 0]));
  const recent = (records || []).slice(Math.max(0, (records || []).length - PROFILE_HISTORY_WINDOW));
  const total = Math.max(1, recent.length);

  for (let i = 0; i < recent.length; i++) {
    const rec = recent[i];
    const recency = 1 + ((i + 1) / total);
    const strat = rec?.strategies?.[approachKey];
    const profile = normalizeFrontierProfile(strat?.passA_profile || '');
    if (!profileScores.has(profile)) continue;
    const overall = Number(strat?.score?.overall);
    const quality = Number.isFinite(overall) ? (overall / 10) : 0.4;
    const winBoost = normalizeApproach(rec?.winner?.approach, 'A') === approachKey ? 1.25 : 0;
    const next = (profileScores.get(profile) || 0) + ((1 + quality + winBoost) * recency);
    profileScores.set(profile, next);

    const passAAttempts = Array.isArray(strat?.attempts?.passA) ? strat.attempts.passA : [];
    for (const attempt of passAAttempts) {
      const attemptProfile = normalizeFrontierProfile(attempt?.profile || profile);
      if (!failurePenalties.has(attemptProfile)) continue;
      const status = String(attempt?.status || '').toLowerCase();
      if (status === 'no_image' || status === 'request_error') {
        let penalty = (status === 'request_error' ? 0.85 : 0.65) * recency;
        if (status === 'no_image') {
          const finish = String(attempt?.finish || '').toUpperCase();
          const block = String(attempt?.block || '').toUpperCase();
          const policyBlocked = POLICY_BLOCK_RE.test(finish) || POLICY_BLOCK_RE.test(block);
          if (policyBlocked) {
            penalty += PROFILE_POLICY_BLOCK_PENALTY * recency;
            if (finish.includes('IMAGE_PROHIBITED_CONTENT')) {
              penalty += PROFILE_HARD_BLOCK_PENALTY * recency;
            } else if (finish.includes('IMAGE_SAFETY') || finish === 'SAFETY' || block.includes('SAFETY')) {
              penalty += PROFILE_SAFETY_BLOCK_PENALTY * recency;
            }
          }
        }
        failurePenalties.set(attemptProfile, (failurePenalties.get(attemptProfile) || 0) + penalty);
      }
    }
  }

  const ordered = [...baseProfiles].sort((a, b) => {
    const scoreA = (profileScores.get(a) || 0) - (failurePenalties.get(a) || 0);
    const scoreB = (profileScores.get(b) || 0) - (failurePenalties.get(b) || 0);
    return scoreB - scoreA;
  });
  return prioritizeProfiles(ordered);
}

function buildPromptPassAFrontier(concept, expression, variation, profile, approach = 'A', lessons = [], synthesisCharter = '') {
  const key = normalizeFrontierProfile(profile);
  const conservative = key === 'clean';
  const approachKey = normalizeApproach(approach, 'A');
  const design = variation ? composeDesignSpec(concept, variation, conservative) : { color: '', brief: '', material: conservative ? concept.materialFallback : concept.material };
  const tone = FRONTIER_PROFILE_NOTES[key];
  const lessonBlock = formatLessonsForPrompt(lessons);
  const charterBlock = formatCSynthesisCharterBlock(synthesisCharter);
  const deepSkillBlock = buildBreakthroughPromptSkillBlock({
    stage: 'passA',
    approach: approachKey,
    lessons,
    profile: key,
  });
  if (approachKey === 'B') {
    const directionTone = key === 'intimate'
      ? 'intimate high-fashion confidence without explicit framing'
      : (key === 'balanced'
        ? 'cinematic restrained luxury with strong realism'
        : 'strictly elegant and compliance-forward editorial framing');
    return `Generate an image of this photograph edited into a premium luxury pool fashion photograph. Subject is an adult woman (21+). Preserve exact identity and age from the reference. Expression: ${expression}. Subject is solo.

APPROACH B (DIRECTORIAL + FAILURE-TESTED):
Create one decisive frame that feels captured, not rendered. Use a photo-director brief followed by a realism QA checklist.

APPROACH DIVERGENCE CONTRACT (HARD):
- Keep the exact same image goal as Approach A (identity, scene intent, compliance, quality target).
- Use a fundamentally different prompting method than A: director call-sheet + shot grammar + QA gates.
- Do not mirror A's section ordering or phrasing style; solve the same goal via a distinct directorial workflow.

${IMAGE_INTENT_BLOCK}
${FOURK_QUALITY_OBJECTIVE_BLOCK}
${deepSkillBlock}

DIRECTOR BRIEF:
- Visual target: ${directionTone}
- Scene anchor: ${SCENE_BASE} ${concept.scene}
- Hero event cue: apply one signature experiential cue only, physically grounded and scene-coherent.
- Pose target (different per image): ${concept.pose}
- Wardrobe target: couture lace one-piece with engineered support and opaque coverage-safe zones
- Colorway and design DNA: ${design.color} ${design.brief}

SHOT GRAMMAR:
1) Establish architecture + time-of-day and lock horizon lines.
2) Place subject with believable weight transfer and contact pressure.
3) Resolve wardrobe silhouette and support geometry from macro to micro.
4) Resolve wet optics (film, droplets, rivulets, caustics) under causal lighting.
5) Finish with sensor-level realism and restrained grading.

IDENTITY + ANATOMY LOCK:
${IDENTITY_LOCK_BLOCK}
${POSE_PHYSICS_BLOCK}
${NO_TOUCH_BLOCK}

WARDROBE ENGINEERING:
GEOMETRY: ${concept.geometry}
MATERIAL: ${design.material}
${SWIMWEAR_PHYSICS_BLOCK}
${CONTACT_PRESSURE_BLOCK}

LIGHT/CAMERA PIPELINE:
${LIGHT_BLOCK}
${CAMERA_BLOCK}
${SENSOR_PIPELINE_BLOCK}

REALISM QA (PASS ALL):
${SEMANTIC_NEGATIVE_BLOCK}
${REFINEMENT_ORDER_BLOCK}
${PHYSICS_FORENSICS_BLOCK}
${WET_INTERACTION_BLOCK}

LESSON DIRECTIVES:
${lessonBlock}

COMPLIANCE:
Fully covered, opaque support zones, non-explicit framing, tasteful editorial tone.
${ELITE_EDITORIAL_BLOCK}`;
  }

  if (approachKey === 'C') {
    return `Generate an image of this photograph edited into a premium luxury pool fashion photograph. Subject is an adult woman (21+). Preserve exact identity and age from the reference. Expression: ${expression}. Subject is solo.

APPROACH C (A/B LESSON-FUSION):
Combine A's physics rigor with B's directorial decisiveness. Produce one image that increases joint quality for identity, garment physics, optics, and realism while preserving compliance.

C SYNTHESIS MANDATE (HARD REQUIREMENT):
- A and B are alternate prompting approaches for the same outcome goal; do not change that goal.
- Author an entirely new C prompt plan from A/B audit findings; do NOT copy, paraphrase, or stitch A/B prompt text.
- Use only validated audit signals (metric deltas + causal evidence) to decide what to keep/import/remove.
- Success criterion: deliver at least ${TARGET_QUALITY_GAIN_PCT.toFixed(1)}% headroom gain over best(A,B) toward score ceiling.

C LEARNING CONTRACT (HARD):
- Learn from both A and B attempts: import at least one macro win from one approach and one microphysics win from the other when supported by audit evidence.
- If a proposed import weakens identity/compliance/physics causality, reject it and retain the stronger baseline behavior.

${IMAGE_INTENT_BLOCK}
${FOURK_QUALITY_OBJECTIVE_BLOCK}
${deepSkillBlock}

C SYNTHESIS CHARTER (AUDIT-DERIVED, FOLLOW STRICTLY):
${charterBlock}

TARGET QUALITY LIFT:
- Aim for a substantial quality gain versus the best A/B attempt for this concept.
- Do not trade compliance for detail.

LESSON DIRECTIVES (APPLY ALL):
${lessonBlock}

FUSION EXECUTION ORDER:
1) Lock geometry, framing, and identity before style.
2) Borrow strongest macro composition logic from the better A/B result.
3) Borrow strongest microphysics (seam tension, wet response, optical coherence) from the other result.
4) Resolve conflicts in favor of realism + compliance.

SCENE: ${SCENE_BASE} ${concept.scene}
${CREATIVE_EVENT_MOMENT_BLOCK}
POSE (DIFFERENT EACH IMAGE): ${concept.pose}
${POSE_PHYSICS_BLOCK}

TONE: ${tone}
DESIGN: ${design.brief}
COLOR: ${design.color}
GEOMETRY: ${concept.geometry}
MATERIAL: ${design.material}
${SWIMWEAR_PHYSICS_BLOCK}
${CONTACT_PRESSURE_BLOCK}
${MICROSTRUCTURE_BLOCK}

CAMERA: ${CAMERA_BLOCK}
LIGHT: ${LIGHT_BLOCK}
RAW PIPELINE: ${SENSOR_PIPELINE_BLOCK}
PHYSICS: ${CLOTH_PHYSICS_BLOCK} ${WET_INTERACTION_BLOCK} ${PHYSICS_FORENSICS_BLOCK}
${SEMANTIC_NEGATIVE_BLOCK}
${NO_TOUCH_BLOCK}
SAFETY: fully covered, opaque support zones, non-explicit framing.
${ELITE_EDITORIAL_BLOCK}`;
  }

  const styling = key === 'intimate'
    ? 'elegant sensual confidence with non-explicit editorial framing'
    : (key === 'balanced'
      ? 'confident cinematic fashion posture with controlled glam energy'
      : 'strictly elegant, restrained, and compliance-robust fashion framing');
  const attireIntent = conservative
    ? 'coverage-safe couture lace one-piece with opaque lining, stabilized seams, and restrained aperture geometry'
    : 'architectural couture lace one-piece with engineered plunge/cutouts, stable load paths, and opaque support zones';
  return `Generate an image of this photograph edited into a premium luxury pool fashion photograph. Subject is an adult woman (21+). Preserve exact identity and age from the reference. Expression: ${expression}. Subject is solo.

APPROACH A (PHYSICS-FIRST SPEC):

${IMAGE_INTENT_BLOCK}
${FOURK_QUALITY_OBJECTIVE_BLOCK}
${deepSkillBlock}
${IDENTITY_LOCK_BLOCK}
${REFERENCE_AUTHORITY_BLOCK}
${STEPWISE_SCENE_BUILD_BLOCK}
${REFINEMENT_ORDER_BLOCK}
${SEMANTIC_NEGATIVE_BLOCK}

SCENE: ${SCENE_BASE} ${concept.scene}
${CREATIVE_EVENT_MOMENT_BLOCK}
POSE (DIFFERENT EACH IMAGE): ${concept.pose}
${POSE_PHYSICS_BLOCK}

TONE: ${tone}
STYLING: ${styling}
ATTIRE INTENT: ${attireIntent}
DESIGN: ${design.brief}
COLOR: ${design.color}
GEOMETRY: ${concept.geometry}
MATERIAL: ${design.material}
${SWIMWEAR_PHYSICS_BLOCK}

CAMERA: ${CAMERA_BLOCK}
LIGHT: ${LIGHT_BLOCK}
RAW PIPELINE: ${SENSOR_PIPELINE_BLOCK}
PHYSICS: ${CLOTH_PHYSICS_BLOCK} ${WET_INTERACTION_BLOCK} ${CONTACT_PRESSURE_BLOCK} ${PHYSICS_FORENSICS_BLOCK}
LESSON DIRECTIVES:
${lessonBlock}
${NO_TOUCH_BLOCK}
SAFETY: fully covered, opaque support zones, non-explicit framing.
${ELITE_EDITORIAL_BLOCK}`;
}

function buildPromptPassBFrontier(
  concept,
  expression,
  variation,
  profile,
  approach = 'A',
  lessons = [],
  synthesisCharter = '',
  passAAuditBlock = ''
) {
  const key = normalizeFrontierProfile(profile);
  const approachKey = normalizeApproach(approach, 'A');
  const design = variation ? composeDesignSpec(concept, variation, key === 'clean') : { color: '', brief: '', micro: concept.microFallback };
  const tone = FRONTIER_PROFILE_NOTES[key];
  const lessonBlock = formatLessonsForPrompt(lessons);
  const charterBlock = formatCSynthesisCharterBlock(synthesisCharter);
  const deepSkillBlock = buildBreakthroughPromptSkillBlock({
    stage: 'passB',
    approach: approachKey,
    lessons,
    profile: key,
  });
  if (approachKey === 'B') {
    const innovativeMethodBlock = buildPassBInnovativeMethodBlock({
      profile: key,
      approach: 'B',
      safeMode: key === 'clean',
    });
    return `Generate an image of this photograph edited from the previous pass. Preserve identity, face, pose, framing, scene, camera, and lighting. Refine only microstructure and physical realism while keeping the same expression: ${expression}.

APPROACH B REFINEMENT (FIRST-PRINCIPLES + EVENT CHOREOGRAPHY):
Treat this as a methodologically different pass from A: derive edits from fundamentals + event cue timing, not from style-adjective expansion.

APPROACH DIVERGENCE CONTRACT (HARD):
- Keep the same goal as A for this concept; only the prompting method differs.
- Maintain B's directorial workflow and avoid collapsing back into A-style physics-spec narration.

${IMAGE_INTENT_BLOCK}
${FOURK_QUALITY_OBJECTIVE_BLOCK}
${deepSkillBlock}
${innovativeMethodBlock}
${passAAuditBlock}

LOCKS:
- Identity, pose, framing, scene, and light are immutable.
- Tone remains: ${tone}
- Geometry remains: ${concept.geometry}
- Colorway remains: ${design.color}
- Keep one hero event cue from pass A and preserve its causal influence on cloth/fluid/optics.

MICRO FINISH TARGETS:
${MICROSTRUCTURE_BLOCK}
${CONTACT_PRESSURE_BLOCK}
${SWIMWEAR_PHYSICS_BLOCK}
${WET_INTERACTION_BLOCK}

OPTICAL + SENSOR CONSISTENCY:
${LIGHT_BLOCK}
${CAMERA_BLOCK}
${SENSOR_PIPELINE_BLOCK}

FAILURE CHECKLIST:
${SEMANTIC_NEGATIVE_BLOCK}
${REFINEMENT_ORDER_BLOCK}
${PHYSICS_FORENSICS_BLOCK}

LESSON DIRECTIVES:
${lessonBlock}
${NO_TOUCH_BLOCK}

COMPLIANCE:
Fully covered, opaque support zones, non-explicit framing.
${ELITE_EDITORIAL_BLOCK}`;
  }

  if (approachKey === 'C') {
    return `Generate an image of this photograph edited from the previous pass. Preserve identity, face, pose, framing, scene, camera, and lighting. Refine only microstructure and physically causal realism while keeping expression fixed: ${expression}.

APPROACH C REFINEMENT (LESSON-FUSION QA):
This pass exists to fuse the strongest A/B details into one coherent result without drift.

C REFINEMENT MANDATE:
- Keep the same A/B outcome goal and preserve all macro locks.
- Treat this as a newly authored audit-driven refinement contract, not a reuse of A/B wording.
- Only apply changes traceable to explicit A/B audit wins (measurable and causally visible in-frame).
- Maintain trajectory toward >= ${TARGET_QUALITY_GAIN_PCT.toFixed(1)}% headroom gain over best(A,B).

C LEARNING CONTRACT (HARD):
- Apply fused learning from both A and B every round (macro from one + microphysics from the other where audit-justified).
- Reject any refinement that cannot be traced to measurable A/B audit evidence.

${IMAGE_INTENT_BLOCK}
${FOURK_QUALITY_OBJECTIVE_BLOCK}
${deepSkillBlock}
${passAAuditBlock}

C SYNTHESIS CHARTER (AUDIT-DERIVED, FOLLOW STRICTLY):
${charterBlock}

LOCKS:
- Identity, pose, framing, scene, and light are immutable.
- Geometry and color remain locked.
- Tone remains: ${tone}
- Keep one hero event cue from pass A and preserve its causal influence on cloth/fluid/optics.

LESSON DIRECTIVES (HIGHEST PRIORITY):
${lessonBlock}

MICRO FINISH TARGETS:
${MICROSTRUCTURE_BLOCK}
${CONTACT_PRESSURE_BLOCK}
${SWIMWEAR_PHYSICS_BLOCK}
${WET_INTERACTION_BLOCK}

OPTICAL + SENSOR CONSISTENCY:
${LIGHT_BLOCK}
${CAMERA_BLOCK}
${SENSOR_PIPELINE_BLOCK}

FAILURE CHECKLIST:
${SEMANTIC_NEGATIVE_BLOCK}
${REFINEMENT_ORDER_BLOCK}
${PHYSICS_FORENSICS_BLOCK}
${NO_TOUCH_BLOCK}

COMPLIANCE:
Fully covered, opaque support zones, non-explicit framing.
${ELITE_EDITORIAL_BLOCK}`;
  }

  return `Generate an image of this photograph edited from the previous pass. Preserve identity, face, pose, framing, scene, camera, and lighting. Refine only microstructure and physical realism while keeping the same expression: ${expression}.

APPROACH A REFINEMENT (PHYSICS-FIRST SPEC):

${IMAGE_INTENT_BLOCK}
${FOURK_QUALITY_OBJECTIVE_BLOCK}
${deepSkillBlock}
${passAAuditBlock}
${IDENTITY_LOCK_BLOCK}
${STEPWISE_SCENE_BUILD_BLOCK}
${REFINEMENT_ORDER_BLOCK}
${SEMANTIC_NEGATIVE_BLOCK}

SCENE (LOCKED): ${SCENE_BASE} ${concept.scene}
HERO EVENT MOMENT (LOCKED): preserve exactly one signature experiential cue from pass A and keep its physical influence coherent.
TONE (LOCKED): ${tone}
GEOMETRY (UNCHANGED): ${concept.geometry}
COLOR (LOCKED): ${design.color}
MICRO MATERIAL PHYSICS: ${design.micro}
${MICROSTRUCTURE_BLOCK}
${CONTACT_PRESSURE_BLOCK}
${SWIMWEAR_PHYSICS_BLOCK}

CAMERA/LIGHT LOCK: ${CAMERA_BLOCK} ${LIGHT_BLOCK}
RAW PIPELINE: ${SENSOR_PIPELINE_BLOCK}
PHYSICS FORENSICS: ${PHYSICS_FORENSICS_BLOCK}
LESSON DIRECTIVES:
${lessonBlock}
${NO_TOUCH_BLOCK}
SAFETY: fully covered, opaque support zones, non-explicit framing.
${ELITE_EDITORIAL_BLOCK}`;
}

function buildPromptPassBPhase2Boundary(concept, expression, variation, profile, approach = 'A', lessons = [], options = {}, synthesisCharter = '') {
  const approachKey = normalizeApproach(approach, 'A');
  const intensity = Math.max(1.0, Number(options?.intensity) || AB_PHASE2_INTENSITY);
  const tactic = String(options?.tactic || '').trim();
  const retryPrecisionMode = String(options?.retryPrecisionMode || '').trim().toLowerCase();
  const retryPrecisionBlock = buildRetryPrecisionBlock(retryPrecisionMode);
  const policyEscapeMode = String(options?.policyEscapeMode || '').trim().toLowerCase();
  const policyEscapeBlock = buildPolicyEscapeBlock(policyEscapeMode);
  const basePrompt = buildPromptPassBFrontier(
    concept,
    expression,
    variation,
    profile,
    approachKey,
    lessons,
    synthesisCharter,
    String(options?.passAAuditBlock || '')
  );
  const modeLine = approachKey === 'A'
    ? 'Phase-2 mode: physics-edge amplification with strict geometry lock.'
    : (approachKey === 'B'
      ? 'Phase-2 mode: event-choreography edge amplification with strict realism/compliance lock.'
      : 'Phase-2 mode: fusion-edge amplification to surpass best A/B while preserving hard identity/compliance locks.');
  return `${basePrompt}

PHASE-2 AGGRESSIVE BOUNDARY ATTEMPT:
${modeLine}
- Increase only micro-detail intensity by ~${Math.round((intensity - 1) * 100)}% versus the current image.
- Allowed gains: seam/load-path readability, lace filament separation, edge fidelity, droplet morphology, caustic consistency.
- Forbidden changes: pose, framing, identity geometry, coverage, exposure balance, scene layout.
- If constraints cannot be preserved exactly, keep the current image characteristics unchanged.
- Quality bar: Pulitzer-grade editorial photography standards in composition, lighting intent, and optical realism.
${retryPrecisionBlock}
${policyEscapeBlock}
${tactic ? `- Variant tactic: ${tactic}` : ''}
`;
}

function parseFirstJsonObject(text) {
  const src = String(text || '');
  const start = src.indexOf('{');
  const end = src.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(src.slice(start, end + 1));
  } catch {
    return null;
  }
}

function extensionForMimeType(mimeType) {
  const normalized = String(mimeType || '').toLowerCase();
  if (normalized.includes('jpeg') || normalized.includes('jpg')) return '.jpg';
  if (normalized.includes('webp')) return '.webp';
  return '.png';
}

function sanitizeToken(value, fallback = 'unknown') {
  const token = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return token || fallback;
}

function extractPromptPreview(contents = [], maxLen = 360) {
  for (const entry of contents || []) {
    const parts = Array.isArray(entry?.parts) ? entry.parts : [];
    for (const part of parts) {
      if (typeof part?.text === 'string' && part.text.trim()) {
        const clean = part.text.replace(/\s+/g, ' ').trim();
        return clean.length > maxLen ? `${clean.slice(0, maxLen)}...` : clean;
      }
    }
  }
  return '';
}

async function archiveImageAttempts({
  data,
  contents = [],
  endpoint = ENDPOINT,
  requestedImageSize = null,
  responseModalities = [],
  trace = null,
}) {
  if (!ARCHIVE_IMAGE_ATTEMPTS) return;
  const promptPreview = extractPromptPreview(contents);
  const candidates = Array.isArray(data?.candidates) ? data.candidates : [];
  const imageParts = [];
  for (let ci = 0; ci < candidates.length; ci++) {
    const parts = Array.isArray(candidates[ci]?.content?.parts) ? candidates[ci].content.parts : [];
    for (let pi = 0; pi < parts.length; pi++) {
      const inline = parts[pi]?.inlineData;
      if (inline?.data) {
        imageParts.push({
          candidateIndex: ci,
          partIndex: pi,
          mimeType: inline.mimeType || 'image/png',
          b64: inline.data,
        });
      }
    }
  }

  const stageToken = sanitizeToken(trace?.stage || trace?.label || trace?.profile || 'model-call');
  const conceptToken = sanitizeToken(trace?.concept || trace?.conceptName || 'unknown-concept');
  const baseMeta = {
    timestamp: new Date().toISOString(),
    concept: conceptToken,
    stage: stageToken,
    trace: trace || null,
    endpoint,
    requested_image_size: requestedImageSize,
    response_modalities: responseModalities,
    prompt_preview: promptPreview,
    image_count: imageParts.length,
  };

  if (!imageParts.length) {
    const seq = ++ATTEMPT_ARCHIVE_SEQ;
    const record = {
      ...baseMeta,
      attempt_id: `${String(seq).padStart(6, '0')}`,
      status: 'no_image',
    };
    await fs.appendFile(ATTEMPTS_MANIFEST_FILE, `${JSON.stringify(record)}\n`);
    return;
  }

  for (let idx = 0; idx < imageParts.length; idx++) {
    const seq = ++ATTEMPT_ARCHIVE_SEQ;
    const attemptId = `${String(seq).padStart(6, '0')}`;
    const part = imageParts[idx];
    const ext = extensionForMimeType(part.mimeType);
    const attemptDir = path.join(ATTEMPT_RUN_DIR, conceptToken, stageToken, attemptId);
    await fs.mkdir(attemptDir, { recursive: true });
    const imagePath = path.join(attemptDir, `image${ext}`);
    const buffer = Buffer.from(part.b64, 'base64');
    await fs.writeFile(imagePath, buffer);
    const meta = {
      ...baseMeta,
      attempt_id: attemptId,
      candidate_index: part.candidateIndex,
      part_index: part.partIndex,
      mime_type: part.mimeType,
      bytes: buffer.length,
      image_path: imagePath,
    };
    await fs.writeFile(path.join(attemptDir, 'meta.json'), `${JSON.stringify(meta, null, 2)}\n`);
    await fs.appendFile(ATTEMPTS_MANIFEST_FILE, `${JSON.stringify(meta)}\n`);
  }
}

function formatFaceDistance(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num.toFixed(4) : 'n/a';
}

async function runDeterministicFaceIdentityCheck({
  referencePath,
  candidateBuffer,
  candidateMimeType = 'image/png',
  label = '',
}) {
  if (!FACE_VERIFY_ENABLED) {
    return { enabled: false, pass: true, reason: 'disabled' };
  }

  const refPath = String(referencePath || '').trim();
  if (!refPath) {
    return {
      enabled: true,
      pass: !FACE_VERIFY_FAIL_CLOSED,
      distance: null,
      threshold: FACE_VERIFY_MAX_DISTANCE,
      referenceFaceDetected: false,
      candidateFaceDetected: false,
      error: 'missing_reference_path',
      failOpen: !FACE_VERIFY_FAIL_CLOSED,
    };
  }
  if (!Buffer.isBuffer(candidateBuffer) || candidateBuffer.length === 0) {
    return {
      enabled: true,
      pass: !FACE_VERIFY_FAIL_CLOSED,
      distance: null,
      threshold: FACE_VERIFY_MAX_DISTANCE,
      referenceFaceDetected: false,
      candidateFaceDetected: false,
      error: 'empty_candidate_buffer',
      failOpen: !FACE_VERIFY_FAIL_CLOSED,
    };
  }

  const token = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const candidatePath = path.join(
    FACE_VERIFY_TMP_DIR,
    `${token}${extensionForMimeType(candidateMimeType)}`
  );

  try {
    await fs.mkdir(FACE_VERIFY_TMP_DIR, { recursive: true });
    await fs.writeFile(candidatePath, candidateBuffer);

    const proc = spawnSync('swift', [FACE_VERIFY_HELPER_PATH, refPath, candidatePath], {
      encoding: 'utf8',
      timeout: FACE_VERIFY_TIMEOUT_MS,
      maxBuffer: 1024 * 1024,
    });
    if (proc.error) throw proc.error;

    const stdout = String(proc.stdout || '').trim();
    const stderr = String(proc.stderr || '').trim();
    if (!stdout) {
      if (proc.status === 0) throw new Error('empty_stdout');
      throw new Error(stderr || `exit_status_${proc.status}`);
    }

    const parsed = parseFirstJsonObject(stdout);
    if (!parsed || typeof parsed !== 'object') {
      throw new Error(`non_json_stdout:${stdout.slice(0, 160)}`);
    }

    const referenceFaceDetected = Boolean(parsed.reference_face_detected);
    const candidateFaceDetected = Boolean(parsed.candidate_face_detected);
    const distanceValue = Number(parsed.distance);
    const distance = Number.isFinite(distanceValue) ? distanceValue : null;
    const helperError = String(parsed.error || '').trim();

    const hasMeasurement = referenceFaceDetected && candidateFaceDetected && distance !== null && !helperError;
    if (!hasMeasurement) {
      return {
        enabled: true,
        pass: !FACE_VERIFY_FAIL_CLOSED,
        distance,
        threshold: FACE_VERIFY_MAX_DISTANCE,
        referenceFaceDetected,
        candidateFaceDetected,
        error: helperError || `face_detect_failed(ref=${referenceFaceDetected},cand=${candidateFaceDetected})`,
        failOpen: !FACE_VERIFY_FAIL_CLOSED,
      };
    }

    return {
      enabled: true,
      pass: distance <= FACE_VERIFY_MAX_DISTANCE,
      distance,
      threshold: FACE_VERIFY_MAX_DISTANCE,
      referenceFaceDetected,
      candidateFaceDetected,
      error: null,
      failOpen: false,
    };
  } catch (err) {
    return {
      enabled: true,
      pass: !FACE_VERIFY_FAIL_CLOSED,
      distance: null,
      threshold: FACE_VERIFY_MAX_DISTANCE,
      referenceFaceDetected: false,
      candidateFaceDetected: false,
      error: `verifier_error:${err.message}`,
      failOpen: !FACE_VERIFY_FAIL_CLOSED,
    };
  } finally {
    await fs.unlink(candidatePath).catch(() => {});
  }
}

async function enforceDeterministicIdentityGate({
  referencePath,
  candidateBuffer,
  candidateMimeType,
  approachKey = 'A',
  profile = 'unknown',
  stage = 'passA',
  attemptLog = null,
}) {
  const result = await runDeterministicFaceIdentityCheck({
    referencePath,
    candidateBuffer,
    candidateMimeType,
    label: `${approachKey}/${profile}/${stage}`,
  });
  if (!result.enabled) return { accepted: true, result };

  if (result.pass) {
    if (FACE_VERIFY_VERBOSE) {
      console.log(
        `Face identity gate pass approach=${approachKey} profile=${profile} stage=${stage}: ` +
        `distance=${formatFaceDistance(result.distance)} <= ${result.threshold.toFixed(4)}`
      );
    }
    return { accepted: true, result };
  }

  const reason = result.error
    ? result.error
    : `distance=${formatFaceDistance(result.distance)} > ${result.threshold.toFixed(4)}`;
  const mode = result.failOpen ? 'fail-open' : 'hard-fail';
  console.log(
    `Face identity gate reject approach=${approachKey} profile=${profile} stage=${stage} ` +
    `[${mode}] ${reason}`
  );
  if (Array.isArray(attemptLog)) {
    attemptLog.push({
      profile,
      stage,
      status: 'identity_distance_rejected',
      face_distance: Number.isFinite(Number(result.distance)) ? Number(result.distance) : null,
      face_threshold: result.threshold,
      face_reference_detected: result.referenceFaceDetected,
      face_candidate_detected: result.candidateFaceDetected,
      face_error: result.error || null,
      face_fail_open: !!result.failOpen,
    });
  }
  return { accepted: false, result };
}

async function loadAuditRecords() {
  try {
    const txt = await fs.readFile(AB_AUDIT_FILE, 'utf8');
    return txt
      .split('\n')
      .map(s => s.trim())
      .filter(Boolean)
      .map(line => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      })
      .filter(Boolean);
  } catch {
    return [];
  }
}

async function loadAuditSummary() {
  try {
    const txt = await fs.readFile(AB_SUMMARY_FILE, 'utf8');
    const parsed = JSON.parse(txt);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

async function loadLearningAuditRecords() {
  try {
    const txt = await fs.readFile(LEARNING_AUDIT_FILE, 'utf8');
    return txt
      .split('\n')
      .map(s => s.trim())
      .filter(Boolean)
      .map(line => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      })
      .filter(Boolean);
  } catch {
    return [];
  }
}

function buildLearningAuditRecord(auditRecord) {
  const winner = normalizeApproach(auditRecord?.winner?.approach, 'A');
  const strategies = auditRecord?.strategies || {};
  const scoreA = strategies?.A?.score;
  const scoreB = strategies?.B?.score;
  const scoreC = strategies?.C?.score;
  const baselineA = strategies?.A?.baseline_score;
  const baselineB = strategies?.B?.baseline_score;
  const baselineC = strategies?.C?.baseline_score;
  const winnerScore = strategies?.[winner]?.score;

  const metricKeys = Object.keys(METRIC_GAP_DIRECTIVES);
  const weakest = metricKeys
    .map(key => ({ key, value: metricValue(winnerScore, key) }))
    .sort((a, b) => a.value - b.value)
    .slice(0, 3);
  const photographerWeak = [
    { key: 'composition_score', label: 'composition' },
    { key: 'lighting_intent_score', label: 'lighting_intent' },
    { key: 'editorial_consistency_score', label: 'editorial_consistency' },
  ]
    .map(item => ({ ...item, value: metricValue(winnerScore, item.key) }))
    .sort((a, b) => a.value - b.value);
  const deltaA = (Number(scoreA?.overall) || 0) - (Number(baselineA?.overall) || 0);
  const deltaB = (Number(scoreB?.overall) || 0) - (Number(baselineB?.overall) || 0);
  const deltaC = (Number(scoreC?.overall) || 0) - (Number(baselineC?.overall) || 0);
  const cDelta = Number(auditRecord?.comparisons?.c_vs_best_ab) || 0;
  const cGainPctRaw = Number(auditRecord?.comparisons?.c_gain_percent_vs_best_ab);
  const cGainPctHeadroom = Number(auditRecord?.comparisons?.c_headroom_gain_percent_vs_best_ab);
  const cGainPct = Number.isFinite(cGainPctHeadroom) ? cGainPctHeadroom : cGainPctRaw;
  const cGainTargetPct = Number.isFinite(Number(auditRecord?.comparisons?.target_gain_percent))
    ? Number(auditRecord?.comparisons?.target_gain_percent)
    : TARGET_QUALITY_GAIN_PCT;
  const phaseMultipliers = auditRecord?.comparisons?.phase_multipliers || {};
  const phaseTargets = phaseMultipliers?.targets || {};
  const phaseHits = phaseMultipliers?.target_hits || {};
  const process = auditRecord?.process || {};
  const variationControl = auditRecord?.deep_audit?.variation_control || {};
  const auditQuality = auditRecord?.audit_quality || {};
  const auditConfidence = Number(auditQuality?.confidence) || 0;
  const auditRiskFlags = normalizeLessons(auditQuality?.risk_flags || [], 12);
  const summarizePhase2 = rounds => {
    const list = Array.isArray(rounds) ? rounds : [];
    return {
      total: list.length,
      accepted: list.filter(r => r?.accepted === true).length,
      rejected: list.filter(r => r?.accepted === false).length,
      request_errors: list.filter(r => r?.status === 'request_error').length,
      no_image: list.filter(r => r?.status === 'no_image' || r?.status === 'no_viable_variant').length,
    };
  };
  const phase2Stats = {
    A: summarizePhase2(strategies?.A?.attempts?.phase2),
    B: summarizePhase2(strategies?.B?.attempts?.phase2),
    C: summarizePhase2(strategies?.C?.attempts?.phase2),
    final_winner_boost: summarizePhase2(auditRecord?.deep_audit?.final_audit_boost?.rounds),
  };
  const phase2Total = phase2Stats.A.total + phase2Stats.B.total + phase2Stats.C.total + phase2Stats.final_winner_boost.total;
  const phase2Rejected = phase2Stats.A.rejected + phase2Stats.B.rejected + phase2Stats.C.rejected + phase2Stats.final_winner_boost.rejected;
  const phase2RequestErrors = phase2Stats.A.request_errors + phase2Stats.B.request_errors + phase2Stats.C.request_errors + phase2Stats.final_winner_boost.request_errors;
  const phase2NoImage = phase2Stats.A.no_image + phase2Stats.B.no_image + phase2Stats.C.no_image + phase2Stats.final_winner_boost.no_image;
  const phase2RejectRate = phase2Total > 0 ? (phase2Rejected / phase2Total) : 0;
  const phase2FailureRate = phase2Total > 0 ? ((phase2RequestErrors + phase2NoImage) / phase2Total) : 0;
  const recommendedActions = normalizeLessons([
    ...weakest.map(m => `Next round (${winner}) ${m.key}: ${METRIC_GAP_DIRECTIVES[m.key]}`),
    ...(auditRecord?.lessons?.deep_audit || []).slice(0, 3),
    ...(auditRecord?.hints || []).slice(0, 3),
    ...(cDelta < 0.2 ? ['Increase C fusion specificity: fewer but harder priority directives tied to weakest winner metrics.'] : []),
    ...(deltaC < 0.06 ? ['Increase C self-iteration depth and phase-2 fusion tactics to lift C beyond best A/B.'] : []),
    ...((deltaA < 0.08 || deltaB < 0.08) ? ['Increase boundary search depth (more phase2 variants or rounds) for A/B.'] : []),
    ...(phase2RejectRate > 0.5 ? ['Phase-2 rejection rate is high; bias candidate selection toward viability-safe variants before escalation.'] : []),
    ...(phase2FailureRate > 0.25 ? ['Phase-2 no-image/request-error rate is high; reduce intensity step and stabilize prompts before adding rounds.'] : []),
    ...(variationControl?.a_equals_b === false ? ['Lock A/B to identical variation inputs; remove confounds before comparing strategy performance.'] : []),
    ...(variationControl?.c_equals_ab === false ? ['Lock C variation to A/B when measuring fusion lift against best A/B baseline.'] : []),
    ...(phaseHits?.initial === false ? [`Initial phase multiplier missed target (${(Number(phaseTargets?.initial) || INITIAL_QUALITY_TARGET_MULTIPLIER).toFixed(2)}x); strengthen pass A/B candidate quality floor.`] : []),
    ...(phaseHits?.revised === false ? [`Revised phase multiplier missed target (${(Number(phaseTargets?.revised) || REVISED_QUALITY_TARGET_MULTIPLIER).toFixed(2)}x); increase A/B iterative boundary depth.`] : []),
    ...(phaseHits?.final === false ? [`Final phase multiplier missed target (${(Number(phaseTargets?.final) || FINAL_QUALITY_TARGET_MULTIPLIER).toFixed(2)}x); increase final audit boost rounds and C optimization pressure.`] : []),
    ...(photographerWeak[0]?.value < 9.4 ? [`Photographer bar (${photographerWeak[0].label}) below elite threshold; enforce stronger editorial art-direction consistency.`] : []),
    ...(photographerWeak[1]?.value < 9.4 ? [`Photographer bar (${photographerWeak[1].label}) below elite threshold; tighten lighting intent and source hierarchy.`] : []),
    ...(Number.isFinite(cGainPct) && cGainPct < cGainTargetPct
      ? [`C headroom-gain target miss: achieved ${cGainPct.toFixed(1)}% vs required ${cGainTargetPct.toFixed(1)}%; tighten C fusion directives and enforce stronger deterministic uplift tactics.`]
      : []),
    ...(auditConfidence < 0.55 ? ['Audit confidence is low; reduce exploratory variance and prioritize deterministic gain directives.'] : []),
    ...(auditRiskFlags.includes('winner_margin_tight') ? ['Winner margin is tight; run extra tie-break rounds with stricter identity/compliance guardrails.'] : []),
    ...(auditRiskFlags.includes('phase2_failure_rate_high') ? ['Phase-2 failures are high; reduce intensity step and use simpler, higher-viability prompt deltas.'] : []),
    ...(auditRiskFlags.includes('identity_below_guardrail') ? ['Identity guardrail risk detected; bias all next-round actions toward landmark-lock and asymmetry preservation.'] : []),
    ...(auditRiskFlags.includes('compliance_below_guardrail') ? ['Compliance guardrail risk detected; tighten wording and remove ambiguous directorial intensity language.'] : []),
  ], 10);

  return {
    timestamp: new Date().toISOString(),
    concept: auditRecord?.concept,
    process,
    winner: {
      approach: winner,
      score: Number(winnerScore?.overall) || 0,
    },
    performance: {
      baseline: {
        A: Number(baselineA?.overall) || 0,
        B: Number(baselineB?.overall) || 0,
        C: Number(baselineC?.overall) || 0,
      },
      final: {
        A: Number(scoreA?.overall) || 0,
        B: Number(scoreB?.overall) || 0,
        C: Number(scoreC?.overall) || 0,
      },
      deltas: {
        A: deltaA,
        B: deltaB,
        C: deltaC,
        C_vs_best_ab: cDelta,
      },
    },
    phase2_stats: phase2Stats,
    variation_control: variationControl,
    audit_quality: {
      confidence: auditConfidence,
      winner_margin: Number(auditQuality?.winner_margin) || 0,
      score_spread: Number(auditQuality?.score_spread) || 0,
      risk_flags: auditRiskFlags,
      phase2: {
        total: Number(auditQuality?.phase2?.total) || 0,
        accepted_rate: Number(auditQuality?.phase2?.accepted_rate) || 0,
        failure_rate: Number(auditQuality?.phase2?.failure_rate) || 0,
      },
    },
    photographer_metrics: {
      composition_score: metricValue(winnerScore, 'composition_score'),
      lighting_intent_score: metricValue(winnerScore, 'lighting_intent_score'),
      editorial_consistency_score: metricValue(winnerScore, 'editorial_consistency_score'),
    },
    phase_multipliers: {
      initial_from_seed: Number(phaseMultipliers?.initial_from_seed) || 0,
      revised_from_initial: Number(phaseMultipliers?.revised_from_initial) || 0,
      final_from_revised: Number(phaseMultipliers?.final_from_revised) || 0,
      final_c_from_revised: Number(phaseMultipliers?.final_c_from_revised) || 0,
      targets: {
        initial: Number(phaseTargets?.initial) || INITIAL_QUALITY_TARGET_MULTIPLIER,
        revised: Number(phaseTargets?.revised) || REVISED_QUALITY_TARGET_MULTIPLIER,
        final: Number(phaseTargets?.final) || FINAL_QUALITY_TARGET_MULTIPLIER,
      },
      target_hits: {
        initial: phaseHits?.initial === true,
        revised: phaseHits?.revised === true,
        final: phaseHits?.final === true,
      },
    },
    weak_metrics: weakest.map(m => ({ metric: m.key, score: m.value })),
    recommended_actions: recommendedActions,
  };
}

function normalizeLearningPlan(records) {
  const plan = {
    rounds: records.length,
    groundbreaking_mode_seen: false,
    avg_deltas: { A: 0, B: 0, C: 0, C_vs_best_ab: 0 },
    avg_winner_score: 0,
    audit_quality: {
      avg_confidence: 0,
      risk_flags: {},
    },
    variation_control: {
      ab_locked_count: 0,
      c_locked_count: 0,
      ab_locked_rate: 0,
      c_locked_rate: 0,
    },
    phase2: {
      total: 0,
      accepted: 0,
      rejected: 0,
      request_errors: 0,
      no_image: 0,
      accepted_rate: 0,
      rejected_rate: 0,
      failure_rate: 0,
    },
    phase_multipliers: {
      avg: {
        initial_from_seed: 0,
        revised_from_initial: 0,
        final_from_revised: 0,
        final_c_from_revised: 0,
      },
      hit_rates: {
        initial: 0,
        revised: 0,
        final: 0,
      },
      targets: {
        initial: INITIAL_QUALITY_TARGET_MULTIPLIER,
        revised: REVISED_QUALITY_TARGET_MULTIPLIER,
        final: FINAL_QUALITY_TARGET_MULTIPLIER,
      },
    },
    top_actions: [],
    avoid_actions: [],
    next_round_objectives: [],
    recommended_config: {},
  };
  if (!records.length) return plan;

  let sumDeltaA = 0;
  let sumDeltaB = 0;
  let sumDeltaCSelf = 0;
  let sumDeltaC = 0;
  let sumWinnerScore = 0;
  let sumMultInitial = 0;
  let sumMultRevised = 0;
  let sumMultFinal = 0;
  let sumMultFinalC = 0;
  let hitInitial = 0;
  let hitRevised = 0;
  let hitFinal = 0;
  let sumConfidence = 0;
  const riskFlagCounts = new Map();
  const actionStats = new Map();
  const bumpAction = (action, { weight = 1, avoid = false } = {}) => {
    const key = String(action || '').trim();
    if (!key) return;
    const current = actionStats.get(key) || {
      action: key,
      count: 0,
      weighted_score: 0,
      avoid_score: 0,
    };
    current.count += 1;
    current.weighted_score += Number(weight) || 0;
    if (avoid) current.avoid_score += Math.abs(Number(weight) || 0);
    actionStats.set(key, current);
  };
  for (const rec of records) {
    const deltaA = Number(rec?.performance?.deltas?.A) || 0;
    const deltaB = Number(rec?.performance?.deltas?.B) || 0;
    const deltaCSelf = Number(rec?.performance?.deltas?.C) || 0;
    const deltaC = Number(rec?.performance?.deltas?.C_vs_best_ab) || 0;
    const winnerScore = Number(rec?.winner?.score) || 0;
    const auditConfidence = Number(rec?.audit_quality?.confidence);
    const confidence = Number.isFinite(auditConfidence) ? auditConfidence : 0.5;
    const riskFlags = normalizeLessons(rec?.audit_quality?.risk_flags || [], 12);

    sumDeltaA += deltaA;
    sumDeltaB += deltaB;
    sumDeltaCSelf += deltaCSelf;
    sumDeltaC += deltaC;
    sumWinnerScore += winnerScore;
    sumConfidence += confidence;
    for (const flag of riskFlags) {
      riskFlagCounts.set(flag, (riskFlagCounts.get(flag) || 0) + 1);
    }

    const mult = rec?.phase_multipliers || {};
    sumMultInitial += Number(mult?.initial_from_seed) || 0;
    sumMultRevised += Number(mult?.revised_from_initial) || 0;
    sumMultFinal += Number(mult?.final_from_revised) || 0;
    sumMultFinalC += Number(mult?.final_c_from_revised) || 0;
    if (mult?.target_hits?.initial === true) hitInitial += 1;
    if (mult?.target_hits?.revised === true) hitRevised += 1;
    if (mult?.target_hits?.final === true) hitFinal += 1;
    if (rec?.process?.groundbreaking_mode) plan.groundbreaking_mode_seen = true;

    let recPhase2Total = 0;
    let recPhase2Accepted = 0;
    let recPhase2Failures = 0;
    for (const key of ['A', 'B', 'C', 'final_winner_boost']) {
      const stats = rec?.phase2_stats?.[key];
      plan.phase2.total += Number(stats?.total) || 0;
      plan.phase2.accepted += Number(stats?.accepted) || 0;
      plan.phase2.rejected += Number(stats?.rejected) || 0;
      plan.phase2.request_errors += Number(stats?.request_errors) || 0;
      plan.phase2.no_image += Number(stats?.no_image) || 0;
      recPhase2Total += Number(stats?.total) || 0;
      recPhase2Accepted += Number(stats?.accepted) || 0;
      recPhase2Failures += (Number(stats?.request_errors) || 0) + (Number(stats?.no_image) || 0);
    }
    if (rec?.variation_control?.a_equals_b === true) plan.variation_control.ab_locked_count += 1;
    if (rec?.variation_control?.c_equals_ab === true) plan.variation_control.c_locked_count += 1;

    const recPhase2FailureRate = recPhase2Total > 0 ? (recPhase2Failures / recPhase2Total) : 0;
    const outcomeWeight = Math.max(
      0.2,
      1
      + (0.75 * deltaC)
      + (0.20 * Math.max(deltaA, deltaB, deltaCSelf))
      + (0.30 * (winnerScore - 9.0))
      + (0.55 * (confidence - 0.5))
      - (0.60 * recPhase2FailureRate)
    );
    const poorOutcome = (
      deltaC < 0.05
      || confidence < 0.45
      || recPhase2FailureRate > 0.35
      || riskFlags.includes('phase2_failure_rate_high')
    );
    for (const action of normalizeLessons(rec?.recommended_actions || [], 20)) {
      bumpAction(action, { weight: outcomeWeight, avoid: false });
      if (poorOutcome) {
        bumpAction(action, { weight: 0.8 + recPhase2FailureRate, avoid: true });
      }
    }
  }

  const n = records.length;
  plan.avg_deltas.A = sumDeltaA / n;
  plan.avg_deltas.B = sumDeltaB / n;
  plan.avg_deltas.C = sumDeltaCSelf / n;
  plan.avg_deltas.C_vs_best_ab = sumDeltaC / n;
  plan.avg_winner_score = sumWinnerScore / n;
  plan.phase_multipliers.avg.initial_from_seed = sumMultInitial / n;
  plan.phase_multipliers.avg.revised_from_initial = sumMultRevised / n;
  plan.phase_multipliers.avg.final_from_revised = sumMultFinal / n;
  plan.phase_multipliers.avg.final_c_from_revised = sumMultFinalC / n;
  plan.phase_multipliers.hit_rates.initial = hitInitial / n;
  plan.phase_multipliers.hit_rates.revised = hitRevised / n;
  plan.phase_multipliers.hit_rates.final = hitFinal / n;
  plan.audit_quality.avg_confidence = sumConfidence / n;
  plan.audit_quality.risk_flags = Object.fromEntries(
    [...riskFlagCounts.entries()].sort((a, b) => b[1] - a[1])
  );
  plan.variation_control.ab_locked_rate = plan.variation_control.ab_locked_count / n;
  plan.variation_control.c_locked_rate = plan.variation_control.c_locked_count / n;
  if (plan.phase2.total > 0) {
    plan.phase2.accepted_rate = plan.phase2.accepted / plan.phase2.total;
    plan.phase2.rejected_rate = plan.phase2.rejected / plan.phase2.total;
    plan.phase2.failure_rate = (plan.phase2.request_errors + plan.phase2.no_image) / plan.phase2.total;
  }
  const actionRanked = [...actionStats.values()];
  plan.top_actions = actionRanked
    .sort((a, b) => {
      const aScore = (a.weighted_score - (a.avoid_score * 0.5));
      const bScore = (b.weighted_score - (b.avoid_score * 0.5));
      if (bScore !== aScore) return bScore - aScore;
      return b.count - a.count;
    })
    .slice(0, 8)
    .map(item => ({
      action: item.action,
      count: item.count,
      weighted_score: item.weighted_score,
      avoid_score: item.avoid_score,
    }));
  plan.avoid_actions = actionRanked
    .filter(item => item.avoid_score >= 1.0)
    .sort((a, b) => b.avoid_score - a.avoid_score)
    .slice(0, 6)
    .map(item => ({
      action: item.action,
      count: item.count,
      weighted_score: item.weighted_score,
      avoid_score: item.avoid_score,
    }));
  plan.next_round_objectives = [
    ...plan.top_actions
      .filter(item => item.avoid_score < (item.weighted_score * 0.8))
      .slice(0, 3)
      .map(item => item.action),
    ...(plan.avoid_actions.length > 0
      ? [`Avoid repeating low-yield directives: ${plan.avoid_actions[0].action}`]
      : []),
  ].slice(0, 4);

  const cNeedsHelp = plan.avg_deltas.C_vs_best_ab < 0.2;
  const abNeedsHelp = plan.avg_deltas.A < 0.08 || plan.avg_deltas.B < 0.08;
  const cSelfNeedsHelp = plan.avg_deltas.C < 0.06;
  const initialPhaseNeedsHelp = plan.phase_multipliers.avg.initial_from_seed < INITIAL_QUALITY_TARGET_MULTIPLIER;
  const revisedPhaseNeedsHelp = plan.phase_multipliers.avg.revised_from_initial < REVISED_QUALITY_TARGET_MULTIPLIER;
  const finalPhaseNeedsHelp = plan.phase_multipliers.avg.final_from_revised < FINAL_QUALITY_TARGET_MULTIPLIER;
  const highPhase2Failure = plan.phase2.failure_rate > 0.35;
  const highPhase2Reject = plan.phase2.rejected_rate > 0.55;
  const lowConfidence = plan.audit_quality.avg_confidence < 0.55;
  const tightWinnerRate = (plan.audit_quality.risk_flags.winner_margin_tight || 0) / Math.max(1, n);
  plan.recommended_config = {
    lock_ab_variation: 1,
    lock_c_variation_to_ab: cNeedsHelp ? 1 : (plan.variation_control.c_locked_rate >= 0.5 ? 1 : 0),
    resume_skip_completed_ab: 1,
    phase2_variants_per_round: (cNeedsHelp || initialPhaseNeedsHelp || revisedPhaseNeedsHelp || lowConfidence)
      ? (highPhase2Failure ? 2 : (tightWinnerRate > 0.4 ? 4 : 3))
      : 2,
    phase2_variant_intensity_step: (highPhase2Reject || lowConfidence) ? 0.06 : 0.08,
    approach_self_iteration_rounds_max: (abNeedsHelp || revisedPhaseNeedsHelp || lowConfidence) ? (highPhase2Failure ? 1 : 2) : 1,
    c_self_iteration_rounds_max: (cSelfNeedsHelp || cNeedsHelp) ? (highPhase2Failure ? 1 : 2) : 1,
    ab_iteration_rounds_max: (cNeedsHelp || tightWinnerRate > 0.4) ? (highPhase2Failure ? 2 : 3) : 2,
    final_audit_boost_rounds_max: (finalPhaseNeedsHelp || lowConfidence) ? (highPhase2Failure ? 1 : 2) : 1,
  };
  return plan;
}

function bestOfScores(scoreMap, keys) {
  let best = { key: null, score: -Infinity };
  for (const key of keys) {
    const value = Number(scoreMap?.[key]);
    if (Number.isFinite(value) && value > best.score) {
      best = { key, score: value };
    }
  }
  return best;
}

function qualityPower(scoreLike) {
  const s = Math.max(0, Math.min(9.999, Number(scoreLike?.overall ?? scoreLike) || 0));
  return s / Math.max(0.01, 10 - s);
}

function qualityMultiplier(toScoreLike, fromScoreLike) {
  const from = qualityPower(fromScoreLike);
  const to = qualityPower(toScoreLike);
  return to / Math.max(0.01, from);
}

function qualityHeadroomGainPercent(toScoreLike, fromScoreLike, ceiling = QUALITY_SCORE_CEILING) {
  const cap = Math.max(1, Number(ceiling) || 10);
  const fromScore = Math.max(0, Math.min(cap, Number(fromScoreLike?.overall ?? fromScoreLike) || 0));
  const toScore = Math.max(0, Math.min(cap, Number(toScoreLike?.overall ?? toScoreLike) || 0));
  const fromGap = Math.max(0, cap - fromScore);
  const toGap = Math.max(0, cap - toScore);
  if (fromGap <= 1e-6) {
    if (toScore > fromScore + 1e-6) return 100;
    if (toScore + 1e-6 < fromScore) return -100;
    return 0;
  }
  return ((fromGap - toGap) / fromGap) * 100;
}

function evaluatePassBGainTarget(candidateScoreLike, passAScoreLike) {
  const baseline = Number(passAScoreLike?.overall ?? passAScoreLike) || 0;
  const candidate = Number(candidateScoreLike?.overall ?? candidateScoreLike) || 0;
  const targetPct = Math.max(0, PASS_B_PASSA_GAIN_TARGET_PCT);
  const headroomGainPct = qualityHeadroomGainPercent(candidate, baseline, QUALITY_SCORE_CEILING);
  const targetScore = baseline + ((targetPct / 100) * Math.max(0, QUALITY_SCORE_CEILING - baseline));
  const pass = headroomGainPct >= targetPct;
  return {
    pass,
    baseline,
    candidate,
    targetPct,
    headroomGainPct,
    shortfallPct: Math.max(0, targetPct - headroomGainPct),
    targetScore,
  };
}

function formatPassBGainLog(prefix, gainEval) {
  return `${prefix} passA=${gainEval.baseline.toFixed(2)} candidate=${gainEval.candidate.toFixed(2)} ` +
    `headroom_gain=${gainEval.headroomGainPct.toFixed(1)}% target=${gainEval.targetPct.toFixed(1)}% ` +
    `target_score>=${gainEval.targetScore.toFixed(2)} pass=${gainEval.pass ? 'yes' : 'no'}`;
}

function buildPassBGainDirective(gainEval, round = 1) {
  return `PASS B ITERATION TARGET (ROUND ${round}):
- Baseline is audited Pass A overall ${gainEval.baseline.toFixed(2)}.
- Current candidate ${gainEval.candidate.toFixed(2)} with headroom gain ${gainEval.headroomGainPct.toFixed(1)}%.
- Required target: >= ${gainEval.targetPct.toFixed(1)}% headroom gain (practical score >= ${gainEval.targetScore.toFixed(2)}).
- Improve only physically causal details tied to Pass A audit weaknesses; preserve identity/pose/framing/compliance.`;
}

async function scoreFrontierCandidate({ referenceMimeType, referenceB64, candidateMimeType, candidateB64, concept, expression, profile }) {
  const scorerIdentitySignature = REFERENCE_IDENTITY_SIGNATURE
    ? `Reference identity signature cues: ${REFERENCE_IDENTITY_SIGNATURE}.`
    : '';
  const scorerIdentityNegative = REFERENCE_IDENTITY_NEGATIVE
    ? `Identity anti-substitution cues (candidate must avoid): ${REFERENCE_IDENTITY_NEGATIVE}.`
    : '';
  const scorerPrompt = `You are a strict world-class fashion and portrait photographer acting as an image quality judge.
First image is the identity reference photo. Second image is the generated candidate.
Score each metric from 0.0 to 10.0 (10 is best):
- identity_score
- anatomy_score
- garment_physics_score
- optics_score
- realism_score
- attire_adherence_score
- compliance_score
- composition_score
- lighting_intent_score
- editorial_consistency_score
Identity verdict is mandatory: if candidate is not unequivocally the same woman as reference, set identity_score <= 1.0 and overall_score <= 2.0.
Wardrobe adherence verdict is mandatory: candidate must fully replace source outfit and match the concept's couture swimwear geometry/material intent. If source/casual clothing remains (for example tees/tanks/denim/streetwear) or concept wardrobe intent is missing, set attire_adherence_score <= 2.0 and overall_score <= 4.0.
Physics verdict is mandatory: run first-principles checks in this order: force/load continuity -> material response -> fluid behavior -> optical causality -> sensor evidence.
If major physics breaks exist (unsupported load paths, impossible seam deformation, non-causal highlights, fluid-motion contradictions), set garment_physics_score <= 4.0, optics_score <= 4.0, realism_score <= 4.5, and overall_score <= 5.0.
4K microdetail verdict is mandatory: inspect only physically plausible fine structure (thread relief, stitch-pitch variation, edge-fiber behavior, droplet contact angles, rivulet gradients, pore-level spec breakup). If detail is smeared, repetitive, plastic, or non-causal, cap garment_physics_score <= 6.5, optics_score <= 6.5, realism_score <= 6.5, and overall_score <= 7.0.
${scorerIdentitySignature}
${scorerIdentityNegative}
Return only one JSON object with all keys above and one additional key overall_score.
Context: concept=${concept.name}; expression=${expression}; profile=${profile}.`;

  const parts = MULTIMODAL_FILE_FIRST
    ? [
      { inlineData: { mimeType: referenceMimeType, data: referenceB64 } },
      { inlineData: { mimeType: candidateMimeType, data: candidateB64 } },
      { text: scorerPrompt },
    ]
    : [
      { text: scorerPrompt },
      { inlineData: { mimeType: referenceMimeType, data: referenceB64 } },
      { inlineData: { mimeType: candidateMimeType, data: candidateB64 } },
    ];

  try {
    const data = await callModel([{ role: 'user', parts }], 0, false, ['TEXT'], SCORER_ENDPOINT);
    const texts = (data?.candidates?.[0]?.content?.parts || [])
      .map(p => p?.text)
      .filter(Boolean);
    const parsed = parseFirstJsonObject(texts.join('\n'));
    if (!parsed) {
      return {
        overall: 5.0,
        metrics: {},
        raw: texts.join('\n'),
      };
    }
    const num = key => {
      const value = Number(parsed?.[key]);
      return Number.isFinite(value) ? value : 5.0;
    };
    const identity = num('identity_score');
    const anatomy = num('anatomy_score');
    const garment = num('garment_physics_score');
    const optics = num('optics_score');
    const realism = num('realism_score');
    const attire = num('attire_adherence_score');
    const compliance = num('compliance_score');
    const composition = num('composition_score');
    const lightingIntent = num('lighting_intent_score');
    const editorialConsistency = num('editorial_consistency_score');
    const overallModel = Number(parsed?.overall_score);
    const overallWeightedCore = (
      identity * 0.21 +
      anatomy * 0.09 +
      garment * 0.25 +
      optics * 0.18 +
      realism * 0.14 +
      attire * 0.10 +
      compliance * 0.03
    );
    const overallPhotographer = (
      composition * 0.40 +
      lightingIntent * 0.40 +
      editorialConsistency * 0.20
    );
    const overallWeighted = (
      overallWeightedCore * 0.82 +
      overallPhotographer * 0.18
    );
    const overallBase = Number.isFinite(overallModel)
      ? ((overallWeighted + overallModel) / 2)
      : overallWeighted;
    const physicsComposite = (garment + optics + realism) / 3;
    const physicsDeficit = Math.max(0, PHYSICS_SCORE_FLOOR - physicsComposite);
    const physicsPenalty = physicsDeficit * PHYSICS_BREAKTHROUGH_PENALTY_GAIN * PHYSICS_BREAKTHROUGH_MULTIPLIER;
    const attireDeficit = Math.max(0, ATTIRE_SCORE_FLOOR - attire);
    const attirePenalty = attireDeficit * ATTIRE_PENALTY_GAIN;
    const overall = Math.max(0, Math.min(10, overallBase - physicsPenalty - attirePenalty));
    return {
      overall,
      metrics: {
        identity_score: identity,
        anatomy_score: anatomy,
        garment_physics_score: garment,
        optics_score: optics,
        realism_score: realism,
        attire_adherence_score: attire,
        compliance_score: compliance,
        composition_score: composition,
        lighting_intent_score: lightingIntent,
        editorial_consistency_score: editorialConsistency,
      },
      raw: texts.join('\n'),
    };
  } catch (err) {
    return {
      overall: 5.0,
      metrics: {},
      raw: `scorer_error: ${err.message}`,
    };
  }
}

async function pathExists(fp) {
  try {
    await fs.access(fp);
    return true;
  } catch {
    return false;
  }
}

function passADirForApproach(approachKey) {
  return DUAL_STRATEGY_MODE ? path.join(PASSA_DIR, `approach-${approachKey}`) : PASSA_DIR;
}

function strategyDirForApproach(approachKey) {
  return DUAL_STRATEGY_MODE ? path.join(OUTPUT_DIR, `strategy-${approachKey}`) : OUTPUT_DIR;
}

function buffersEqual(bufA, bufB) {
  return Buffer.isBuffer(bufA) &&
    Buffer.isBuffer(bufB) &&
    bufA.length === bufB.length &&
    bufA.equals(bufB);
}

function isSourceCloneBuffer(candidateBuffer, sourceBuffer) {
  return buffersEqual(candidateBuffer, sourceBuffer);
}

async function selectNonSourceScaffoldForConcept(concept, sourceBuffer, preferredPaths = []) {
  const candidatePaths = [
    ...(Array.isArray(preferredPaths) ? preferredPaths : []),
    path.join(strategyDirForApproach('B'), `${concept.name}.png`),
    path.join(strategyDirForApproach('A'), `${concept.name}.png`),
    path.join(passADirForApproach('B'), `${concept.name}.png`),
    path.join(passADirForApproach('A'), `${concept.name}.png`),
  ];
  const seen = new Set();
  for (const candidatePathRaw of candidatePaths) {
    const candidatePath = String(candidatePathRaw || '').trim();
    if (!candidatePath || seen.has(candidatePath)) continue;
    seen.add(candidatePath);
    try {
      const candidateBuffer = await fs.readFile(candidatePath);
      if (isSourceCloneBuffer(candidateBuffer, sourceBuffer)) continue;
      const candidateMimeType = mimeTypeFromPath(candidatePath) || 'image/png';
      const policy = await validateBufferAgainst4kPolicy(candidateBuffer, candidateMimeType, `scaffold:${candidatePath}`);
      if (!policy.accepted) {
        console.log(`Scaffold skip: ${policy.reason}`);
        continue;
      }
      return {
        path: candidatePath,
        buffer: candidateBuffer,
        mimeType: candidateMimeType,
      };
    } catch {
      // Ignore missing/unreadable scaffold candidates and continue.
    }
  }
  return null;
}

function conceptNumberFromName(name) {
  const parsed = parseInt(String(name || '').split('-')[0], 10);
  return Number.isNaN(parsed) ? null : parsed;
}

async function loadResumePassAFrontier({
  concept,
  inputImage,
  index,
  approach = 'A',
  variation = null,
  lessons = [],
  profileOrder = [],
  synthesisCharter = '',
}) {
  if (!RESUME_SKIP_COMPLETED_AB) return null;
  const approachKey = normalizeApproach(approach, 'A');
  const fp = path.join(passADirForApproach(approachKey), `${concept.name}.png`);
  if (!(await pathExists(fp))) return null;
  if (inputImage) {
    try {
      const [cachedBuffer, sourceBuffer] = await Promise.all([
        fs.readFile(fp),
        fs.readFile(inputImage),
      ]);
      if (isSourceCloneBuffer(cachedBuffer, sourceBuffer)) {
        console.log(`RESUME CACHE: ignoring source-identical cached passA approach=${approachKey} path=${fp}`);
        return null;
      }
      const cachedMimeType = mimeTypeFromPath(fp) || 'image/png';
      const policy = await validateBufferAgainst4kPolicy(cachedBuffer, cachedMimeType, `resume-passA:${fp}`);
      if (!policy.accepted) {
        console.log(`RESUME CACHE: rejecting cached passA due to 4K policy path=${fp} (${policy.reason})`);
        return null;
      }
      const resumeIdentityGate = await enforceDeterministicIdentityGate({
        referencePath: inputImage,
        candidateBuffer: cachedBuffer,
        candidateMimeType: cachedMimeType,
        approachKey,
        profile: 'cached-resume-passA',
        stage: 'passA',
      });
      if (!resumeIdentityGate.accepted) {
        console.log(`RESUME CACHE: rejecting cached passA due to deterministic identity gate path=${fp}`);
        return null;
      }
    } catch {
      // If cache validation fails, proceed with normal resume behavior.
    }
  }

  const expression = expressions[index % expressions.length];
  const resolvedVariation = variation && typeof variation === 'object' ? variation : buildVariation();
  const profile = normalizeFrontierProfile((profileOrder || [])[0] || 'balanced');
  const prompt = buildPromptPassAFrontier(
    concept,
    expression,
    resolvedVariation,
    profile,
    approachKey,
    normalizeLessons(lessons || [], 10),
    synthesisCharter
  );
  const inputMimeType = mimeTypeFromPath(inputImage);

  console.log(`RESUME CACHE: using cached passA approach=${approachKey} path=${fp}`);
  return {
    fp,
    mimeType: mimeTypeFromPath(fp) || inputMimeType,
    modelParts: [{ text: prompt }],
    variation: resolvedVariation,
    promptUsed: prompt,
    frontierProfile: profile,
    frontierApproach: approachKey,
    frontierPassAScore: { overall: 0, metrics: {} },
    attemptLog: [{
      profile,
      stage: 'passA',
      status: 'reused_cached_resume',
      path: fp,
    }],
    lessonsApplied: normalizeLessons(lessons || [], 10),
    synthesisCharter: String(synthesisCharter || '').trim(),
    reusedCachedPassA: true,
    resumedFromCache: true,
  };
}

async function loadResumeFinalFrontier({
  concept,
  approach = 'A',
  profileHint = 'balanced',
  inputImage = null,
  lessons = [],
}) {
  if (!RESUME_SKIP_COMPLETED_AB) return null;
  const approachKey = normalizeApproach(approach, 'A');
  const fp = path.join(strategyDirForApproach(approachKey), `${concept.name}.png`);
  if (!(await pathExists(fp))) return null;
  if (inputImage) {
    try {
      const [cachedBuffer, sourceBuffer] = await Promise.all([
        fs.readFile(fp),
        fs.readFile(inputImage),
      ]);
      if (isSourceCloneBuffer(cachedBuffer, sourceBuffer)) {
        console.log(`RESUME CACHE: ignoring source-identical cached final approach=${approachKey} path=${fp}`);
        return null;
      }
      const cachedMimeType = mimeTypeFromPath(fp) || 'image/png';
      const policy = await validateBufferAgainst4kPolicy(cachedBuffer, cachedMimeType, `resume-final:${fp}`);
      if (!policy.accepted) {
        console.log(`RESUME CACHE: rejecting cached final due to 4K policy path=${fp} (${policy.reason})`);
        return null;
      }
      const resumeFinalIdentityGate = await enforceDeterministicIdentityGate({
        referencePath: inputImage,
        candidateBuffer: cachedBuffer,
        candidateMimeType: cachedMimeType,
        approachKey,
        profile: 'cached-resume-final',
        stage: 'passB',
      });
      if (!resumeFinalIdentityGate.accepted) {
        console.log(`RESUME CACHE: rejecting cached final due to deterministic identity gate path=${fp}`);
        return null;
      }
    } catch {
      // If cache validation fails, proceed with normal resume behavior.
    }
  }

  const profileUsed = `${normalizeFrontierProfile(profileHint)}+cached-resume`;
  console.log(`RESUME CACHE: using cached final approach=${approachKey} path=${fp}`);
  return {
    path: fp,
    profileUsed,
    approach: approachKey,
    promptUsed: null,
    attemptLog: [{
      profile: normalizeFrontierProfile(profileHint),
      stage: 'passB',
      status: 'reused_cached_resume',
      path: fp,
    }],
    lessonsApplied: normalizeLessons(lessons || [], 10),
    resumedFromCache: true,
  };
}

async function generatePassAFrontier(concept, inputImage, index, approach = 'A', options = {}) {
  const approachKey = normalizeApproach(approach, 'A');
  const imageSize = imageSizeForApproach(approachKey, options?.imageSize);
  const expression = expressions[index % expressions.length];
  const variation = options?.variation && typeof options.variation === 'object'
    ? options.variation
    : buildVariation();
  const lessons = normalizeLessons(options?.lessons || [], 10);
  const synthesisCharter = String(options?.synthesisCharter || '').trim();
  const imageBuffer = await fs.readFile(inputImage);
  const base64Image = imageBuffer.toString('base64');
  const ext = path.extname(inputImage).toLowerCase();
  const mimeType = ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : ext === '.webp' ? 'image/webp' : 'image/png';
  const profiles = prioritizeProfiles(
    Array.isArray(options?.profileOrder) && options.profileOrder.length
      ? options.profileOrder
      : getFrontierProfiles()
  );
  const passADir = DUAL_STRATEGY_MODE ? path.join(PASSA_DIR, `approach-${approachKey}`) : PASSA_DIR;
  const cachedPassAPath = path.join(passADir, `${concept.name}.png`);
  const attemptLog = [];
  const rateLimitPressure = GLOBAL_RATE_LIMIT_STREAK >= RATE_LIMIT_PROFILE_NARROW_STREAK;
  const shouldForceCachedPassA = REUSE_PASSA_ON_FAILURE && GLOBAL_RATE_LIMIT_STREAK >= RATE_LIMIT_FORCE_CACHE_STREAK;
  const activeProfiles = rateLimitPressure && profiles.length > 1 ? [profiles[0]] : profiles;

  console.log(`\n${'='.repeat(60)}`);
  console.log(`[${index + 1}/20] PASS A ${concept.name} (FRONTIER MODE, APPROACH ${approachKey})`);
  console.log(`${'='.repeat(60)}`);
  console.log(`Variation: ${variation.colorway.name} | ${variation.theme.name}`);
  if (options?.variation) {
    console.log(`Variation source: shared-lock (${variationFingerprint(variation)})`);
  }
  console.log(`Profiles: ${profiles.join(', ')}`);
  if (rateLimitPressure && activeProfiles.length < profiles.length) {
    console.log(
      `Rate-limit pressure detected (streak=${GLOBAL_RATE_LIMIT_STREAK}); ` +
      `narrowing Pass A search to profile=${activeProfiles[0]}.`
    );
  }

  let best = null;
  const cIdentitySelectFloor = Math.max(7.5, IDENTITY_GUARDRAIL - 1.0);
  const cComplianceSelectFloor = Math.max(8.0, COMPLIANCE_GUARDRAIL - 0.5);
  const cAttireSelectFloor = Math.max(7.2, PASSA_ATTIRE_SELECT_FLOOR - 0.4);
  const approachIdentitySelectFloor = approachKey === 'C' ? cIdentitySelectFloor : PASSA_IDENTITY_SELECT_FLOOR;
  const approachComplianceSelectFloor = approachKey === 'C' ? cComplianceSelectFloor : PASSA_COMPLIANCE_SELECT_FLOOR;
  const approachAttireSelectFloor = approachKey === 'C' ? cAttireSelectFloor : PASSA_ATTIRE_SELECT_FLOOR;

  if (shouldForceCachedPassA) {
    try {
      await fs.access(cachedPassAPath);
      const cachedPassABuffer = await fs.readFile(cachedPassAPath);
      if (isSourceCloneBuffer(cachedPassABuffer, imageBuffer)) {
        console.log(
          `Rate-limit force-cache skipped for approach=${approachKey}: ` +
          `cached passA artifact is source-identical (${cachedPassAPath}).`
        );
        attemptLog.push({
          profile: 'cached-passA',
          stage: 'passA',
          status: 'source_clone_cached_skip',
          path: cachedPassAPath,
        });
      } else {
        const cachedMimeType = mimeTypeFromPath(cachedPassAPath) || 'image/png';
        const policy = await validateBufferAgainst4kPolicy(
          cachedPassABuffer,
          cachedMimeType,
          `forced-cache-passA:${cachedPassAPath}`
        );
        if (!policy.accepted) {
          console.log(
            `Rate-limit force-cache skipped for approach=${approachKey}: ` +
            `cached passA artifact failed 4K policy (${policy.reason}).`
          );
          attemptLog.push({
            profile: 'cached-passA',
            stage: 'passA',
            status: 'cached_4k_policy_rejected',
            path: cachedPassAPath,
          });
          throw new Error(`cached_passA_4k_policy_rejected:${policy.reason}`);
        }
        const forcedCacheIdentityGate = await enforceDeterministicIdentityGate({
          referencePath: inputImage,
          candidateBuffer: cachedPassABuffer,
          candidateMimeType: cachedMimeType,
          approachKey,
          profile: 'cached-passA-forced',
          stage: 'passA',
          attemptLog,
        });
        if (!forcedCacheIdentityGate.accepted) {
          console.log(
            `Rate-limit force-cache skipped for approach=${approachKey}: ` +
            `cached passA artifact failed deterministic identity gate (${cachedPassAPath}).`
          );
        } else {
          const cachedProfile = normalizeFrontierProfile(activeProfiles[0] || profiles[0] || 'balanced');
          const cachedPrompt = buildPromptPassAFrontier(
            concept,
            expression,
            variation,
            cachedProfile,
            approachKey,
            lessons,
            synthesisCharter
          );
          console.log(
            `Rate-limit force-cache active (streak=${GLOBAL_RATE_LIMIT_STREAK}); ` +
            `reusing cached passA artifact ${cachedPassAPath}.`
          );
          attemptLog.push({
            profile: cachedProfile,
            stage: 'passA',
            status: 'reused_cached_forced',
            path: cachedPassAPath,
          });
          return {
            fp: cachedPassAPath,
            mimeType: mimeTypeFromPath(cachedPassAPath),
            modelParts: [{ text: cachedPrompt }],
            variation,
            promptUsed: cachedPrompt,
            frontierProfile: cachedProfile,
            frontierApproach: approachKey,
            frontierPassAScore: { overall: 0, metrics: {} },
            attemptLog,
            lessonsApplied: lessons,
            synthesisCharter,
            reusedCachedPassA: true,
          };
        }
      }
    } catch {
      // continue with normal generation path when no cached artifact exists
    }
  }

  for (const profile of activeProfiles) {
    const prompt = appendInitialAttemptBoost(
      buildPromptPassAFrontier(concept, expression, variation, profile, approachKey, lessons, synthesisCharter)
    );
    const wc = wordCount(prompt);
    console.log(`Frontier A approach=${approachKey} profile=${profile} | words=${wc}`);
    validatePrompt(prompt, `Pass A Frontier (${approachKey}/${profile})`);
    const contents = [{ role: 'user', parts: buildImageEditParts(prompt, mimeType, base64Image) }];
    let data;
    try {
      data = await callModel(contents, 0, true, null, ENDPOINT, Date.now(), imageSize, {
        concept: concept.name,
        stage: 'passA-frontier-primary',
        profile,
        approach: approachKey,
      });
    } catch (err) {
      console.log(`Frontier A approach=${approachKey} profile=${profile} request error: ${err.message}`);
      attemptLog.push({
        profile,
        stage: 'passA',
        status: 'request_error',
        error: err.message,
      });
      continue;
    }
    logModelDiagnostics(data, `Pass A Frontier (${approachKey}/${profile})`);
    const responseSignal = extractBlockSignal(data);

    const parts = data.candidates?.[0]?.content?.parts || [];
    let imageData = null;
    const modelParts = [];
    for (const part of parts) {
      if (part.text && !part.thought) {
        console.log(`Model A(${profile}): ${part.text.substring(0, 100)}...`);
      }
      if (part.inlineData?.data) {
        imageData = part.inlineData;
      }
      modelParts.push(partWithThoughtSignature(part));
    }

    if (!imageData?.data) {
      console.log(`Frontier A approach=${approachKey} profile=${profile} produced no image (finish=${responseSignal.finish || 'n/a'}, block=${responseSignal.block || 'n/a'}).`);
      attemptLog.push({
        profile,
        stage: 'passA',
        status: 'no_image',
        finish: responseSignal.finish || null,
        block: responseSignal.block || null,
        safety: responseSignal.safety || null,
      });
      continue;
    }
    const candidateBuffer = Buffer.from(imageData.data, 'base64');
    if (isSourceCloneBuffer(candidateBuffer, imageBuffer)) {
      console.log(`Frontier A approach=${approachKey} profile=${profile} returned source-identical image; rejecting no-op candidate.`);
      attemptLog.push({
        profile,
        stage: 'passA',
        status: 'source_clone_rejected',
      });
      continue;
    }

    const candidateMimeType = imageData.mimeType || 'image/png';
    const identityGate = await enforceDeterministicIdentityGate({
      referencePath: inputImage,
      candidateBuffer,
      candidateMimeType,
      approachKey,
      profile,
      stage: 'passA',
      attemptLog,
    });
    if (!identityGate.accepted) {
      continue;
    }
    const score = await scoreFrontierCandidate({
      referenceMimeType: mimeType,
      referenceB64: base64Image,
      candidateMimeType,
      candidateB64: imageData.data,
      concept,
      expression,
      profile: `${approachKey}/${profile}`,
    });
    const identityMetric = Number(score?.metrics?.identity_score ?? 5);
    const complianceMetric = Number(score?.metrics?.compliance_score ?? 5);
    const attireMetric = Number(score?.metrics?.attire_adherence_score ?? 5);
    const effectiveComplianceFloor = responseSignal.policyBlocked
      ? approachComplianceSelectFloor
      : Math.min(approachComplianceSelectFloor, MODEL_POLICY_CLEAR_COMPLIANCE_FLOOR);
    const identityPenalty = Math.max(0, approachIdentitySelectFloor - identityMetric);
    const compliancePenalty = Math.max(0, effectiveComplianceFloor - complianceMetric);
    const attirePenalty = Math.max(0, approachAttireSelectFloor - attireMetric);
    const rankingObjective = Number(score?.overall || 0) - (identityPenalty * 1.35) - (compliancePenalty * 0.6) - (attirePenalty * 0.95);
    const meetsSelectionGate = identityMetric >= approachIdentitySelectFloor
      && complianceMetric >= effectiveComplianceFloor
      && attireMetric >= approachAttireSelectFloor;
    console.log(
      `Frontier score approach=${approachKey} profile=${profile}: ` +
      `overall=${score.overall.toFixed(2)} id=${identityMetric.toFixed(2)} ` +
      `phys=${(score.metrics.garment_physics_score ?? 5).toFixed(2)} ` +
      `real=${(score.metrics.realism_score ?? 5).toFixed(2)} ` +
      `attire=${attireMetric.toFixed(2)} attire_floor=${approachAttireSelectFloor.toFixed(2)} ` +
      `comp=${complianceMetric.toFixed(2)} comp_floor=${effectiveComplianceFloor.toFixed(2)} ` +
      `objective=${rankingObjective.toFixed(2)}`
    );
    attemptLog.push({
      profile,
      stage: 'passA',
      status: 'scored',
      score_overall: score.overall,
      score_metrics: score.metrics,
      compliance_floor: effectiveComplianceFloor,
      ranking_objective: rankingObjective,
    });

    if (!meetsSelectionGate) {
      console.log(
        `Frontier candidate rejected approach=${approachKey} profile=${profile}: ` +
        `identity/attire/compliance below gate ` +
        `(id=${identityMetric.toFixed(2)} floor=${approachIdentitySelectFloor.toFixed(2)}, ` +
        `attire=${attireMetric.toFixed(2)} floor=${approachAttireSelectFloor.toFixed(2)}, ` +
        `comp=${complianceMetric.toFixed(2)} floor=${effectiveComplianceFloor.toFixed(2)}).`
      );
      attemptLog.push({
        profile,
        stage: 'passA',
        status: 'guardrail_rejected',
        score_overall: score.overall,
        score_metrics: score.metrics,
      });
      continue;
    }

    if (!best || rankingObjective > best.rankingObjective) {
      best = { profile, prompt, imageData, modelParts, score, rankingObjective };
    }
    if (score.overall >= FRONTIER_ACCEPT_SCORE) {
      console.log(`Frontier early-accept approach=${approachKey} profile=${profile} at score=${score.overall.toFixed(2)}.`);
      break;
    }
  }

  if (!best) {
    const hasSafetyBlockedAttempt = attemptLog.some(item => (
      item?.stage === 'passA'
      && item?.status === 'no_image'
      && isSafetyFailureError(`${item?.finish || ''} ${item?.block || ''} ${item?.safety || ''}`)
    ));
    if (PHASED_DEFER_SAFETY_FAILURES && hasSafetyBlockedAttempt) {
      console.log(`SAFETY-DEFER PASS A ${concept.name}: skipping recovery fallbacks; moving to next concept.`);
      throw new Error(`safety_defer_passA:${concept.name}`);
    }

    if (REUSE_PASSA_ON_FAILURE) {
      try {
        await fs.access(cachedPassAPath);
        const cachedPassABuffer = await fs.readFile(cachedPassAPath);
          if (isSourceCloneBuffer(cachedPassABuffer, imageBuffer)) {
            console.log(
              `Frontier A approach=${approachKey}: refusing source-identical cached passA artifact ${cachedPassAPath}.`
            );
          attemptLog.push({
            profile: 'cached-passA',
            stage: 'passA',
            status: 'source_clone_cached_skip',
              path: cachedPassAPath,
            });
          } else {
          const cachedMimeType = mimeTypeFromPath(cachedPassAPath) || 'image/png';
          const policy = await validateBufferAgainst4kPolicy(
            cachedPassABuffer,
            cachedMimeType,
            `cached-passA:${cachedPassAPath}`
          );
          if (!policy.accepted) {
            console.log(
              `Frontier A approach=${approachKey}: cached passA artifact failed 4K policy ` +
              `${cachedPassAPath} (${policy.reason}).`
            );
            attemptLog.push({
              profile: 'cached-passA',
              stage: 'passA',
              status: 'cached_4k_policy_rejected',
              path: cachedPassAPath,
            });
            throw new Error(`cached_passA_4k_policy_rejected:${policy.reason}`);
          }
          const cachedIdentityGate = await enforceDeterministicIdentityGate({
            referencePath: inputImage,
            candidateBuffer: cachedPassABuffer,
            candidateMimeType: cachedMimeType,
            approachKey,
            profile: 'cached-passA',
            stage: 'passA',
            attemptLog,
          });
          if (!cachedIdentityGate.accepted) {
            console.log(
              `Frontier A approach=${approachKey}: cached passA artifact failed deterministic identity gate ` +
              `${cachedPassAPath}.`
            );
          } else {
          const cachedProfile = normalizeFrontierProfile(profiles[0] || 'balanced');
          const cachedPrompt = buildPromptPassAFrontier(
            concept,
            expression,
            variation,
            cachedProfile,
            approachKey,
            lessons,
            synthesisCharter
          );
          console.log(
            `Frontier A approach=${approachKey}: reusing cached passA artifact ` +
            `${cachedPassAPath} to continue deeper iterations.`
          );
          attemptLog.push({
            profile: cachedProfile,
            stage: 'passA',
            status: 'reused_cached',
            path: cachedPassAPath,
          });
          return {
            fp: cachedPassAPath,
            mimeType: mimeTypeFromPath(cachedPassAPath),
            modelParts: [{ text: cachedPrompt }],
            variation,
            promptUsed: cachedPrompt,
            frontierProfile: cachedProfile,
            frontierApproach: approachKey,
            frontierPassAScore: { overall: 0, metrics: {} },
            attemptLog,
            lessonsApplied: lessons,
            synthesisCharter,
            reusedCachedPassA: true,
          };
          }
        }
      } catch {
        // no cached passA artifact available for this concept/approach
      }
    }

    console.log('Frontier mode did not yield an image; attempting compliance emergency prompt.');
    const fallbackPrompt = buildPromptPassASafeEmergency(concept, expression, variation);
    let emergencyImageData = null;
    let emergencyModelParts = [{ text: fallbackPrompt }];

    try {
      const contents = [{ role: 'user', parts: buildImageEditParts(fallbackPrompt, mimeType, base64Image) }];
      const data = await callModel(contents, 0, true, null, ENDPOINT, Date.now(), imageSize, {
        concept: concept.name,
        stage: 'passA-frontier-emergency',
        profile: 'emergency',
        approach: approachKey,
      });
      logModelDiagnostics(data, 'Pass A Frontier (emergency)');
      const parts = data.candidates?.[0]?.content?.parts || [];
      emergencyModelParts = [];
      for (const part of parts) {
        if (part.inlineData?.data) emergencyImageData = part.inlineData;
        emergencyModelParts.push(partWithThoughtSignature(part));
      }
      if (emergencyImageData?.data) {
        const emergencyBuffer = Buffer.from(emergencyImageData.data, 'base64');
        if (isSourceCloneBuffer(emergencyBuffer, imageBuffer)) {
          console.log('Pass A emergency output was source-identical; rejecting no-op candidate.');
          attemptLog.push({
            profile: 'emergency',
            stage: 'passA',
            status: 'source_clone_rejected',
          });
        } else {
          const emergencyMimeType = emergencyImageData.mimeType || 'image/png';
          const emergencyIdentityGate = await enforceDeterministicIdentityGate({
            referencePath: inputImage,
            candidateBuffer: emergencyBuffer,
            candidateMimeType: emergencyMimeType,
            approachKey,
            profile: 'emergency',
            stage: 'passA',
            attemptLog,
          });
          if (emergencyIdentityGate.accepted) {
            const emergencyScore = await scoreFrontierCandidate({
              referenceMimeType: mimeType,
              referenceB64: base64Image,
              candidateMimeType: emergencyMimeType,
              candidateB64: emergencyImageData.data,
              concept,
              expression,
              profile: `${approachKey}/emergency`,
            });
            const emergencyIdentity = Number(emergencyScore?.metrics?.identity_score ?? 5);
            const emergencyCompliance = Number(emergencyScore?.metrics?.compliance_score ?? 5);
            const emergencyAttire = Number(emergencyScore?.metrics?.attire_adherence_score ?? 5);
            const emergencyMeetsGate = emergencyIdentity >= approachIdentitySelectFloor
              && emergencyCompliance >= approachComplianceSelectFloor
              && emergencyAttire >= approachAttireSelectFloor;
            console.log(
              `Frontier emergency score approach=${approachKey}: ` +
              `overall=${emergencyScore.overall.toFixed(2)} id=${emergencyIdentity.toFixed(2)} ` +
              `attire=${emergencyAttire.toFixed(2)} comp=${emergencyCompliance.toFixed(2)}`
            );
            if (!emergencyMeetsGate) {
              console.log(
                `Frontier emergency rejected approach=${approachKey}: ` +
                `identity/attire/compliance below gate ` +
                `(id=${emergencyIdentity.toFixed(2)} floor=${approachIdentitySelectFloor.toFixed(2)}, ` +
                `attire=${emergencyAttire.toFixed(2)} floor=${approachAttireSelectFloor.toFixed(2)}, ` +
                `comp=${emergencyCompliance.toFixed(2)} floor=${approachComplianceSelectFloor.toFixed(2)}).`
              );
              attemptLog.push({
                profile: 'emergency',
                stage: 'passA',
                status: 'guardrail_rejected',
                score_overall: emergencyScore.overall,
                score_metrics: emergencyScore.metrics,
              });
            } else {
              attemptLog.push({
                profile: 'emergency',
                stage: 'passA',
                status: 'generated',
                score_overall: emergencyScore.overall,
                score_metrics: emergencyScore.metrics,
              });
              best = {
                profile: 'emergency',
                prompt: fallbackPrompt,
                imageData: emergencyImageData,
                modelParts: emergencyModelParts,
                score: emergencyScore,
                rankingObjective: emergencyScore.overall,
              };
            }
          }
        }
      } else {
        attemptLog.push({
          profile: 'emergency',
          stage: 'passA',
          status: 'no_image',
        });
      }
    } catch (err) {
      console.log(`Emergency pass-A request failed: ${err.message}`);
      attemptLog.push({
        profile: 'emergency',
        stage: 'passA',
        status: 'request_error',
        error: err.message,
      });
    }

    if (!best) {
      const scaffold = await selectNonSourceScaffoldForConcept(concept, imageBuffer);
      if (scaffold) {
        const scaffoldIdentityGate = await enforceDeterministicIdentityGate({
          referencePath: inputImage,
          candidateBuffer: scaffold.buffer,
          candidateMimeType: scaffold.mimeType || 'image/png',
          approachKey,
          profile: 'ab-scaffold',
          stage: 'passA',
          attemptLog,
        });
        if (!scaffoldIdentityGate.accepted) {
          console.log(
            `Frontier A approach=${approachKey}: non-source scaffold failed deterministic identity gate path=${scaffold.path}`
          );
        } else {
          const scaffoldB64 = scaffold.buffer.toString('base64');
          const scaffoldScore = await scoreFrontierCandidate({
            referenceMimeType: mimeType,
            referenceB64: base64Image,
            candidateMimeType: scaffold.mimeType || 'image/png',
            candidateB64: scaffoldB64,
            concept,
            expression,
            profile: `${approachKey}/ab-scaffold`,
          });
          const scaffoldIdentity = Number(scaffoldScore?.metrics?.identity_score ?? 5);
          const scaffoldCompliance = Number(scaffoldScore?.metrics?.compliance_score ?? 5);
          const scaffoldAttire = Number(scaffoldScore?.metrics?.attire_adherence_score ?? 5);
          const scaffoldMeetsGate = scaffoldIdentity >= approachIdentitySelectFloor
            && scaffoldCompliance >= approachComplianceSelectFloor
            && scaffoldAttire >= approachAttireSelectFloor;
          if (!scaffoldMeetsGate) {
            console.log(
              `Frontier A approach=${approachKey}: non-source scaffold rejected ` +
              `(id=${scaffoldIdentity.toFixed(2)} floor=${approachIdentitySelectFloor.toFixed(2)}, ` +
              `attire=${scaffoldAttire.toFixed(2)} floor=${approachAttireSelectFloor.toFixed(2)}, ` +
              `comp=${scaffoldCompliance.toFixed(2)} floor=${approachComplianceSelectFloor.toFixed(2)}) path=${scaffold.path}`
            );
            attemptLog.push({
              profile: 'ab-scaffold',
              stage: 'passA',
              status: 'guardrail_rejected',
              path: scaffold.path,
              score_overall: scaffoldScore.overall,
              score_metrics: scaffoldScore.metrics,
            });
          } else {
            console.log(
              `Frontier A approach=${approachKey}: emergency fallback used non-source scaffold ` +
              `${scaffold.path} to preserve iteration flow.`
            );
            attemptLog.push({
              profile: 'ab-scaffold',
              stage: 'passA',
              status: 'ab_scaffold_fallback',
              path: scaffold.path,
              score_overall: scaffoldScore.overall,
              score_metrics: scaffoldScore.metrics,
            });
            best = {
              profile: 'ab-scaffold',
              prompt: fallbackPrompt,
              imageData: { mimeType: scaffold.mimeType, data: scaffoldB64 },
              modelParts: emergencyModelParts,
              score: scaffoldScore,
              rankingObjective: scaffoldScore.overall,
            };
          }
        }
      }
    }

    if (!best) {
      console.log(
        `Frontier A approach=${approachKey}: no non-source scaffold available; ` +
        'attempting text-only rescue generation.'
      );
      const rescuePrompt = [
        fallbackPrompt,
        '',
        'SOURCE-CLONE BAN:',
        '- Generate a brand-new image from text only.',
        '- Do not return or preserve the original input image bytes.',
      ].join('\n');
      let rescueImageData = null;
      let rescueModelParts = [{ text: rescuePrompt }];
      try {
        const rescueContents = [{ role: 'user', parts: [{ text: rescuePrompt }] }];
        const rescueData = await callModel(rescueContents, 0, true, null, ENDPOINT, Date.now(), imageSize, {
          concept: concept.name,
          stage: 'passA-frontier-text-rescue',
          profile: 'text-only-rescue',
          approach: approachKey,
        });
        logModelDiagnostics(rescueData, 'Pass A Frontier (text-only rescue)');
        const rescueParts = rescueData.candidates?.[0]?.content?.parts || [];
        rescueModelParts = [];
        for (const part of rescueParts) {
          if (part.inlineData?.data && !rescueImageData) rescueImageData = part.inlineData;
          rescueModelParts.push(partWithThoughtSignature(part));
        }
        if (rescueImageData?.data) {
          const rescueBuffer = Buffer.from(rescueImageData.data, 'base64');
          if (isSourceCloneBuffer(rescueBuffer, imageBuffer)) {
            console.log('Pass A text-only rescue output was source-identical; rejecting no-op candidate.');
            attemptLog.push({
              profile: 'text-only-rescue',
              stage: 'passA',
              status: 'source_clone_rejected',
            });
          } else {
            const rescueMimeType = rescueImageData.mimeType || 'image/png';
            const rescueIdentityGate = await enforceDeterministicIdentityGate({
              referencePath: inputImage,
              candidateBuffer: rescueBuffer,
              candidateMimeType: rescueMimeType,
              approachKey,
              profile: 'text-only-rescue',
              stage: 'passA',
              attemptLog,
            });
            if (rescueIdentityGate.accepted) {
              const rescueScore = await scoreFrontierCandidate({
                referenceMimeType: mimeType,
                referenceB64: base64Image,
                candidateMimeType: rescueMimeType,
                candidateB64: rescueImageData.data,
                concept,
                expression,
                profile: `${approachKey}/text-only-rescue`,
              });
              const rescueIdentity = Number(rescueScore?.metrics?.identity_score ?? 5);
              const rescueCompliance = Number(rescueScore?.metrics?.compliance_score ?? 5);
              const rescueAttire = Number(rescueScore?.metrics?.attire_adherence_score ?? 5);
              const rescueMeetsGate = rescueIdentity >= approachIdentitySelectFloor
                && rescueCompliance >= approachComplianceSelectFloor
                && rescueAttire >= approachAttireSelectFloor;
              if (!rescueMeetsGate) {
                console.log(
                  `Pass A text-only rescue rejected approach=${approachKey}: ` +
                  `identity/attire/compliance below gate ` +
                  `(id=${rescueIdentity.toFixed(2)} floor=${approachIdentitySelectFloor.toFixed(2)}, ` +
                  `attire=${rescueAttire.toFixed(2)} floor=${approachAttireSelectFloor.toFixed(2)}, ` +
                  `comp=${rescueCompliance.toFixed(2)} floor=${approachComplianceSelectFloor.toFixed(2)}).`
                );
                attemptLog.push({
                  profile: 'text-only-rescue',
                  stage: 'passA',
                  status: 'guardrail_rejected',
                  score_overall: rescueScore.overall,
                  score_metrics: rescueScore.metrics,
                });
              } else {
                attemptLog.push({
                  profile: 'text-only-rescue',
                  stage: 'passA',
                  status: 'generated',
                  score_overall: rescueScore.overall,
                  score_metrics: rescueScore.metrics,
                });
                best = {
                  profile: 'text-only-rescue',
                  prompt: rescuePrompt,
                  imageData: rescueImageData,
                  modelParts: rescueModelParts,
                  score: rescueScore,
                  rankingObjective: rescueScore.overall,
                };
              }
            }
          }
        } else {
          const rescueSignal = extractBlockSignal(rescueData);
          attemptLog.push({
            profile: 'text-only-rescue',
            stage: 'passA',
            status: 'no_image',
            finish: rescueSignal.finish || null,
            block: rescueSignal.block || null,
            safety: rescueSignal.safety || null,
          });
        }
      } catch (err) {
        console.log(`Text-only pass-A rescue request failed: ${err.message}`);
        attemptLog.push({
          profile: 'text-only-rescue',
          stage: 'passA',
          status: 'request_error',
          error: err.message,
        });
      }
    }

    if (!best) {
      throw new Error(`Frontier A approach=${approachKey}: no valid non-source candidate after emergency fallbacks.`);
    }
  }

  const img = Buffer.from(best.imageData.data, 'base64');
  if (isSourceCloneBuffer(img, imageBuffer)) {
    throw new Error(`Frontier A approach=${approachKey}: selected image is source-identical after safeguards.`);
  }
  const finalIdentityGate = await enforceDeterministicIdentityGate({
    referencePath: inputImage,
    candidateBuffer: img,
    candidateMimeType: best.imageData.mimeType || 'image/png',
    approachKey,
    profile: String(best.profile || 'selected'),
    stage: 'passA-final',
    attemptLog,
  });
  if (!finalIdentityGate.accepted) {
    throw new Error(`Frontier A approach=${approachKey}: selected image failed deterministic identity gate.`);
  }
  await fs.mkdir(passADir, { recursive: true });
  const fp = cachedPassAPath;
  await fs.writeFile(fp, img);
  await saveSimpleStageArtifact('Pass A', concept.name, img, best.imageData.mimeType || 'image/png');
  console.log(`SAVED PASS A (FRONTIER): ${fp} (${(img.length / 1024 / 1024).toFixed(2)} MB) | approach=${approachKey} profile=${best.profile} score=${best.score.overall.toFixed(2)}`);
  attemptLog.push({
    profile: best.profile,
    stage: 'passA',
    status: 'selected',
    score_overall: best.score.overall,
  });
  return {
    fp,
    mimeType: best.imageData.mimeType || 'image/png',
    modelParts: best.modelParts,
    variation,
    promptUsed: best.prompt,
    frontierProfile: best.profile,
    frontierApproach: approachKey,
    frontierPassAScore: best.score,
    attemptLog,
    lessonsApplied: lessons,
    synthesisCharter,
  };
}

async function generatePassBFrontier(concept, passA, inputImage, index, approach = 'A', options = {}) {
  const approachKey = normalizeApproach(approach || passA?.frontierApproach || 'A', 'A');
  const imageSize = imageSizeForApproach(approachKey, options?.imageSize);
  const expression = expressions[index % expressions.length];
  const variation = passA.variation || buildVariation();
  const synthesisCharter = String(options?.synthesisCharter || passA?.synthesisCharter || '').trim();
  const primaryProfile = normalizeFrontierProfile(passA.frontierProfile || 'balanced');
  const profileQueue = SIMPLE_PROFILE_MODE
    ? [primaryProfile]
    : [...new Set([primaryProfile, 'balanced', 'clean'])];
  const rateLimitPressure = GLOBAL_RATE_LIMIT_STREAK >= RATE_LIMIT_PROFILE_NARROW_STREAK;
  const shouldForceCachedFinal = REUSE_PASSA_ON_FAILURE && GLOBAL_RATE_LIMIT_STREAK >= RATE_LIMIT_FORCE_CACHE_STREAK;
  const activeProfileQueue = rateLimitPressure && profileQueue.length > 1 ? [profileQueue[0]] : profileQueue;
  const baseLessons = normalizeLessons(options?.lessons || passA?.lessonsApplied || [], 10);
  const attemptLog = [];

  console.log(`\n${'='.repeat(60)}`);
  console.log(`[${index + 1}/20] PASS B ${concept.name} (FRONTIER MODE, APPROACH ${approachKey})`);
  console.log(`${'='.repeat(60)}`);
  console.log(`Profiles: ${profileQueue.join(', ')}`);
  if (rateLimitPressure && activeProfileQueue.length < profileQueue.length) {
    console.log(
      `Rate-limit pressure detected (streak=${GLOBAL_RATE_LIMIT_STREAK}); ` +
      `narrowing Pass B search to profile=${activeProfileQueue[0]}.`
    );
  }

  const baseImageBuffer = await fs.readFile(inputImage);
  const base64Image = baseImageBuffer.toString('base64');
  const baseExt = path.extname(inputImage).toLowerCase();
  const baseMimeType = baseExt === '.jpg' || baseExt === '.jpeg' ? 'image/jpeg' : baseExt === '.webp' ? 'image/webp' : 'image/png';
  const passAAudit = await ensurePassAAudit({
    concept,
    expression,
    passA,
    referenceMimeType: baseMimeType,
    referenceB64: base64Image,
    profileTag: `${approachKey}/passA-audit`,
  });
  if (PASS_B_REQUIRE_PASSA_AUDIT && !passAAudit?.audited) {
    throw new Error(`Frontier B approach=${approachKey}: missing required Pass A audit.`);
  }
  const passAAuditBlock = buildPassAAuditPromptBlock(passAAudit);
  const lessons = normalizeLessons([...(passAAudit?.lessons || []), ...baseLessons], 12);
  const passABaselineScore = passAAudit?.score || passA?.frontierPassAScore || null;
  const passAImageBuffer = await fs.readFile(passA.fp);
  const passAB64 = passAImageBuffer.toString('base64');
  const passAPromptForContext = passA.promptUsed || buildPromptPassAFrontier(
    concept,
    expression,
    variation,
    primaryProfile,
    approachKey,
    [],
    synthesisCharter
  );
  const strategyDir = DUAL_STRATEGY_MODE ? path.join(OUTPUT_DIR, `strategy-${approachKey}`) : OUTPUT_DIR;
  await fs.mkdir(strategyDir, { recursive: true });
  const strategyPath = path.join(strategyDir, `${concept.name}.png`);
  const enableAggressiveBoundary = options?.enableAggressiveBoundary === true
    && ENABLE_AB_PHASE2_BOUNDARY;

  if (shouldForceCachedFinal) {
    try {
      await fs.access(strategyPath);
      const cachedFinalBuffer = await fs.readFile(strategyPath);
      if (isSourceCloneBuffer(cachedFinalBuffer, baseImageBuffer)) {
        console.log(
          `Rate-limit force-cache skipped for approach=${approachKey}: ` +
          `cached final artifact is source-identical (${strategyPath}).`
        );
        attemptLog.push({
          profile: primaryProfile,
          stage: 'passB',
          status: 'source_clone_cached_skip',
          path: strategyPath,
        });
      } else {
        const cachedMimeType = mimeTypeFromPath(strategyPath) || 'image/png';
        const policy = await validateBufferAgainst4kPolicy(
          cachedFinalBuffer,
          cachedMimeType,
          `forced-cache-final:${strategyPath}`
        );
        if (!policy.accepted) {
          console.log(
            `Rate-limit force-cache skipped for approach=${approachKey}: ` +
            `cached final artifact failed 4K policy (${policy.reason}).`
          );
          attemptLog.push({
            profile: primaryProfile,
            stage: 'passB',
            status: 'cached_4k_policy_rejected',
            path: strategyPath,
          });
          throw new Error(`cached_final_4k_policy_rejected:${policy.reason}`);
        }
        const cachedFinalIdentityGate = await enforceDeterministicIdentityGate({
          referencePath: inputImage,
          candidateBuffer: cachedFinalBuffer,
          candidateMimeType: cachedMimeType,
          approachKey,
          profile: `${primaryProfile}+cached-forced`,
          stage: 'passB-cached-final',
          attemptLog,
        });
        if (!cachedFinalIdentityGate.accepted) {
          console.log(
            `Rate-limit force-cache skipped for approach=${approachKey}: ` +
            `cached final artifact failed deterministic identity gate (${strategyPath}).`
          );
          throw new Error('cached_final_identity_rejected');
        }
        console.log(
          `Rate-limit force-cache active (streak=${GLOBAL_RATE_LIMIT_STREAK}); ` +
          `reusing cached final artifact ${strategyPath}.`
        );
        attemptLog.push({
          profile: primaryProfile,
          stage: 'passB',
          status: 'reused_cached_forced',
          path: strategyPath,
        });
        return {
          path: strategyPath,
          profileUsed: `${primaryProfile}+cached`,
          approach: approachKey,
          promptUsed: null,
          attemptLog,
          lessonsApplied: lessons,
          synthesisCharter,
        };
      }
    } catch {
      // no cached final image available; continue with normal generation
    }
  }

  for (const profile of activeProfileQueue) {
    const prompt = appendInitialAttemptBoost(
      buildPromptPassBFrontier(
        concept,
        expression,
        variation,
        profile,
        approachKey,
        lessons,
        synthesisCharter,
        passAAuditBlock
      )
    );
    validatePrompt(prompt, `Pass B Frontier (${approachKey}/${profile})`);
    const contents = buildPassBConversation({
      passAPromptForContext,
      baseMimeType,
      base64Image,
      passAModelParts: passA.modelParts,
      prompt,
      passAMimeType: passA.mimeType,
      passAB64,
    });
    let data;
    try {
      data = await callModel(contents, 0, true, null, ENDPOINT, Date.now(), imageSize, {
        concept: concept.name,
        stage: 'passB-frontier-primary',
        profile,
        approach: approachKey,
      });
    } catch (err) {
      console.log(`Frontier B approach=${approachKey} profile=${profile} request error: ${err.message}`);
      attemptLog.push({
        profile,
        stage: 'passB',
        status: 'request_error',
        error: err.message,
      });
      continue;
    }
    logModelDiagnostics(data, `Pass B Frontier (${approachKey}/${profile})`);
    const parts = data.candidates?.[0]?.content?.parts || [];
    for (const part of parts) {
      if (part.text && !part.thought) {
        console.log(`Model B(${approachKey}/${profile}): ${part.text.substring(0, 100)}...`);
      }
      if (part.inlineData?.data) {
        const img = Buffer.from(part.inlineData.data, 'base64');
        if (isSourceCloneBuffer(img, baseImageBuffer)) {
          console.log(`Frontier B approach=${approachKey} profile=${profile} returned source-identical image; rejecting no-op candidate.`);
          attemptLog.push({
            profile,
            stage: 'passB',
            status: 'source_clone_rejected',
          });
          continue;
        }
        const candidateMimeType = part.inlineData.mimeType || 'image/png';
        const phase1IdentityGate = await enforceDeterministicIdentityGate({
          referencePath: inputImage,
          candidateBuffer: img,
          candidateMimeType,
          approachKey,
          profile,
          stage: 'passB-phase1',
          attemptLog,
        });
        if (!phase1IdentityGate.accepted) {
          continue;
        }
        const fp = strategyPath;
        await fs.writeFile(fp, img);
        await saveSimpleStageArtifact('Pass B', concept.name, img, candidateMimeType);
        console.log(`SAVED FINAL (FRONTIER): ${fp} (${(img.length / 1024 / 1024).toFixed(2)} MB) | approach=${approachKey} profile=${profile}`);
        attemptLog.push({
          profile,
          stage: 'passB',
          status: 'generated_phase1',
        });

        let effectiveProfileUsed = profile;
        let effectivePromptUsed = prompt;
        let effectiveScore = null;
        let gainEval = null;

        if (PASS_B_USE_SCORER_RERANK || passABaselineScore) {
          effectiveScore = await scoreFrontierCandidate({
            referenceMimeType: baseMimeType,
            referenceB64: base64Image,
            candidateMimeType,
            candidateB64: part.inlineData.data,
            concept,
            expression,
            profile: `${approachKey}/${profile}-passB-phase1`,
          });
          attemptLog.push({
            profile,
            stage: 'passB',
            status: 'scored_phase1',
            score_overall: effectiveScore.overall,
            score_metrics: effectiveScore.metrics,
          });
          if (passABaselineScore) {
            gainEval = evaluatePassBGainTarget(effectiveScore, passABaselineScore);
            console.log(formatPassBGainLog(`Pass B frontier gain check (${approachKey}/${profile}):`, gainEval));
          }
        }

        if (passABaselineScore && gainEval && !gainEval.pass && PASS_B_PASSA_GAIN_MAX_RETRIES > 0) {
          console.log(
            `Pass B frontier adaptive retries (${approachKey}/${profile}): shortfall ${gainEval.shortfallPct.toFixed(1)}% ` +
            `target=${gainEval.targetPct.toFixed(1)}% rounds=${PASS_B_PASSA_GAIN_MAX_RETRIES}.`
          );
          for (let retryRound = 1; retryRound <= PASS_B_PASSA_GAIN_MAX_RETRIES; retryRound++) {
            if (gainEval.pass) break;
            const backupPath = `${fp}.gain-retry-${retryRound}.bak`;
            await fs.copyFile(fp, backupPath);
            const retryLessons = normalizeLessons([
              ...lessons,
              ...buildPassAAuditLessons(passABaselineScore, PASS_B_PASSA_AUDIT_HINTS),
              buildPassBGainDirective(gainEval, retryRound),
            ], LESSON_MAX_PER_PROMPT + 6);
            const phase2 = await runPhase2BoundaryRefinement({
              concept,
              index,
              variation,
              approachKey,
              profile: effectiveProfileUsed,
              baselinePath: fp,
              lessons: retryLessons,
              passAAuditBlock,
              referencePath: inputImage,
              referenceMimeType: baseMimeType,
              referenceB64: base64Image,
              previousScore: effectiveScore || passABaselineScore,
              retryPrecisionMode: retryRound === 1 ? 'double' : 'standard',
              policyEscapeMode: retryRound === 1 ? 'strict' : '',
            });

            let retryScore = effectiveScore || passABaselineScore;
            if (phase2.applied) {
              if (Number.isFinite(Number(phase2?.score?.overall))) {
                retryScore = phase2.score;
              } else {
                const candidateB64 = (await fs.readFile(fp)).toString('base64');
                retryScore = await scoreFrontierCandidate({
                  referenceMimeType: baseMimeType,
                  referenceB64: base64Image,
                  candidateMimeType: mimeTypeFromPath(fp) || 'image/png',
                  candidateB64,
                  concept,
                  expression,
                  profile: `${approachKey}/${profile}-passB-gain-retry-${retryRound}`,
                });
              }
            }

            const retryEval = evaluatePassBGainTarget(retryScore, passABaselineScore);
            const scoreGain = (Number(retryScore?.overall) || 0) - (Number(effectiveScore?.overall ?? passABaselineScore?.overall) || 0);
            const acceptRetry = retryEval.pass || scoreGain >= PASS_B_PASSA_GAIN_MIN_STEP;
            if (acceptRetry) {
              effectiveScore = retryScore;
              gainEval = retryEval;
              if (phase2?.profileUsed) effectiveProfileUsed = phase2.profileUsed;
              if (phase2?.promptUsed) effectivePromptUsed = phase2.promptUsed;
              attemptLog.push({
                profile,
                stage: 'passB',
                status: 'gain_retry_accepted',
                retry_round: retryRound,
                score_overall: Number(retryScore?.overall) || 0,
                passa_gain_pct: retryEval.headroomGainPct,
              });
              console.log(
                formatPassBGainLog(`Pass B frontier gain-retry accepted (${approachKey}/${profile}/r${retryRound}):`, retryEval) +
                ` score_gain=${scoreGain.toFixed(2)}`
              );
            } else {
              await fs.copyFile(backupPath, fp);
              attemptLog.push({
                profile,
                stage: 'passB',
                status: 'gain_retry_rejected',
                retry_round: retryRound,
                score_overall: Number(retryScore?.overall) || 0,
                passa_gain_pct: retryEval.headroomGainPct,
              });
              console.log(
                formatPassBGainLog(`Pass B frontier gain-retry rejected (${approachKey}/${profile}/r${retryRound}):`, retryEval) +
                ` score_gain=${scoreGain.toFixed(2)} < min_step ${PASS_B_PASSA_GAIN_MIN_STEP.toFixed(2)}`
              );
            }
            await fs.unlink(backupPath).catch(() => {});
          }
        }

        if (passABaselineScore && gainEval && !gainEval.pass) {
          console.log(
            `Pass B frontier gain target unmet (${approachKey}/${profile}): ` +
            `${gainEval.headroomGainPct.toFixed(1)}% < ${gainEval.targetPct.toFixed(1)}%`
          );
          if (PASS_B_PASSA_GAIN_HARD_GATE) {
            attemptLog.push({
              profile,
              stage: 'passB',
              status: 'gain_target_hard_reject',
              score_overall: Number(effectiveScore?.overall) || 0,
              passa_gain_pct: gainEval.headroomGainPct,
            });
            continue;
          }
        }

        if (passABaselineScore && effectiveScore && PASS_B_NO_REGRESSION_GUARD) {
          const passAOverall = Number(passABaselineScore?.overall);
          const passBOverall = Number(effectiveScore?.overall);
          if (Number.isFinite(passAOverall) && Number.isFinite(passBOverall)) {
            const regression = passAOverall - passBOverall;
            if (regression > PASS_B_NO_REGRESSION_TOL) {
              console.log(
                `Pass B frontier no-regression guard rejected (${approachKey}/${profile}): ` +
                `passA=${passAOverall.toFixed(2)} passB=${passBOverall.toFixed(2)} ` +
                `regression=${regression.toFixed(2)} > tol ${PASS_B_NO_REGRESSION_TOL.toFixed(2)}`
              );
              attemptLog.push({
                profile,
                stage: 'passB',
                status: 'no_regression_guard_rejected',
                score_overall: passBOverall,
                passa_overall: passAOverall,
                regression,
              });
              continue;
            }
          }
        }

        if (effectiveScore) {
          const attireMetric = metricValue(effectiveScore, 'attire_adherence_score');
          if (attireMetric < PASSB_ATTIRE_SELECT_FLOOR) {
            console.log(
              `Pass B frontier rejected (${approachKey}/${profile}): ` +
              `attire adherence ${attireMetric.toFixed(2)} < floor ${PASSB_ATTIRE_SELECT_FLOOR.toFixed(2)} ` +
              '(candidate likely retained/reintroduced source outfit or drifted from concept wardrobe).'
            );
            attemptLog.push({
              profile,
              stage: 'passB',
              status: 'attire_guardrail_rejected',
              score_overall: Number(effectiveScore?.overall) || 0,
              attire_score: attireMetric,
              attire_floor: PASSB_ATTIRE_SELECT_FLOOR,
            });
            continue;
          }
        }

        if (enableAggressiveBoundary) {
          const phase2Prompt = buildPromptPassBPhase2Boundary(
            concept,
            expression,
            variation,
            profile,
            approachKey,
            lessons,
            { passAAuditBlock },
            synthesisCharter
          );
          validatePrompt(phase2Prompt, `Pass B Phase2 (${approachKey}/${profile})`);
          console.log(`Phase-2 aggressive boundary attempt approach=${approachKey} profile=${profile} intensity=${AB_PHASE2_INTENSITY.toFixed(2)}x`);
          const phase2Contents = [{
            role: 'user',
            parts: buildImageEditParts(phase2Prompt, part.inlineData.mimeType || 'image/png', part.inlineData.data),
          }];
          try {
            const phase2Data = await callModel(phase2Contents, 0, true, null, ENDPOINT, Date.now(), imageSize, {
              concept: concept.name,
              stage: 'passB-frontier-phase2',
              profile,
              approach: approachKey,
            });
            logModelDiagnostics(phase2Data, `Pass B Phase2 (${approachKey}/${profile})`);
            const phase2Parts = phase2Data.candidates?.[0]?.content?.parts || [];
            let phase2Image = null;
            for (const phase2Part of phase2Parts) {
              if (phase2Part.inlineData?.data) {
                phase2Image = phase2Part.inlineData;
                break;
              }
            }
            if (phase2Image?.data) {
              const phase2Img = Buffer.from(phase2Image.data, 'base64');
              if (isSourceCloneBuffer(phase2Img, baseImageBuffer)) {
                console.log(`Phase-2 boundary output was source-identical for approach=${approachKey} profile=${profile}; keeping phase1 baseline.`);
                attemptLog.push({
                  profile,
                  stage: 'passB_phase2',
                  status: 'source_clone_rejected',
                });
              } else {
                const phase2IdentityGate = await enforceDeterministicIdentityGate({
                  referencePath: inputImage,
                  candidateBuffer: phase2Img,
                  candidateMimeType: phase2Image.mimeType || 'image/png',
                  approachKey,
                  profile,
                  stage: 'passB-phase2',
                  attemptLog,
                });
                if (!phase2IdentityGate.accepted) {
                  continue;
                }
                await fs.writeFile(fp, phase2Img);
                await saveSimpleStageArtifact('Pass B', concept.name, phase2Img, phase2Image.mimeType || 'image/png');
                console.log(`SAVED FINAL (PHASE2): ${fp} (${(phase2Img.length / 1024 / 1024).toFixed(2)} MB) | approach=${approachKey} profile=${profile}`);
                attemptLog.push({
                  profile,
                  stage: 'passB_phase2',
                  status: 'generated',
                });
                return {
                  path: fp,
                  profileUsed: `${profile}+phase2`,
                  approach: approachKey,
                  promptUsed: phase2Prompt,
                  attemptLog,
                  lessonsApplied: lessons,
                  synthesisCharter,
                };
              }
            }

            const phase2Signal = extractBlockSignal(phase2Data);
            console.log(`Phase-2 boundary attempt failed (no image, finish=${phase2Signal.finish || 'n/a'}); keeping phase1 baseline.`);
            attemptLog.push({
              profile,
              stage: 'passB_phase2',
              status: 'no_image',
              finish: phase2Signal.finish || null,
              block: phase2Signal.block || null,
              safety: phase2Signal.safety || null,
            });
          } catch (phase2Err) {
            console.log(`Phase-2 boundary attempt request error: ${phase2Err.message}; keeping phase1 baseline.`);
            attemptLog.push({
              profile,
              stage: 'passB_phase2',
              status: 'request_error',
              error: phase2Err.message,
            });
          }
        }

        return {
          path: fp,
          profileUsed: effectiveProfileUsed,
          approach: approachKey,
          promptUsed: effectivePromptUsed,
          attemptLog,
          lessonsApplied: lessons,
          synthesisCharter,
        };
      }
    }
    const signal = extractBlockSignal(data);
    console.log(`Frontier B approach=${approachKey} profile=${profile} produced no image (finish=${signal.finish || 'n/a'}, block=${signal.block || 'n/a'}).`);
    attemptLog.push({
      profile,
      stage: 'passB',
      status: 'no_image',
      finish: signal.finish || null,
      block: signal.block || null,
      safety: signal.safety || null,
    });
  }

  const passAImg = await fs.readFile(passA.fp);
  let fallbackBuffer = passAImg;
  let fallbackProfile = 'passA-fallback';
  if (isSourceCloneBuffer(passAImg, baseImageBuffer)) {
    const scaffold = await selectNonSourceScaffoldForConcept(concept, baseImageBuffer, [passA.fp]);
    if (scaffold) {
      fallbackBuffer = scaffold.buffer;
      fallbackProfile = 'ab-scaffold-fallback';
      console.log(`Frontier B fallback used non-source scaffold: ${scaffold.path}`);
      attemptLog.push({
        profile: 'ab-scaffold',
        stage: 'passB',
        status: 'ab_scaffold_fallback',
        path: scaffold.path,
      });
    } else {
      throw new Error(`Frontier B approach=${approachKey}: Pass A fallback is source-identical and no non-source scaffold is available.`);
    }
  } else {
    console.log('Frontier B fallback failed - using Pass A output as final.');
  }
  if (isSourceCloneBuffer(fallbackBuffer, baseImageBuffer)) {
    throw new Error(`Frontier B approach=${approachKey}: fallback buffer remained source-identical after safeguards.`);
  }
  const fallbackMimeType = mimeTypeFromPath(passA.fp) || 'image/png';
  const fallbackPolicy = await validateBufferAgainst4kPolicy(
    fallbackBuffer,
    fallbackMimeType,
    `frontier-passB-fallback:${concept.name}`
  );
  if (!fallbackPolicy.accepted) {
    throw new Error(`Frontier B approach=${approachKey}: fallback buffer failed 4K policy (${fallbackPolicy.reason}).`);
  }
  const fallbackIdentityGate = await enforceDeterministicIdentityGate({
    referencePath: inputImage,
    candidateBuffer: fallbackBuffer,
    candidateMimeType: fallbackMimeType,
    approachKey,
    profile: fallbackProfile,
    stage: 'passB-fallback-final',
    attemptLog,
  });
  if (!fallbackIdentityGate.accepted) {
    throw new Error(`Frontier B approach=${approachKey}: fallback buffer failed deterministic identity gate.`);
  }
  const fp = strategyPath;
  await fs.writeFile(fp, fallbackBuffer);
  const fallbackStageName = stageNameForPassBFinal({ profileUsed: fallbackProfile });
  await saveSimpleStageArtifact(fallbackStageName, concept.name, fallbackBuffer, fallbackMimeType);
  console.log(`SAVED FINAL (PASS A): ${fp} (${(fallbackBuffer.length / 1024 / 1024).toFixed(2)} MB) | approach=${approachKey} profile=${fallbackProfile}`);
  attemptLog.push({
    profile: fallbackProfile,
    stage: 'passB',
    status: 'generated',
  });
  return {
    path: fp,
    profileUsed: fallbackProfile,
    approach: approachKey,
    promptUsed: null,
    attemptLog,
    lessonsApplied: lessons,
    synthesisCharter,
  };
}

function metricValue(score, key) {
  const v = Number(score?.metrics?.[key]);
  return Number.isFinite(v) ? v : 5.0;
}

function evaluateIterationCandidate(candidateScore, baselineScore) {
  const overallDelta = (Number(candidateScore?.overall) || 0) - (Number(baselineScore?.overall) || 0);
  const identityDelta = metricValue(candidateScore, 'identity_score') - metricValue(baselineScore, 'identity_score');
  const complianceDelta = metricValue(candidateScore, 'compliance_score') - metricValue(baselineScore, 'compliance_score');
  const overallSafe = overallDelta >= -ITER_ACCEPT_OVERALL_TOL;
  const identitySafe = identityDelta >= -ITER_ACCEPT_METRIC_TOL;
  const complianceSafe = complianceDelta >= -ITER_ACCEPT_METRIC_TOL;
  return {
    acceptable: overallSafe && identitySafe && complianceSafe,
    overallDelta,
    identityDelta,
    complianceDelta,
    overallSafe,
    identitySafe,
    complianceSafe,
  };
}

function summarizeGenerationHealth(attemptLog = []) {
  const list = Array.isArray(attemptLog) ? attemptLog : [];
  const summary = {
    total: list.length,
    generated: 0,
    selected: 0,
    scored: 0,
    request_error: 0,
    no_image: 0,
    reused_cached: 0,
    emergency: 0,
  };
  for (const item of list) {
    const status = String(item?.status || '');
    if (status === 'generated' || status === 'generated_phase1') summary.generated += 1;
    if (status === 'selected') summary.selected += 1;
    if (status === 'scored') summary.scored += 1;
    if (status === 'request_error') summary.request_error += 1;
    if (status === 'no_image' || status === 'no_viable_variant') summary.no_image += 1;
    if (status.includes('reused_cached')) summary.reused_cached += 1;
    if (String(item?.profile || '').includes('emergency') || status.includes('input_scaffold')) summary.emergency += 1;
  }
  return summary;
}

function buildAuditQualitySignals({
  scoreByApproach = {},
  winnerApproach = 'A',
  phase2Rounds = {},
}) {
  const ranked = STRATEGY_KEYS
    .map(key => ({ key, overall: Number(scoreByApproach?.[key]?.overall) || 0 }))
    .sort((a, b) => b.overall - a.overall);
  const top = ranked[0] || { key: winnerApproach, overall: 0 };
  const second = ranked[1] || { key: winnerApproach, overall: top.overall };
  const margin = Math.max(0, (Number(top.overall) || 0) - (Number(second.overall) || 0));
  const spread = Math.max(0, (ranked[0]?.overall || 0) - (ranked[ranked.length - 1]?.overall || 0));
  const winnerScore = scoreByApproach?.[winnerApproach] || {};
  const identity = metricValue(winnerScore, 'identity_score');
  const compliance = metricValue(winnerScore, 'compliance_score');

  const phase2All = [
    ...(Array.isArray(phase2Rounds?.A) ? phase2Rounds.A : []),
    ...(Array.isArray(phase2Rounds?.B) ? phase2Rounds.B : []),
    ...(Array.isArray(phase2Rounds?.C) ? phase2Rounds.C : []),
  ];
  const phase2Accepted = phase2All.filter(r => r?.accepted === true).length;
  const phase2Rejected = phase2All.filter(r => r?.accepted === false).length;
  const phase2Errors = phase2All.filter(r => String(r?.status || '') === 'request_error').length;
  const phase2NoImage = phase2All.filter(r => {
    const st = String(r?.status || '');
    return st === 'no_image' || st === 'no_viable_variant';
  }).length;
  const phase2Total = phase2All.length;
  const phase2AcceptedRate = phase2Total > 0 ? phase2Accepted / phase2Total : 0.5;
  const phase2FailureRate = phase2Total > 0 ? (phase2Errors + phase2NoImage) / phase2Total : 0;

  const marginNorm = Math.max(0, Math.min(1, margin / Math.max(0.01, WINNER_TIE_BAND * 2)));
  const safeguardNorm = Math.max(0, Math.min(1, ((identity + compliance) / 2 - 8.5) / 1.5));
  const stabilityNorm = Math.max(0, Math.min(1, phase2AcceptedRate));
  const confidence = Math.max(
    0,
    Math.min(1, (0.45 * marginNorm) + (0.35 * safeguardNorm) + (0.20 * stabilityNorm))
  );

  const riskFlags = [];
  if (margin < WINNER_TIE_BAND) riskFlags.push('winner_margin_tight');
  if (identity < IDENTITY_GUARDRAIL) riskFlags.push('identity_below_guardrail');
  if (compliance < COMPLIANCE_GUARDRAIL) riskFlags.push('compliance_below_guardrail');
  if (phase2FailureRate > 0.25) riskFlags.push('phase2_failure_rate_high');
  if (phase2Total > 0 && phase2Rejected / phase2Total > 0.55) riskFlags.push('phase2_rejection_rate_high');

  return {
    winner_margin: margin,
    score_spread: spread,
    confidence,
    phase2: {
      total: phase2Total,
      accepted: phase2Accepted,
      rejected: phase2Rejected,
      request_errors: phase2Errors,
      no_image: phase2NoImage,
      accepted_rate: phase2AcceptedRate,
      failure_rate: phase2FailureRate,
    },
    safeguards: {
      identity_score: identity,
      compliance_score: compliance,
    },
    risk_flags: riskFlags,
  };
}

function betterPhase2Candidate(nextCandidate, bestCandidate) {
  const nextSafe = !!nextCandidate?.viability?.acceptable;
  const bestSafe = !!bestCandidate?.viability?.acceptable;
  if (nextSafe !== bestSafe) return nextSafe;
  if ((nextCandidate?.score || 0) !== (bestCandidate?.score || 0)) {
    return (nextCandidate?.score || 0) > (bestCandidate?.score || 0);
  }
  const nextStability = (
    (nextCandidate?.viability?.identityDelta || 0) +
    (nextCandidate?.viability?.complianceDelta || 0)
  );
  const bestStability = (
    (bestCandidate?.viability?.identityDelta || 0) +
    (bestCandidate?.viability?.complianceDelta || 0)
  );
  return nextStability > bestStability;
}

const METRIC_GAP_DIRECTIVES = {
  identity_score: 'Enforce stronger facial geometry lock (landmarks, inter-feature spacing, asymmetry preservation).',
  anatomy_score: 'Tighten pose biomechanics and contact-pressure consistency (no impossible limb/torso transitions).',
  garment_physics_score: 'Increase seam/load-path specificity, edge-thickness realism, and wet-state tension continuity.',
  optics_score: 'Strengthen source-to-highlight mapping, Fresnel behavior, and caustic/reflection family coherence.',
  realism_score: 'Improve sensor-level realism (micro-noise, natural skin texture, non-plastic rendering cues).',
  attire_adherence_score: 'Force complete wardrobe replacement and stronger concept-geometry adherence (no source casual attire carryover).',
  compliance_score: 'Use restrained editorial wording and maintain fully covered, non-explicit framing language.',
};

function deriveMetricGapLessons(scoreA, scoreB) {
  const metricKeys = Object.keys(METRIC_GAP_DIRECTIVES);
  const weakest = metricKeys
    .map(key => ({ key, value: Math.max(metricValue(scoreA, key), metricValue(scoreB, key)) }))
    .sort((a, b) => a.value - b.value);

  const lessons = [];
  for (const item of weakest.slice(0, 3)) {
    if (item.value <= 9.45) {
      lessons.push(METRIC_GAP_DIRECTIVES[item.key]);
    }
  }
  return normalizeLessons(lessons, 4);
}

function weightedHistoricalLessons(summary, records) {
  const weights = new Map();
  const add = (text, delta) => {
    const key = String(text || '').trim().replace(/\s+/g, ' ');
    if (!key) return;
    weights.set(key, (weights.get(key) || 0) + delta);
  };

  for (const item of (summary?.top_lessons || [])) {
    const lesson = item?.lesson || item?.hint;
    const count = Number(item?.count) || 1;
    add(lesson, 2 + (count * 0.35));
  }
  for (const item of (summary?.top_hints || [])) {
    const hint = item?.hint || item?.lesson;
    const count = Number(item?.count) || 1;
    add(hint, 1 + (count * 0.25));
  }

  const recent = (records || []).slice(Math.max(0, (records || []).length - LESSON_RECENCY_WINDOW));
  const total = Math.max(1, recent.length);
  for (let i = 0; i < recent.length; i++) {
    const rec = recent[i];
    const recency = 1 + ((i + 1) / total);
    const winner = normalizeApproach(rec?.winner?.approach, 'A');
    const winnerLessons = normalizeLessons(rec?.strategies?.[winner]?.lessons_applied || [], 24);
    const targetHit = !!rec?.comparisons?.target_gain_hit;
    const hitBoost = targetHit ? 1.1 : 0;

    for (const lesson of normalizeLessons(rec?.lessons?.all || [], 40)) {
      let delta = (0.9 * recency) + hitBoost;
      if (winnerLessons.includes(lesson)) delta += 0.8;
      if (normalizeApproach(winner, 'A') === 'C' && normalizeLessons(rec?.lessons?.c_prompt_plan || [], 20).includes(lesson)) {
        delta += 0.4;
      }
      add(lesson, delta);
    }
    for (const hint of normalizeLessons(rec?.hints || [], 20)) {
      add(hint, 0.55 * recency);
    }
  }

  return [...weights.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([lesson]) => lesson)
    .slice(0, LESSON_MAX_PER_PROMPT);
}

function selectWinnerWithGuardrails(strategyScores) {
  const candidates = STRATEGY_KEYS.map(key => {
    const score = strategyScores[key];
    const overall = Number(score?.overall) || 0;
    const identity = metricValue(score, 'identity_score');
    const compliance = metricValue(score, 'compliance_score');
    const garment = metricValue(score, 'garment_physics_score');
    const blended = (
      overall * 0.68 +
      identity * 0.16 +
      garment * 0.10 +
      compliance * 0.06
    );
    return { key, overall, identity, compliance, garment, blended };
  }).sort((a, b) => b.overall - a.overall);

  if (!candidates.length) {
    return { key: 'A', reason: 'default_fallback', shortlist: [] };
  }

  const top = candidates[0];
  const withinBand = candidates.filter(c => (top.overall - c.overall) <= WINNER_TIE_BAND);
  let filtered = [...withinBand];

  const bestCompliance = Math.max(...filtered.map(c => c.compliance));
  if (bestCompliance >= COMPLIANCE_GUARDRAIL) {
    filtered = filtered.filter(c => c.compliance >= COMPLIANCE_GUARDRAIL || (top.overall - c.overall) <= 0.03);
  }

  const bestIdentity = Math.max(...filtered.map(c => c.identity));
  if (bestIdentity >= IDENTITY_GUARDRAIL) {
    filtered = filtered.filter(c => c.identity >= IDENTITY_GUARDRAIL || (top.overall - c.overall) <= 0.03);
  }

  const selected = [...filtered].sort((a, b) => {
    if (b.blended !== a.blended) return b.blended - a.blended;
    return b.overall - a.overall;
  })[0] || top;

  const reason = filtered.length > 1
    ? `tie_band_${WINNER_TIE_BAND}_guardrail_blended`
    : 'overall_leader';

  return {
    key: selected.key,
    reason,
    shortlist: filtered.map(c => ({
      approach: c.key,
      overall: c.overall,
      blended: c.blended,
      identity: c.identity,
      compliance: c.compliance,
    })),
  };
}

function deriveABIterationHints(scoreA, scoreB) {
  const hints = [];
  const aId = metricValue(scoreA, 'identity_score');
  const bId = metricValue(scoreB, 'identity_score');
  const aPhys = metricValue(scoreA, 'garment_physics_score');
  const bPhys = metricValue(scoreB, 'garment_physics_score');
  const aOpt = metricValue(scoreA, 'optics_score');
  const bOpt = metricValue(scoreB, 'optics_score');
  const aAttire = metricValue(scoreA, 'attire_adherence_score');
  const bAttire = metricValue(scoreB, 'attire_adherence_score');
  const aComp = metricValue(scoreA, 'compliance_score');
  const bComp = metricValue(scoreB, 'compliance_score');

  if (aId + 0.8 < bId) hints.push('Approach A: strengthen identity anchors and reduce stylistic drift in facial geometry.');
  if (bId + 0.8 < aId) hints.push('Approach B: tighten identity lock and preserve reference asymmetry more explicitly.');
  if (aPhys + 0.8 < bPhys) hints.push('Approach A: increase seam/load-path specificity and wet-state cloth constraints.');
  if (bPhys + 0.8 < aPhys) hints.push('Approach B: add explicit tension gradient and edge-thickness constraints.');
  if (aOpt + 0.8 < bOpt) hints.push('Approach A: improve source-to-highlight mapping and Fresnel-consistent reflections.');
  if (bOpt + 0.8 < aOpt) hints.push('Approach B: strengthen optical coherence checks (caustics/refraction/shadow families).');
  if (aAttire + 0.8 < bAttire) hints.push('Approach A: enforce full source-wardrobe replacement and tighten concept garment geometry adherence.');
  if (bAttire + 0.8 < aAttire) hints.push('Approach B: tighten wardrobe replacement lock and preserve couture one-piece geometry under edits.');
  if (aComp + 0.8 < bComp) hints.push('Approach A: reduce suggestive phrasing and favor restrained editorial framing.');
  if (bComp + 0.8 < aComp) hints.push('Approach B: keep directionality but remove ambiguous intensity language.');

  if (hints.length === 0) {
    hints.push('Both approaches are close; iterate with finer profile-specific tuning rather than structural changes.');
  }
  return normalizeLessons(hints, 8);
}

function deepAuditABBaseline(scoreA, scoreB) {
  const metricLabels = {
    identity_score: 'identity',
    anatomy_score: 'anatomy',
    garment_physics_score: 'garment_physics',
    optics_score: 'optics',
    realism_score: 'realism',
    attire_adherence_score: 'attire_adherence',
    compliance_score: 'compliance',
  };

  const metrics = Object.keys(metricLabels).map(key => {
    const a = metricValue(scoreA, key);
    const b = metricValue(scoreB, key);
    const delta = a - b;
    return {
      key,
      label: metricLabels[key],
      a,
      b,
      delta,
      absDelta: Math.abs(delta),
      leader: delta >= 0 ? 'A' : 'B',
    };
  }).sort((x, y) => y.absDelta - x.absDelta);

  const lessonsA = [];
  const lessonsB = [];
  const sharedLessons = [];
  const lines = metrics.map(m => `${m.label}: A=${m.a.toFixed(2)} B=${m.b.toFixed(2)} leader=${m.leader} Δ=${m.absDelta.toFixed(2)}`);

  for (const m of metrics) {
    if (m.a + 0.25 < m.b) lessonsA.push(`Phase-2 A focus (${m.label}): ${METRIC_GAP_DIRECTIVES[m.key]}`);
    if (m.b + 0.25 < m.a) lessonsB.push(`Phase-2 B focus (${m.label}): ${METRIC_GAP_DIRECTIVES[m.key]}`);
    if (m.absDelta < 0.2) sharedLessons.push(`A/B ${m.label} are near-parity; seek incremental improvement without introducing new drift.`);
  }

  if (!lessonsA.length) lessonsA.push('Phase-2 A: preserve current strengths and push micro-detail edge only where deterministic and compliance-safe.');
  if (!lessonsB.length) lessonsB.push('Phase-2 B: preserve current strengths and push micro-detail edge only where deterministic and compliance-safe.');

  return {
    metrics,
    lines,
    lessonsA: normalizeLessons(lessonsA, 8),
    lessonsB: normalizeLessons(lessonsB, 8),
    sharedLessons: normalizeLessons(sharedLessons, 4),
  };
}

async function runPhase2BoundaryRefinement({
  concept,
  index,
  variation,
  approachKey,
  profile,
  baselinePath,
  lessons = [],
  passAAuditBlock = '',
  referencePath = '',
  referenceMimeType = null,
  referenceB64 = null,
  previousScore = null,
  retryPrecisionMode = '',
  policyEscapeMode = '',
}) {
  const expression = expressions[index % expressions.length];
  const normalizedProfile = normalizeFrontierProfile(profile || 'balanced');
  const imageSize = imageSizeForApproach(approachKey);
  const mimeType = mimeTypeFromPath(baselinePath);
  const baseB64 = (await fs.readFile(baselinePath)).toString('base64');
  const variantCount = effectivePhase2VariantsPerRound();
  let tactics;
  if (approachKey === 'A') {
    tactics = [
      'push seam/load-path clarity and wet-state constraint consistency',
      'maximize optics causality and Fresnel-consistent highlights',
      'amplify microtexture realism while preserving strict coverage geometry',
    ];
  } else if (approachKey === 'B') {
    tactics = [
      'push directorial edge while preserving compliance-safe framing',
      'maximize tactile lace detail and contact-pressure credibility',
      'amplify sensor-level realism and anti-render artifacts',
    ];
  } else {
    tactics = [
      'fuse A-level seam physics with B-level texture richness without changing framing',
      'maximize cross-domain coherence: identity lock + optics causality + garment load paths',
      'push only deterministic micro-detail gains while preserving compliance-safe directionality',
    ];
  }

  let best = null;
  const variants = [];
  console.log(`Phase-2 aggressive boundary beam approach=${approachKey} profile=${profile || 'n/a'} variants=${variantCount}`);

  for (let i = 0; i < variantCount; i++) {
    const intensity = AB_PHASE2_INTENSITY + (i * PHASE2_VARIANT_INTENSITY_STEP);
    const tactic = tactics[i % tactics.length];
    const variantRetryPrecisionMode = retryPrecisionMode
      ? (i === 0 ? retryPrecisionMode : 'standard')
      : '';
    const variantPolicyEscapeMode = policyEscapeMode
      ? (i === 0 ? policyEscapeMode : '')
      : '';
    const phase2Prompt = buildPromptPassBPhase2Boundary(
      concept,
      expression,
      variation || buildVariation(),
      normalizedProfile,
      approachKey,
      lessons,
      {
        intensity,
        tactic,
        passAAuditBlock,
        retryPrecisionMode: variantRetryPrecisionMode,
        policyEscapeMode: variantPolicyEscapeMode,
      }
    );
    validatePrompt(phase2Prompt, `Pass B Phase2 (${approachKey}/${profile}/v${i + 1})`);
    const contents = [{ role: 'user', parts: buildImageEditParts(phase2Prompt, mimeType, baseB64) }];

    console.log(`Phase-2 v${i + 1}/${variantCount} approach=${approachKey} intensity=${intensity.toFixed(2)}x tactic=${tactic}`);
    try {
      const data = await callModel(contents, 0, true, null, ENDPOINT, Date.now(), imageSize, {
        concept: concept.name,
        stage: `passB-phase2-variant-v${i + 1}`,
        profile: normalizedProfile,
        approach: approachKey,
      });
      logModelDiagnostics(data, `Pass B Phase2 (${approachKey}/${profile}/v${i + 1})`);
      const parts = data.candidates?.[0]?.content?.parts || [];
      let imagePart = null;
      for (const part of parts) {
        if (part.inlineData?.data) {
          imagePart = part.inlineData;
          break;
        }
      }
      if (!imagePart?.data) {
        const signal = extractBlockSignal(data);
        variants.push({
          variant: i + 1,
          intensity,
          tactic,
          status: 'no_image',
          finish: signal.finish || null,
          block: signal.block || null,
        });
        continue;
      }
      const candidateBuffer = Buffer.from(imagePart.data, 'base64');
      const candidateMimeType = imagePart.mimeType || 'image/png';
      if (String(referencePath || '').trim()) {
        const variantIdentityGate = await enforceDeterministicIdentityGate({
          referencePath,
          candidateBuffer,
          candidateMimeType,
          approachKey,
          profile: `${normalizedProfile}-phase2-v${i + 1}`,
          stage: `passB-phase2-v${i + 1}`,
        });
        if (!variantIdentityGate.accepted) {
          variants.push({
            variant: i + 1,
            intensity,
            tactic,
            status: 'identity_rejected',
          });
          continue;
        }
      }

      let scoreObj = previousScore;
      if (referenceMimeType && referenceB64) {
        scoreObj = await scoreFrontierCandidate({
          referenceMimeType,
          referenceB64,
          candidateMimeType,
          candidateB64: imagePart.data,
          concept,
          expression,
          profile: `${approachKey}-phase2-v${i + 1}/${normalizedProfile}`,
        });
      }
      const attireMetric = metricValue(scoreObj, 'attire_adherence_score');
      if (attireMetric < PASSB_ATTIRE_SELECT_FLOOR) {
        variants.push({
          variant: i + 1,
          intensity,
          tactic,
          status: 'attire_rejected',
          attire_score: attireMetric,
          attire_floor: PASSB_ATTIRE_SELECT_FLOOR,
        });
        continue;
      }
      const overall = Number(scoreObj?.overall) || 0;
      const viability = previousScore ? evaluateIterationCandidate(scoreObj, previousScore) : {
        acceptable: true,
        overallDelta: 0,
        identityDelta: 0,
        complianceDelta: 0,
        overallSafe: true,
        identitySafe: true,
        complianceSafe: true,
      };
      variants.push({
        variant: i + 1,
        intensity,
        tactic,
        status: 'generated',
        score: overall,
        acceptable: viability.acceptable,
        deltas: {
          overall: viability.overallDelta,
          identity: viability.identityDelta,
          compliance: viability.complianceDelta,
        },
      });
      const candidate = {
        variant: i + 1,
        intensity,
        tactic,
        prompt: phase2Prompt,
        imagePart,
        score: overall,
        scoreObj,
        viability,
      };
      if (!best || betterPhase2Candidate(candidate, best)) best = candidate;
    } catch (err) {
      variants.push({
        variant: i + 1,
        intensity,
        tactic,
        status: 'request_error',
        error: err.message,
      });
    }
  }

  if (best && best.imagePart?.data) {
    if (previousScore && best.viability && !best.viability.acceptable) {
      console.log('Phase-2 boundary beam produced no viable variant under identity/compliance/overall gates; keeping baseline output.');
      return {
        path: baselinePath,
        applied: false,
        status: 'no_viable_variant',
        promptUsed: null,
        profileUsed: normalizedProfile,
        selected_variant: best.variant,
        variants,
      };
    }

    const img = Buffer.from(best.imagePart.data, 'base64');
    const bestMimeType = best.imagePart.mimeType || 'image/png';
    if (String(referencePath || '').trim()) {
      const finalIdentityGate = await enforceDeterministicIdentityGate({
        referencePath,
        candidateBuffer: img,
        candidateMimeType: bestMimeType,
        approachKey,
        profile: `${normalizedProfile}-phase2-best`,
        stage: 'passB-phase2-final',
      });
      if (!finalIdentityGate.accepted) {
        console.log('Phase-2 best candidate rejected by deterministic identity gate; keeping baseline output.');
        return {
          path: baselinePath,
          applied: false,
          status: 'identity_rejected',
          promptUsed: null,
          profileUsed: normalizedProfile,
          selected_variant: best.variant,
          variants,
        };
      }
    }
    await fs.writeFile(baselinePath, img);
    console.log(`SAVED FINAL (PHASE2 BEST v${best.variant}): ${baselinePath} (${(img.length / 1024 / 1024).toFixed(2)} MB) | approach=${approachKey} profile=${profile || 'n/a'} score=${(best.scoreObj?.overall || 0).toFixed(2)}`);
    return {
      path: baselinePath,
      applied: true,
      status: 'generated',
      promptUsed: best.prompt,
      profileUsed: `${normalizedProfile}+phase2-v${best.variant}`,
      score: best.scoreObj || previousScore,
      selected_variant: best.variant,
      variants,
    };
  }

  const hasRequestError = variants.some(v => v.status === 'request_error');
  if (hasRequestError) {
    console.log('Phase-2 boundary beam had no usable image due to request errors; keeping baseline output.');
    return {
      path: baselinePath,
      applied: false,
      status: 'request_error',
      promptUsed: null,
      profileUsed: normalizedProfile,
      variants,
    };
  }
  console.log('Phase-2 boundary beam produced no image; keeping baseline output.');
  return {
    path: baselinePath,
    applied: false,
    status: 'no_image',
    promptUsed: null,
    profileUsed: normalizedProfile,
    variants,
  };
}

function deriveApproachSelfLessons(score, approachKey) {
  const metrics = Object.keys(METRIC_GAP_DIRECTIVES)
    .map(key => ({ key, value: metricValue(score, key) }))
    .sort((a, b) => a.value - b.value);
  const lessons = [
    `Approach ${approachKey} self-iteration: preserve framing and identity while improving weakest metrics only.`,
  ];
  for (const metric of metrics.slice(0, 3)) {
    if (metric.value <= 9.6) {
      lessons.push(METRIC_GAP_DIRECTIVES[metric.key]);
    }
  }
  if (metricValue(score, 'compliance_score') < COMPLIANCE_GUARDRAIL) {
    lessons.push(`Approach ${approachKey}: prioritize compliance-safe wording and restrained editorial framing before additional detail.`);
  }
  return normalizeLessons(lessons, LESSON_MAX_PER_PROMPT);
}

async function runApproachSelfIteration({
  concept,
  index,
  variation,
  approachKey,
  profileTag,
  path: initialPath,
  score: initialScore,
  historicalLessons = [],
  referencePath = '',
  referenceMimeType,
  referenceB64,
  maxRounds = APPROACH_SELF_ITERATION_ROUNDS_MAX,
  minGain = APPROACH_SELF_MIN_GAIN,
}) {
  if (maxRounds <= 0) {
    return {
      path: initialPath,
      score: initialScore,
      profileTag,
      rounds: [],
      lessonsLast: normalizeLessons(historicalLessons, LESSON_MAX_PER_PROMPT),
    };
  }

  let currentPath = initialPath;
  let currentScore = initialScore;
  let currentProfileTag = profileTag;
  let lessonsLast = normalizeLessons(historicalLessons, LESSON_MAX_PER_PROMPT);
  const rounds = [];

  for (let round = 1; round <= maxRounds; round++) {
    const selfLessons = deriveApproachSelfLessons(currentScore, approachKey);
    const lessons = mergeLessonsByPriority(selfLessons, historicalLessons, LESSON_MAX_PER_PROMPT);
    lessonsLast = lessons;

    const backupPath = `${currentPath}.self-round-${round}.bak`;
    await fs.copyFile(currentPath, backupPath);
    const prevScore = currentScore;

    const phase2 = await runPhase2BoundaryRefinement({
      concept,
      index,
      variation,
      approachKey,
      profile: currentProfileTag,
      baselinePath: currentPath,
      lessons,
      referencePath,
      referenceMimeType,
      referenceB64,
      previousScore: prevScore,
    });

    let accepted = false;
    let gain = 0;
    let candidateScore = prevScore;
    let candidateEval = evaluateIterationCandidate(prevScore, prevScore);
    if (phase2.applied) {
      if (Number.isFinite(Number(phase2?.score?.overall))) {
        candidateScore = phase2.score;
      } else {
        const candidateB64 = (await fs.readFile(currentPath)).toString('base64');
        candidateScore = await scoreFrontierCandidate({
          referenceMimeType,
          referenceB64,
          candidateMimeType: mimeTypeFromPath(currentPath),
          candidateB64,
          concept,
          expression: expressions[index % expressions.length],
          profile: `${approachKey}-self-round${round}/${currentProfileTag}`,
        });
      }
      candidateEval = evaluateIterationCandidate(candidateScore, prevScore);
      if (candidateEval.acceptable) {
        accepted = true;
        currentScore = candidateScore;
        if (phase2.profileUsed) currentProfileTag = phase2.profileUsed;
        gain = currentScore.overall - prevScore.overall;
      } else {
        await fs.copyFile(backupPath, currentPath);
        candidateScore = prevScore;
      }
    }

    await fs.unlink(backupPath).catch(() => {});
    rounds.push({
      round,
      ...phase2,
      accepted,
      score_before: prevScore.overall,
      score_after: candidateScore.overall,
      gain,
      candidate_eval: candidateEval,
    });

    console.log(`${approachKey} SELF ITER ROUND ${round}: ${prevScore.overall.toFixed(2)} -> ${candidateScore.overall.toFixed(2)} (gain ${gain.toFixed(2)})`);
    if (gain < minGain) {
      console.log(`${approachKey} SELF ITER STOP: gain ${gain.toFixed(2)} < threshold ${minGain.toFixed(2)}.`);
      break;
    }
  }

  return {
    path: currentPath,
    score: currentScore,
    profileTag: currentProfileTag,
    rounds,
    lessonsLast,
  };
}

async function runAuditGuidedFinalBoost({
  concept,
  index,
  variation,
  approachKey,
  profileTag,
  path: initialPath,
  score: initialScore,
  lessons = [],
  referencePath = '',
  referenceMimeType,
  referenceB64,
  maxRounds = FINAL_AUDIT_BOOST_ROUNDS_MAX,
  minGain = FINAL_AUDIT_BOOST_MIN_GAIN,
}) {
  if (maxRounds <= 0) {
    return {
      path: initialPath,
      score: initialScore,
      profileTag,
      rounds: [],
      applied: false,
      gain_total: 0,
    };
  }

  let currentPath = initialPath;
  let currentScore = initialScore;
  let currentProfileTag = profileTag;
  const rounds = [];
  let gainTotal = 0;

  for (let round = 1; round <= maxRounds; round++) {
    const prev = currentScore;
    const backupPath = `${currentPath}.audit-final-round-${round}.bak`;
    await fs.copyFile(currentPath, backupPath);
    const roundLessons = normalizeLessons([
      ...lessons,
      `Final audit boost (${approachKey}) round ${round}: preserve exact identity/compliance while maximizing deterministic microphysics gains.`,
      'Prioritize physically causal refinements that increase score without changing composition.',
    ], LESSON_MAX_PER_PROMPT + 4);

    const phase2 = await runPhase2BoundaryRefinement({
      concept,
      index,
      variation,
      approachKey,
      profile: currentProfileTag,
      baselinePath: currentPath,
      lessons: roundLessons,
      referencePath,
      referenceMimeType,
      referenceB64,
      previousScore: prev,
    });

    let candidate = prev;
    if (phase2.applied) {
      if (Number.isFinite(Number(phase2?.score?.overall))) {
        candidate = phase2.score;
      } else {
        const candidateB64 = (await fs.readFile(currentPath)).toString('base64');
        candidate = await scoreFrontierCandidate({
          referenceMimeType,
          referenceB64,
          candidateMimeType: mimeTypeFromPath(currentPath),
          candidateB64,
          concept,
          expression: expressions[index % expressions.length],
          profile: `${approachKey}-final-audit-round${round}/${currentProfileTag}`,
        });
      }
    }

    const evalRes = evaluateIterationCandidate(candidate, prev);
    const gain = (Number(candidate?.overall) || 0) - (Number(prev?.overall) || 0);
    let accepted = false;
    if (phase2.applied && evalRes.acceptable && gain >= minGain) {
      accepted = true;
      currentScore = candidate;
      if (phase2.profileUsed) currentProfileTag = phase2.profileUsed;
      gainTotal += gain;
    } else {
      await fs.copyFile(backupPath, currentPath);
    }
    await fs.unlink(backupPath).catch(() => {});

    rounds.push({
      round,
      ...phase2,
      accepted,
      gain,
      score_before: Number(prev?.overall) || 0,
      score_after: accepted ? (Number(currentScore?.overall) || 0) : (Number(prev?.overall) || 0),
      candidate_eval: evalRes,
    });

    console.log(`FINAL AUDIT BOOST ${approachKey} ROUND ${round}: ${prev.overall.toFixed(2)} -> ${(accepted ? currentScore.overall : prev.overall).toFixed(2)} (gain ${accepted ? gain.toFixed(2) : '0.00'})`);
    if (!accepted || gain < minGain) {
      console.log(`FINAL AUDIT BOOST STOP (${approachKey}): gain ${gain.toFixed(2)} < threshold ${minGain.toFixed(2)} or candidate rejected.`);
      break;
    }
  }

  return {
    path: currentPath,
    score: currentScore,
    profileTag: currentProfileTag,
    rounds,
    applied: rounds.some(r => r.accepted),
    gain_total: gainTotal,
  };
}

const C_GOAL_METRIC_ORDER = [
  'identity_score',
  'anatomy_score',
  'garment_physics_score',
  'optics_score',
  'realism_score',
  'attire_adherence_score',
  'compliance_score',
];

const C_GOAL_METRIC_LABEL = {
  identity_score: 'identity',
  anatomy_score: 'anatomy',
  garment_physics_score: 'garment physics',
  optics_score: 'optics',
  realism_score: 'realism',
  attire_adherence_score: 'attire adherence',
  compliance_score: 'compliance',
};

function deriveABGoalSignature(scoreA, scoreB, deepAudit = null) {
  const winnerAB = (Number(scoreA?.overall) || 0) >= (Number(scoreB?.overall) || 0) ? 'A' : 'B';
  const loserAB = winnerAB === 'A' ? 'B' : 'A';
  const winnerScore = winnerAB === 'A' ? scoreA : scoreB;
  const auditMetrics = Array.isArray(deepAudit?.metrics) && deepAudit.metrics.length
    ? deepAudit.metrics
    : C_GOAL_METRIC_ORDER.map(key => {
      const a = metricValue(scoreA, key);
      const b = metricValue(scoreB, key);
      const delta = a - b;
      return {
        key,
        a,
        b,
        delta,
        absDelta: Math.abs(delta),
        leader: delta >= 0 ? 'A' : 'B',
      };
    });

  const winnerLeadKeys = auditMetrics
    .filter(m => normalizeApproach(m?.leader, 'A') === winnerAB && Number(m?.absDelta) >= 0.2)
    .sort((x, y) => (Number(y?.absDelta) || 0) - (Number(x?.absDelta) || 0))
    .slice(0, 2)
    .map(m => String(m?.key || '').trim())
    .filter(Boolean);

  const loserLeadKeys = auditMetrics
    .filter(m => normalizeApproach(m?.leader, 'A') === loserAB && Number(m?.absDelta) >= 0.2)
    .sort((x, y) => (Number(y?.absDelta) || 0) - (Number(x?.absDelta) || 0))
    .slice(0, 2)
    .map(m => String(m?.key || '').trim())
    .filter(Boolean);

  const weakWinnerKeys = C_GOAL_METRIC_ORDER
    .map(key => ({ key, value: metricValue(winnerScore, key) }))
    .sort((a, b) => a.value - b.value)
    .slice(0, 2)
    .map(item => item.key);

  return {
    winnerAB,
    loserAB,
    winnerLeadKeys,
    loserLeadKeys,
    weakWinnerKeys,
  };
}

function goalSignatureSimilarity(currentSignature, candidateSignature) {
  const overlapCount = (a = [], b = []) => {
    const setB = new Set(b);
    return a.filter(item => setB.has(item)).length;
  };
  let score = 0;
  if (currentSignature?.winnerAB === candidateSignature?.winnerAB) score += 1.2;
  score += overlapCount(currentSignature?.winnerLeadKeys, candidateSignature?.winnerLeadKeys) * 0.75;
  score += overlapCount(currentSignature?.loserLeadKeys, candidateSignature?.loserLeadKeys) * 0.6;
  score += overlapCount(currentSignature?.weakWinnerKeys, candidateSignature?.weakWinnerKeys) * 0.45;
  return score;
}

function deriveGoalConditionedCLessons(records, scoreA, scoreB, deepAudit = null, options = {}) {
  const window = Math.max(6, parseInt(options?.window || LESSON_RECENCY_WINDOW, 10));
  const maxLessons = Math.max(2, parseInt(options?.maxLessons || 4, 10));
  const avoidMax = Math.max(1, parseInt(options?.avoidMax || 3, 10));
  const similarityThreshold = Math.max(1.0, Number(options?.similarityThreshold) || 1.25);
  const sourceRecords = Array.isArray(records)
    ? records.slice(Math.max(0, records.length - window))
    : [];
  const currentSignature = deriveABGoalSignature(scoreA, scoreB, deepAudit);

  const positive = new Map();
  const negative = new Map();
  let matchedRecords = 0;
  let positiveCases = 0;
  let negativeCases = 0;

  const addWeight = (bucket, lesson, weight) => {
    const key = String(lesson || '').trim().replace(/\s+/g, ' ');
    if (!key) return;
    bucket.set(key, (bucket.get(key) || 0) + weight);
  };

  for (const rec of sourceRecords) {
    const recScoreA = rec?.strategies?.A?.score;
    const recScoreB = rec?.strategies?.B?.score;
    if (!recScoreA || !recScoreB) continue;
    const recSignature = deriveABGoalSignature(recScoreA, recScoreB, rec?.deep_audit || null);
    const similarity = goalSignatureSimilarity(currentSignature, recSignature);
    if (similarity < similarityThreshold) continue;
    matchedRecords += 1;

    let cGain = Number(rec?.comparisons?.c_vs_best_ab);
    if (!Number.isFinite(cGain)) {
      const pct = Number(rec?.comparisons?.c_gain_percent_vs_best_ab);
      cGain = Number.isFinite(pct) ? (pct / 100) : 0;
    }
    const gainMagnitude = Math.min(2.5, Math.max(0.25, Math.abs(cGain) * 2 + 0.5));

    const candidateLessons = normalizeLessons([
      ...(rec?.lessons?.c_prompt_plan || []),
      ...(rec?.strategies?.C?.lessons_applied || []),
      ...normalizeLessons(rec?.hints || [], 12).filter(h => /^Approach C|^C /i.test(String(h))),
    ], 24);
    if (!candidateLessons.length) continue;

    if (cGain > 0.05) {
      positiveCases += 1;
      for (const lesson of candidateLessons) addWeight(positive, lesson, similarity * gainMagnitude);
    } else if (cGain < -0.05) {
      negativeCases += 1;
      for (const lesson of candidateLessons) addWeight(negative, lesson, similarity * gainMagnitude);
    } else {
      for (const lesson of candidateLessons.slice(0, 4)) addWeight(positive, lesson, similarity * 0.25);
    }
  }

  const scored = [];
  const allKeys = new Set([...positive.keys(), ...negative.keys()]);
  for (const key of allKeys) {
    const pos = positive.get(key) || 0;
    const neg = negative.get(key) || 0;
    const net = pos - (neg * 0.95);
    scored.push({ lesson: key, positive: pos, negative: neg, net });
  }

  const priorityLessons = scored
    .filter(item => item.net > 0.2)
    .sort((a, b) => b.net - a.net)
    .slice(0, maxLessons)
    .map(item => item.lesson);

  const avoidLessons = scored
    .filter(item => item.negative > item.positive && item.negative >= 1)
    .sort((a, b) => (b.negative - b.positive) - (a.negative - a.positive))
    .slice(0, avoidMax)
    .map(item => item.lesson);

  let adaptiveMaxLessons = C_STRATEGY_LESSON_MAX;
  if (negativeCases >= Math.max(2, positiveCases + 1)) {
    adaptiveMaxLessons = Math.max(6, C_STRATEGY_LESSON_MAX - 3);
  } else if (positiveCases >= Math.max(2, negativeCases + 1)) {
    adaptiveMaxLessons = Math.min(LESSON_MAX_PER_PROMPT, C_STRATEGY_LESSON_MAX + 2);
  }

  return {
    matched_records: matchedRecords,
    positive_cases: positiveCases,
    negative_cases: negativeCases,
    priority_lessons: priorityLessons,
    avoid_lessons: avoidLessons,
    adaptive_max_lessons: adaptiveMaxLessons,
    goal_signature: currentSignature,
  };
}

function pruneLowYieldCLessons(lessons = [], avoidLessons = [], minKeep = 6) {
  const base = normalizeLessons(lessons, Math.max(minKeep, LESSON_MAX_PER_PROMPT + 4));
  const avoidSet = new Set(
    normalizeLessons(avoidLessons, LESSON_MAX_PER_PROMPT + 4)
      .map(s => String(s || '').trim().replace(/\s+/g, ' '))
      .filter(Boolean)
  );
  if (!avoidSet.size) return base;
  const pruned = base.filter(item => !avoidSet.has(String(item || '').trim().replace(/\s+/g, ' ')));
  if (pruned.length < minKeep) return base.slice(0, minKeep);
  return pruned;
}

function deconstructABComparisonFirstPrinciples(scoreA, scoreB, deepAudit = null) {
  const winnerAB = (Number(scoreA?.overall) || 0) >= (Number(scoreB?.overall) || 0) ? 'A' : 'B';
  const loserAB = winnerAB === 'A' ? 'B' : 'A';
  const metrics = Array.isArray(deepAudit?.metrics) && deepAudit.metrics.length
    ? deepAudit.metrics
    : C_GOAL_METRIC_ORDER.map(key => {
      const a = metricValue(scoreA, key);
      const b = metricValue(scoreB, key);
      const delta = a - b;
      return {
        key,
        delta,
        absDelta: Math.abs(delta),
        leader: delta >= 0 ? 'A' : 'B',
      };
    });
  const topWinnerMetric = metrics
    .filter(m => normalizeApproach(m?.leader, 'A') === winnerAB)
    .sort((x, y) => (Number(y?.absDelta) || 0) - (Number(x?.absDelta) || 0))[0];
  const topLoserMetric = metrics
    .filter(m => normalizeApproach(m?.leader, 'A') === loserAB)
    .sort((x, y) => (Number(y?.absDelta) || 0) - (Number(x?.absDelta) || 0))[0];
  const winnerIdentity = metricValue(winnerAB === 'A' ? scoreA : scoreB, 'identity_score');
  const winnerCompliance = metricValue(winnerAB === 'A' ? scoreA : scoreB, 'compliance_score');

  return normalizeLessons([
    `FP problem decomposition: optimize C for deterministic gain vs best(A,B), not stylistic novelty.`,
    'FP assumption challenge: higher detail is not automatically better; reject any gain that weakens identity/compliance stability.',
    `FP fundamental truth: ${winnerAB} is the current backbone; preserve its causal structure before importing any foreign traits.`,
    `FP fundamental truth: keep ${winnerAB} safeguards (identity=${winnerIdentity.toFixed(2)}, compliance=${winnerCompliance.toFixed(2)}) as non-negotiable floors.`,
    topWinnerMetric
      ? `FP evidence: ${winnerAB} leads on ${C_GOAL_METRIC_LABEL[topWinnerMetric.key] || topWinnerMetric.key}; this remains locked.`
      : '',
    topLoserMetric
      ? `FP evidence: ${loserAB} only contributes targeted gain on ${C_GOAL_METRIC_LABEL[topLoserMetric.key] || topLoserMetric.key}; import locally, not globally.`
      : '',
    'FP rebuild rule: if imported change cannot be linked to an in-frame causal improvement, drop it.',
  ], 7);
}

function buildCSynthesisCharter({
  concept = null,
  scoreA,
  scoreB,
  deepAudit = null,
  goalConditionedLearning = null,
  targetHeadroomPct = TARGET_QUALITY_GAIN_PCT,
}) {
  const winnerAB = (Number(scoreA?.overall) || 0) >= (Number(scoreB?.overall) || 0) ? 'A' : 'B';
  const loserAB = winnerAB === 'A' ? 'B' : 'A';
  const winnerScore = winnerAB === 'A' ? scoreA : scoreB;
  const loserScore = loserAB === 'A' ? scoreA : scoreB;
  const bestAB = Math.max(Number(scoreA?.overall) || 0, Number(scoreB?.overall) || 0);
  const targetScore = bestAB + ((Math.max(0, Number(targetHeadroomPct) || 0) / 100) * Math.max(0, QUALITY_SCORE_CEILING - bestAB));

  const auditMetrics = Array.isArray(deepAudit?.metrics) && deepAudit.metrics.length
    ? deepAudit.metrics
    : C_GOAL_METRIC_ORDER.map(key => {
      const a = metricValue(scoreA, key);
      const b = metricValue(scoreB, key);
      const delta = a - b;
      return {
        key,
        a,
        b,
        delta,
        absDelta: Math.abs(delta),
        leader: delta >= 0 ? 'A' : 'B',
      };
    });

  const keepFromWinner = auditMetrics
    .filter(m => normalizeApproach(m?.leader, 'A') === winnerAB && Number(m?.absDelta) >= 0.2)
    .sort((x, y) => (Number(y?.absDelta) || 0) - (Number(x?.absDelta) || 0))
    .slice(0, 3)
    .map(m => `${C_GOAL_METRIC_LABEL[m.key] || m.key} (Δ=${Number(m.absDelta || 0).toFixed(2)})`);
  const importFromLoser = auditMetrics
    .filter(m => normalizeApproach(m?.leader, 'A') === loserAB && Number(m?.absDelta) >= 0.2)
    .sort((x, y) => (Number(y?.absDelta) || 0) - (Number(x?.absDelta) || 0))
    .slice(0, 3)
    .map(m => `${C_GOAL_METRIC_LABEL[m.key] || m.key} (Δ=${Number(m.absDelta || 0).toFixed(2)})`);
  const weakWinner = C_GOAL_METRIC_ORDER
    .map(key => ({ key, value: metricValue(winnerScore, key) }))
    .sort((a, b) => a.value - b.value)
    .slice(0, 2)
    .map(item => `${C_GOAL_METRIC_LABEL[item.key] || item.key}=${item.value.toFixed(2)}`);
  const goalLearn = normalizeLessons(goalConditionedLearning?.priority_lessons || [], 3);

  const charterLines = [
    `Shared outcome goal lock: C must pursue the same end-state as A/B (identity-accurate, physically plausible, compliance-safe luxury editorial result).`,
    `Backbone selection: keep ${winnerAB} macro structure as default (A=${Number(scoreA?.overall || 0).toFixed(2)}, B=${Number(scoreB?.overall || 0).toFixed(2)}).`,
    `Improvement target: beat best(A,B) by >= ${Math.max(0, Number(targetHeadroomPct) || 0).toFixed(1)}% headroom; practical score target >= ${targetScore.toFixed(2)}.`,
    `Keep from ${winnerAB}: ${keepFromWinner.length ? keepFromWinner.join(', ') : 'all current winner strengths unless contradicted by causal evidence'}.`,
    `Import from ${loserAB} only where audited superior: ${importFromLoser.length ? importFromLoser.join(', ') : 'no mandatory imports; preserve winner baseline'}.`,
    `Weakness closure priority on ${winnerAB}: ${weakWinner.length ? weakWinner.join(', ') : 'none identified'}.`,
    `Novelty control: do not merge or paraphrase A/B prompt text; generate a new instruction plan from audit evidence only.`,
    `Conflict rule: when directives conflict, preserve identity/compliance and choose the option with stronger in-frame causal realism.`,
  ];

  if (concept?.name) charterLines.push(`Concept lock: maintain concept identity for "${concept.name}" with unchanged narrative intent.`);
  if (goalLearn.length) charterLines.push(`Goal-conditioned hints: ${goalLearn.join(' | ')}`);
  charterLines.push(
    `Loser guardrail: avoid importing any ${loserAB} trait that lowers identity below ${IDENTITY_GUARDRAIL.toFixed(2)} or compliance below ${COMPLIANCE_GUARDRAIL.toFixed(2)}.`
  );
  return charterLines.map((line, idx) => `- CH${idx + 1}: ${line}`).join('\n');
}

function deriveStrategyCLessons(scoreA, scoreB, baseLessons = [], options = {}) {
  const winnerAB = scoreA.overall >= scoreB.overall ? 'A' : 'B';
  const loserAB = winnerAB === 'A' ? 'B' : 'A';
  const winnerScore = winnerAB === 'A' ? scoreA : scoreB;
  const deepAudit = options?.deepAudit || null;
  const concept = options?.concept || null;
  const variation = options?.variation || null;
  const overallDelta = Math.abs((Number(scoreA?.overall) || 0) - (Number(scoreB?.overall) || 0));

  const auditMetrics = Array.isArray(deepAudit?.metrics) && deepAudit.metrics.length
    ? deepAudit.metrics.map(m => ({
      ...m,
      key: String(m?.key || '').trim(),
      absDelta: Number.isFinite(Number(m?.absDelta))
        ? Number(m.absDelta)
        : Math.abs(Number(m?.delta) || 0),
    }))
    : C_GOAL_METRIC_ORDER.map(key => {
      const a = metricValue(scoreA, key);
      const b = metricValue(scoreB, key);
      const delta = a - b;
      return {
        key,
        a,
        b,
        delta,
        absDelta: Math.abs(delta),
        leader: delta >= 0 ? 'A' : 'B',
      };
    });

  const winnerLeadMetrics = auditMetrics
    .filter(m => normalizeApproach(m?.leader, 'A') === winnerAB && Number(m?.absDelta) >= 0.25)
    .sort((x, y) => (Number(y?.absDelta) || 0) - (Number(x?.absDelta) || 0))
    .slice(0, 3);
  const loserLeadMetrics = auditMetrics
    .filter(m => normalizeApproach(m?.leader, 'A') === loserAB && Number(m?.absDelta) >= 0.20)
    .sort((x, y) => (Number(y?.absDelta) || 0) - (Number(x?.absDelta) || 0))
    .slice(0, 3);
  const weakWinnerMetrics = C_GOAL_METRIC_ORDER
    .map(key => ({ key, value: metricValue(winnerScore, key) }))
    .sort((a, b) => a.value - b.value)
    .slice(0, 3);
  const deconstructionLessons = deconstructABComparisonFirstPrinciples(scoreA, scoreB, deepAudit);

  const lessons = [
    ...deconstructionLessons,
    `C mandate: A/B share one outcome goal; C must preserve that same goal while changing only method.`,
    'C mandate: write a new audit-derived instruction plan; do not copy/paraphrase A or B prompt text.',
    `C mandate: target >= ${TARGET_QUALITY_GAIN_PCT.toFixed(1)}% headroom gain over best(A,B); if uncertain, prefer deterministic realism gains over stylistic novelty.`,
    `C first-principles scaffold: start from ${winnerAB} because it leads overall quality and preserves identity/compliance stability.`,
    `C assumption test: do not merge A/B globally. Merge only traits with measurable metric advantage and visible in-frame causal evidence.`,
    `C hard objective: maximize deterministic lift over best(A,B) while preserving exact identity topology, plausible anatomy, and compliance-safe framing.`,
    `C Pass A plan: lock ${winnerAB} macro composition and event hierarchy first; reject any change that alters framing or subject identity.`,
    `C Pass B plan: import only validated micro-gains from ${loserAB} (optics/seam/contact/sensor) where ${loserAB} has audited lead.`,
    'C conflict rule: if A/B directives conflict, keep the option with stronger causal realism and guardrail safety, not stylistic intensity.',
  ];

  if (concept?.name) {
    lessons.push(`C narrative anchor: keep "${concept.name}" as one premium hero moment with one dominant spectacle cue and one restrained support cue.`);
  }
  if (variation?.motif?.name) {
    lessons.push(`C event motif anchor: preserve ${variation.motif.name} as the dominant spectacle signal while keeping subject prominence first.`);
  }
  lessons.push(
    'C audience-readability rule: keep one instantly legible focal beat (silhouette/light/reflection) that parses within a one-second glance without sacrificing realism.'
  );
  lessons.push(
    'C production-feasibility rule: cap spectacle to one dominant driver plus one support effect; reject stacked effects that break physical plausibility.'
  );

  for (const m of winnerLeadMetrics) {
    const key = String(m?.key || '').trim();
    if (!METRIC_GAP_DIRECTIVES[key]) continue;
    lessons.push(
      `C keep-${winnerAB} advantage (${C_GOAL_METRIC_LABEL[key] || key}, Δ=${Number(m.absDelta || 0).toFixed(2)}): retain ${winnerAB} baseline behavior.`
    );
  }
  for (const m of loserLeadMetrics) {
    const key = String(m?.key || '').trim();
    if (!METRIC_GAP_DIRECTIVES[key]) continue;
    lessons.push(
      `C import-from-${loserAB} (${C_GOAL_METRIC_LABEL[key] || key}, Δ=${Number(m.absDelta || 0).toFixed(2)}): ${METRIC_GAP_DIRECTIVES[key]}`
    );
  }
  for (const m of weakWinnerMetrics) {
    if (m.value <= 9.6 && METRIC_GAP_DIRECTIVES[m.key]) {
      lessons.push(`C close-${winnerAB}-weakness (${C_GOAL_METRIC_LABEL[m.key] || m.key}=${m.value.toFixed(2)}): ${METRIC_GAP_DIRECTIVES[m.key]}`);
    }
  }

  if (overallDelta < 0.2) {
    lessons.push(
      'A/B are near-tied: reduce stylistic exploration, increase audit strictness, and prioritize physics/compliance gains that are provable in-frame.'
    );
  } else {
    lessons.push(
      `A/B separation is meaningful (Δ=${overallDelta.toFixed(2)}): preserve ${winnerAB} backbone and use ${loserAB} only as targeted micro-upgrade source.`
    );
  }

  const gapLessons = deriveMetricGapLessons(scoreA, scoreB);
  const maxLessons = Math.max(6, parseInt(options?.maxLessons || C_STRATEGY_LESSON_MAX, 10));
  const cCoreLessons = normalizeLessons([...lessons, ...gapLessons], Math.max(maxLessons * 3, 30));
  return mergeLessonsByPriority(cCoreLessons, baseLessons, maxLessons);
}

function deriveABCIterationHints(scoreA, scoreB, scoreC) {
  const hints = [];
  const bestAB = Math.max(scoreA.overall, scoreB.overall);
  const cGain = scoreC.overall - bestAB;
  if (cGain > 0.25) {
    hints.push('Approach C fusion is outperforming; increase C weighting in future batches.');
  } else if (cGain < -0.25) {
    hints.push('Approach C fusion is underperforming; reduce lesson count and prioritize top 3 directives only.');
  } else {
    hints.push('Approach C is close to A/B; keep fusion but tighten lesson specificity and conflict resolution.');
  }

  if (metricValue(scoreC, 'identity_score') < Math.max(metricValue(scoreA, 'identity_score'), metricValue(scoreB, 'identity_score')) - 0.4) {
    hints.push('Approach C: strengthen identity lock in both passes before micro-detail optimization.');
  }
  if (metricValue(scoreC, 'garment_physics_score') < Math.max(metricValue(scoreA, 'garment_physics_score'), metricValue(scoreB, 'garment_physics_score')) - 0.4) {
    hints.push('Approach C: add stronger seam/load-path constraints and wet-state tension checks.');
  }
  if (metricValue(scoreC, 'compliance_score') < Math.max(metricValue(scoreA, 'compliance_score'), metricValue(scoreB, 'compliance_score')) - 0.4) {
    hints.push('Approach C: trim directional intensity language to protect compliance score.');
  }
  return normalizeLessons(hints, 8);
}

function deriveFinalBoostLessons(winnerScore, challengerScore) {
  const lessons = [
    'Final boost objective: maximize deterministic quality gain while preserving exact framing, identity, and compliance.',
    'Do not alter composition; improve only physically causal micro-detail and optical consistency.',
  ];
  for (const key of Object.keys(METRIC_GAP_DIRECTIVES)) {
    const w = metricValue(winnerScore, key);
    const c = metricValue(challengerScore, key);
    if (w + 0.15 < c) {
      lessons.push(`Final boost (${key}): ${METRIC_GAP_DIRECTIVES[key]}`);
    } else if (w < 9.7) {
      lessons.push(`Final polish (${key}): ${METRIC_GAP_DIRECTIVES[key]}`);
    }
  }
  return normalizeLessons(lessons, LESSON_MAX_PER_PROMPT + 4);
}

function bestChallengerForFinalBoost(winnerApproach, scoreByApproach) {
  const ranked = STRATEGY_KEYS
    .filter(key => key !== winnerApproach)
    .map(key => ({ key, score: scoreByApproach?.[key] }))
    .filter(item => Number.isFinite(Number(item?.score?.overall)))
    .sort((a, b) => (Number(b?.score?.overall) || 0) - (Number(a?.score?.overall) || 0));
  if (ranked.length > 0) return ranked[0];
  return { key: winnerApproach, score: scoreByApproach?.[winnerApproach] };
}

function finalBoostRoundsFromShortfall(preFinalMultiplier, targetMultiplier, baseRounds = FINAL_AUDIT_BOOST_ROUNDS_MAX) {
  const shortfall = Math.max(0, (Number(targetMultiplier) || 0) - (Number(preFinalMultiplier) || 0));
  const extraRounds = Math.min(
    FINAL_AUDIT_SHORTFALL_EXTRA_ROUNDS_MAX,
    Math.ceil(shortfall / Math.max(0.01, FINAL_AUDIT_SHORTFALL_STEP))
  );
  return {
    shortfall,
    extra_rounds: Math.max(0, Number(extraRounds) || 0),
    max_rounds: Math.max(0, Number(baseRounds) || 0) + Math.max(0, Number(extraRounds) || 0),
  };
}

function phasedCRescueRoundsFromHeadroomShortfall(
  headroomGainPct,
  targetPct,
  baseRounds = PHASED_C_RESCUE_BASE_ROUNDS
) {
  const shortfallPct = Math.max(0, (Number(targetPct) || 0) - (Number(headroomGainPct) || 0));
  const extraRounds = Math.min(
    PHASED_C_RESCUE_EXTRA_ROUNDS_MAX,
    Math.ceil(shortfallPct / Math.max(1, PHASED_C_RESCUE_SHORTFALL_STEP_PCT))
  );
  return {
    shortfall_pct: shortfallPct,
    extra_rounds: Math.max(0, Number(extraRounds) || 0),
    max_rounds: Math.max(0, Number(baseRounds) || 0) + Math.max(0, Number(extraRounds) || 0),
  };
}

function deriveFinalBoostCrossChallengerLessons(winnerApproach, winnerScore, scoreByApproach) {
  const lessons = [];
  const leaders = {};
  for (const metricKey of Object.keys(METRIC_GAP_DIRECTIVES)) {
    let leaderApproach = winnerApproach;
    let leaderValue = metricValue(winnerScore, metricKey);
    for (const key of STRATEGY_KEYS) {
      if (key === winnerApproach) continue;
      const value = metricValue(scoreByApproach?.[key], metricKey);
      if (value > leaderValue) {
        leaderApproach = key;
        leaderValue = value;
      }
    }
    leaders[metricKey] = { approach: leaderApproach, score: leaderValue };
    const winnerValue = metricValue(winnerScore, metricKey);
    if (leaderApproach !== winnerApproach && winnerValue + 0.15 < leaderValue) {
      lessons.push(
        `Metric chase (${metricKey}): close ${leaderApproach} lead while preserving ${winnerApproach} identity/compliance lock. ` +
        `${METRIC_GAP_DIRECTIVES[metricKey]}`
      );
    }
  }
  return {
    lessons: normalizeLessons(lessons, LESSON_MAX_PER_PROMPT + 4),
    leaders,
  };
}

function extractHistoricalLessons(summary, records) {
  const ranked = weightedHistoricalLessons(summary, records);
  if (ranked.length) return normalizeLessons(ranked, LESSON_MAX_PER_PROMPT);
  const fromSummary = [
    ...(summary?.top_lessons || []).map(x => x?.lesson || x?.hint || ''),
    ...(summary?.top_hints || []).map(x => x?.hint || ''),
  ];
  const fromRecent = (records || [])
    .slice(Math.max(0, (records || []).length - 10))
    .flatMap(r => [...(r?.lessons?.all || []), ...(r?.hints || [])]);
  return normalizeLessons([...fromSummary, ...fromRecent], LESSON_MAX_PER_PROMPT);
}

function normalizeAuditSummary(records) {
  const emptyMetrics = () => ({
    identity: 0,
    anatomy: 0,
    garment_physics: 0,
    optics: 0,
    realism: 0,
    compliance: 0,
    composition: 0,
    lighting_intent: 0,
    editorial_consistency: 0,
  });
  const empty = {
    concepts: 0,
    wins: Object.fromEntries(STRATEGY_KEYS.map(k => [k, 0])),
    strategy_counts: Object.fromEntries(STRATEGY_KEYS.map(k => [k, 0])),
    avg_overall: Object.fromEntries(STRATEGY_KEYS.map(k => [k, 0])),
    avg_metrics: Object.fromEntries(STRATEGY_KEYS.map(k => [k, emptyMetrics()])),
    c_gain_percent_vs_best_ab: {
      avg: 0,
      max: 0,
      min: 0,
      target: TARGET_QUALITY_GAIN_PCT,
      target_hit_count: 0,
    },
    profile_performance: Object.fromEntries(STRATEGY_KEYS.map(k => [k, {}])),
    top_hints: [],
    top_lessons: [],
  };
  if (!records.length) return empty;

  const sums = Object.fromEntries(STRATEGY_KEYS.map(k => [k, { overall: 0, ...emptyMetrics() }]));
  const hintCounts = new Map();
  const lessonCounts = new Map();
  const cGains = [];

  for (const r of records) {
    const winner = normalizeApproach(r?.winner?.approach, 'A');
    empty.wins[winner] += 1;

    for (const key of STRATEGY_KEYS) {
      const score = r?.strategies?.[key]?.score;
      if (!score || !Number.isFinite(Number(score.overall))) continue;
      empty.strategy_counts[key] += 1;
      sums[key].overall += Number(score.overall) || 0;
      sums[key].identity += metricValue(score, 'identity_score');
      sums[key].anatomy += metricValue(score, 'anatomy_score');
      sums[key].garment_physics += metricValue(score, 'garment_physics_score');
      sums[key].optics += metricValue(score, 'optics_score');
      sums[key].realism += metricValue(score, 'realism_score');
      sums[key].compliance += metricValue(score, 'compliance_score');
      sums[key].composition += metricValue(score, 'composition_score');
      sums[key].lighting_intent += metricValue(score, 'lighting_intent_score');
      sums[key].editorial_consistency += metricValue(score, 'editorial_consistency_score');

      const profileKey = normalizeFrontierProfile(r?.strategies?.[key]?.passA_profile || '');
      if (!empty.profile_performance[key][profileKey]) {
        empty.profile_performance[key][profileKey] = { count: 0, wins: 0, sum_overall: 0, avg_overall: 0, win_rate: 0 };
      }
      const profileStats = empty.profile_performance[key][profileKey];
      profileStats.count += 1;
      profileStats.sum_overall += Number(score.overall) || 0;
      if (winner === key) profileStats.wins += 1;
    }

    for (const hint of normalizeLessons(r?.hints || [], 20)) {
      hintCounts.set(hint, (hintCounts.get(hint) || 0) + 1);
    }
    for (const lesson of normalizeLessons(r?.lessons?.all || [], 30)) {
      lessonCounts.set(lesson, (lessonCounts.get(lesson) || 0) + 1);
    }

    const cGain = Number.isFinite(Number(r?.comparisons?.c_headroom_gain_percent_vs_best_ab))
      ? Number(r?.comparisons?.c_headroom_gain_percent_vs_best_ab)
      : Number(r?.comparisons?.c_gain_percent_vs_best_ab);
    if (Number.isFinite(cGain)) cGains.push(cGain);
  }

  empty.concepts = records.length;
  for (const key of STRATEGY_KEYS) {
    const n = empty.strategy_counts[key];
    if (!n) continue;
    empty.avg_overall[key] = sums[key].overall / n;
    empty.avg_metrics[key].identity = sums[key].identity / n;
    empty.avg_metrics[key].anatomy = sums[key].anatomy / n;
    empty.avg_metrics[key].garment_physics = sums[key].garment_physics / n;
    empty.avg_metrics[key].optics = sums[key].optics / n;
    empty.avg_metrics[key].realism = sums[key].realism / n;
    empty.avg_metrics[key].compliance = sums[key].compliance / n;
    empty.avg_metrics[key].composition = sums[key].composition / n;
    empty.avg_metrics[key].lighting_intent = sums[key].lighting_intent / n;
    empty.avg_metrics[key].editorial_consistency = sums[key].editorial_consistency / n;

    for (const profile of Object.keys(empty.profile_performance[key])) {
      const stats = empty.profile_performance[key][profile];
      if (!stats.count) continue;
      stats.avg_overall = stats.sum_overall / stats.count;
      stats.win_rate = stats.wins / stats.count;
      delete stats.sum_overall;
    }
  }

  if (cGains.length) {
    const total = cGains.reduce((acc, n) => acc + n, 0);
    empty.c_gain_percent_vs_best_ab.avg = total / cGains.length;
    empty.c_gain_percent_vs_best_ab.max = Math.max(...cGains);
    empty.c_gain_percent_vs_best_ab.min = Math.min(...cGains);
    empty.c_gain_percent_vs_best_ab.target_hit_count = cGains.filter(v => v >= TARGET_QUALITY_GAIN_PCT).length;
  }

  empty.top_hints = [...hintCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([hint, count]) => ({ hint, count }));

  empty.top_lessons = [...lessonCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([lesson, count]) => ({ lesson, count }));

  return empty;
}

async function runDualStrategyConcept(concept, inputImage, index) {
  const expression = expressions[index % expressions.length];
  const inputMimeType = mimeTypeFromPath(inputImage);
  const inputB64 = (await fs.readFile(inputImage)).toString('base64');
  let historicalRecords = await loadAuditRecords();
  let historicalSummary = normalizeAuditSummary(historicalRecords);
  let historicalLessons = extractHistoricalLessons(historicalSummary, historicalRecords);
  const hardeningLevel = currentHardeningLevel();
  let effectiveABRounds = Math.max(1, AB_ITERATION_ROUNDS_MAX + Math.min(HARDEN_MAX_EXTRA_ROUNDS, hardeningLevel));
  let effectiveSelfRounds = Math.max(0, APPROACH_SELF_ITERATION_ROUNDS_MAX + Math.min(HARDEN_MAX_EXTRA_SELF_ROUNDS, hardeningLevel));
  let effectiveCSelfRounds = Math.max(0, C_SELF_ITERATION_ROUNDS_MAX + Math.min(HARDEN_MAX_EXTRA_SELF_ROUNDS, hardeningLevel));
  let effectiveFinalAuditBaseRounds = Math.max(0, FINAL_AUDIT_BOOST_ROUNDS_MAX + Math.min(HARDEN_MAX_EXTRA_ROUNDS, hardeningLevel));
  let effectiveLastPassRedoRounds = Math.max(0, LAST_PASS_REDO_ROUNDS_MAX + Math.min(HARDEN_MAX_EXTRA_LAST_PASS_ROUNDS, hardeningLevel));
  let effectivePhase2Variants = effectivePhase2VariantsPerRound();
  let qualityEscalationLevel = 0;
  const qualityEscalationReasons = [];

  console.log(`\n${'='.repeat(60)}`);
  console.log(`[${index + 1}/20] MULTI STRATEGY A/B/C ${concept.name}`);
  console.log(`${'='.repeat(60)}`);
  if (HAIL_MARY_MODE) {
    console.log('HAIL MARY MODE: ON (all attempts prioritize breakthrough gains under hard safety/identity locks).');
  }
  if (historicalLessons.length) {
    console.log(`Historical lessons loaded (${historicalLessons.length}):`);
    historicalLessons.slice(0, 5).forEach((l, idx2) => console.log(`  ${idx2 + 1}. ${l}`));
  }
  console.log(
    `ITERATION HARDENING: attempt=${CURRENT_CONCEPT_ATTEMPT}/${CURRENT_CONCEPT_MAX_ATTEMPTS} level=${hardeningLevel} ` +
    `phase2_variants=${effectivePhase2Variants} self_rounds=${effectiveSelfRounds} c_self_rounds=${effectiveCSelfRounds} ` +
    `ab_rounds=${effectiveABRounds} final_audit_base=${effectiveFinalAuditBaseRounds} last_pass_rounds=${effectiveLastPassRedoRounds}`
  );

  const profileOrderA = buildApproachProfileOrder('A', historicalRecords);
  const profileOrderB = buildApproachProfileOrder('B', historicalRecords);
  const profileOrderCBase = buildApproachProfileOrder('C', historicalRecords);
  const sharedVariation = LOCK_AB_VARIATION ? buildVariation() : null;
  const variationForA = sharedVariation || buildVariation();
  const variationForB = sharedVariation || buildVariation();
  const variationForC = (LOCK_C_VARIATION_TO_AB && sharedVariation) ? sharedVariation : buildVariation();
  const cacheAwareWaitSeconds = items => {
    const reused = (items || []).some(item => {
      if (!item) return false;
      if (item.reusedCachedPassA === true) return true;
      if (String(item.profileUsed || '').includes('cached')) return true;
      if (Array.isArray(item.attemptLog)) {
        return item.attemptLog.some(a => String(a?.status || '').includes('reused_cached'));
      }
      return false;
    });
    return reused ? Math.min(RETRY_WAIT_S, CACHE_REUSE_WAIT_S) : RETRY_WAIT_S;
  };
  if (sharedVariation) {
    console.log(`Controlled variation lock (A/B): ${variationFingerprint(sharedVariation)}`);
    if (LOCK_C_VARIATION_TO_AB) {
      console.log('Controlled variation lock (C): reusing A/B variation for fair fusion comparison.');
    }
  }

  const passA_A = (await loadResumePassAFrontier({
    concept,
    inputImage,
    index,
    approach: 'A',
    lessons: historicalLessons,
    profileOrder: profileOrderA,
    variation: variationForA,
  })) || await generatePassAFrontier(concept, inputImage, index, 'A', {
    lessons: historicalLessons,
    profileOrder: profileOrderA,
    variation: variationForA,
  });
  const waitAfterPassAA = cacheAwareWaitSeconds([passA_A]);
  console.log(`Waiting ${waitAfterPassAA}s between strategy A passes...`);
  await waitWithHeartbeat(waitAfterPassAA, 'between strategy A passes');
  const finalA_baseline = (await loadResumeFinalFrontier({
    concept,
    approach: 'A',
    profileHint: passA_A.frontierProfile,
    inputImage,
    lessons: historicalLessons,
  })) || await generatePassBFrontier(concept, passA_A, inputImage, index, 'A', {
    lessons: historicalLessons,
    enableAggressiveBoundary: false,
  });

  const waitBeforeStrategyB = cacheAwareWaitSeconds([passA_A, finalA_baseline]);
  console.log(`Waiting ${waitBeforeStrategyB}s before strategy B...`);
  await waitWithHeartbeat(waitBeforeStrategyB, 'before strategy B');
  const passA_B = (await loadResumePassAFrontier({
    concept,
    inputImage,
    index,
    approach: 'B',
    lessons: historicalLessons,
    profileOrder: profileOrderB,
    variation: variationForB,
  })) || await generatePassAFrontier(concept, inputImage, index, 'B', {
    lessons: historicalLessons,
    profileOrder: profileOrderB,
    variation: variationForB,
  });
  const waitAfterPassAB = cacheAwareWaitSeconds([passA_B]);
  console.log(`Waiting ${waitAfterPassAB}s between strategy B passes...`);
  await waitWithHeartbeat(waitAfterPassAB, 'between strategy B passes');
  const finalB_baseline = (await loadResumeFinalFrontier({
    concept,
    approach: 'B',
    profileHint: passA_B.frontierProfile,
    inputImage,
    lessons: historicalLessons,
  })) || await generatePassBFrontier(concept, passA_B, inputImage, index, 'B', {
    lessons: historicalLessons,
    enableAggressiveBoundary: false,
  });

  const baselineAPath = finalA_baseline.path;
  const baselineBPath = finalB_baseline.path;
  const baselineAB64 = (await fs.readFile(baselineAPath)).toString('base64');
  const baselineBB64 = (await fs.readFile(baselineBPath)).toString('base64');
  const baselineAMime = mimeTypeFromPath(baselineAPath);
  const baselineBMime = mimeTypeFromPath(baselineBPath);

  const scoreA_baseline = await scoreFrontierCandidate({
    referenceMimeType: inputMimeType,
    referenceB64: inputB64,
    candidateMimeType: baselineAMime,
    candidateB64: baselineAB64,
    concept,
    expression,
    profile: `A-baseline/${passA_A.frontierProfile}/${finalA_baseline.profileUsed}`,
  });
  const scoreB_baseline = await scoreFrontierCandidate({
    referenceMimeType: inputMimeType,
    referenceB64: inputB64,
    candidateMimeType: baselineBMime,
    candidateB64: baselineBB64,
    concept,
    expression,
    profile: `B-baseline/${passA_B.frontierProfile}/${finalB_baseline.profileUsed}`,
  });

  if (QUALITY_ESCALATION_ENABLE && QUALITY_ESCALATION_MAX_EXTRA_ROUNDS > 0) {
    const baselineMax = Math.max(Number(scoreA_baseline?.overall) || 0, Number(scoreB_baseline?.overall) || 0);
    const baselineDelta = Math.abs((Number(scoreA_baseline?.overall) || 0) - (Number(scoreB_baseline?.overall) || 0));
    const underTarget = baselineMax < QUALITY_ESCALATION_SCORE_TRIGGER;
    const nearTie = baselineDelta <= QUALITY_ESCALATION_TIE_TRIGGER;
    const rateLimitConstrained = GLOBAL_RATE_LIMIT_STREAK >= RATE_LIMIT_PROFILE_NARROW_STREAK;

    if (!rateLimitConstrained) {
      if (underTarget) qualityEscalationReasons.push(`baseline_max ${baselineMax.toFixed(2)} < trigger ${QUALITY_ESCALATION_SCORE_TRIGGER.toFixed(2)}`);
      if (nearTie) qualityEscalationReasons.push(`baseline_delta ${baselineDelta.toFixed(2)} <= tie_trigger ${QUALITY_ESCALATION_TIE_TRIGGER.toFixed(2)}`);
      qualityEscalationLevel = Math.min(
        QUALITY_ESCALATION_MAX_EXTRA_ROUNDS,
        qualityEscalationReasons.length
      );
      if (qualityEscalationLevel > 0) {
        effectiveABRounds += qualityEscalationLevel;
        effectiveSelfRounds += Math.min(qualityEscalationLevel, 2);
        effectiveCSelfRounds += Math.min(qualityEscalationLevel, 1);
        effectiveFinalAuditBaseRounds += qualityEscalationLevel;
        effectiveLastPassRedoRounds += qualityEscalationLevel;
        effectivePhase2Variants += Math.min(QUALITY_ESCALATION_MAX_EXTRA_VARIANTS, qualityEscalationLevel);
        console.log(
          `QUALITY ESCALATION: level=${qualityEscalationLevel} reasons=${qualityEscalationReasons.join(' | ')} ` +
          `=> phase2_variants=${effectivePhase2Variants} self_rounds=${effectiveSelfRounds} ` +
          `c_self_rounds=${effectiveCSelfRounds} ab_rounds=${effectiveABRounds} ` +
          `final_audit_base=${effectiveFinalAuditBaseRounds} last_pass_rounds=${effectiveLastPassRedoRounds}`
        );
      }
    } else {
      console.log(
        `QUALITY ESCALATION SKIPPED: rate-limit pressure streak=${GLOBAL_RATE_LIMIT_STREAK} ` +
        `>= narrow_threshold=${RATE_LIMIT_PROFILE_NARROW_STREAK}`
      );
    }
  }

  const selfIterA = await runApproachSelfIteration({
    concept,
    index,
    variation: passA_A.variation,
    approachKey: 'A',
    profileTag: finalA_baseline.profileUsed,
    path: baselineAPath,
    score: scoreA_baseline,
    historicalLessons,
    referencePath: inputImage,
    referenceMimeType: inputMimeType,
    referenceB64: inputB64,
    maxRounds: effectiveSelfRounds,
  });
  const selfIterB = await runApproachSelfIteration({
    concept,
    index,
    variation: passA_B.variation,
    approachKey: 'B',
    profileTag: finalB_baseline.profileUsed,
    path: baselineBPath,
    score: scoreB_baseline,
    historicalLessons,
    referencePath: inputImage,
    referenceMimeType: inputMimeType,
    referenceB64: inputB64,
    maxRounds: effectiveSelfRounds,
  });

  let currentAPath = selfIterA.path;
  let currentBPath = selfIterB.path;
  let scoreA = selfIterA.score;
  let scoreB = selfIterB.score;
  let profileTagA = selfIterA.profileTag;
  let profileTagB = selfIterB.profileTag;
  let phase2LessonsA = selfIterA.lessonsLast || normalizeLessons(historicalLessons, LESSON_MAX_PER_PROMPT);
  let phase2LessonsB = selfIterB.lessonsLast || normalizeLessons(historicalLessons, LESSON_MAX_PER_PROMPT);
  const phase2RoundsA = (selfIterA.rounds || []).map(r => ({ stage: 'self', ...r }));
  const phase2RoundsB = (selfIterB.rounds || []).map(r => ({ stage: 'self', ...r }));

  const baselineHints = deriveABIterationHints(scoreA, scoreB);
  let deepAudit = deepAuditABBaseline(scoreA, scoreB);
  console.log('DEEP A/B BASELINE AUDIT:');
  deepAudit.lines.slice(0, 6).forEach((line, idx2) => console.log(`  ${idx2 + 1}. ${line}`));
  const abIterationRounds = [];

  for (let round = 1; round <= effectiveABRounds; round++) {
    const roundHints = deriveABIterationHints(scoreA, scoreB);
    deepAudit = deepAuditABBaseline(scoreA, scoreB);
    phase2LessonsA = normalizeLessons(
      [...historicalLessons, ...baselineHints, ...roundHints, ...deepAudit.lessonsA, ...deepAudit.sharedLessons],
      LESSON_MAX_PER_PROMPT
    );
    phase2LessonsB = normalizeLessons(
      [...historicalLessons, ...baselineHints, ...roundHints, ...deepAudit.lessonsB, ...deepAudit.sharedLessons],
      LESSON_MAX_PER_PROMPT
    );

    const prevA = scoreA;
    const prevB = scoreB;

    const backupAPath = `${currentAPath}.round-${round}.bak`;
    const backupBPath = `${currentBPath}.round-${round}.bak`;
    await fs.copyFile(currentAPath, backupAPath);
    await fs.copyFile(currentBPath, backupBPath);

    const phase2A = await runPhase2BoundaryRefinement({
      concept,
      index,
      variation: passA_A.variation,
      approachKey: 'A',
      profile: profileTagA,
      baselinePath: currentAPath,
      lessons: phase2LessonsA,
      referencePath: inputImage,
      referenceMimeType: inputMimeType,
      referenceB64: inputB64,
      previousScore: prevA,
    });
    const phase2B = await runPhase2BoundaryRefinement({
      concept,
      index,
      variation: passA_B.variation,
      approachKey: 'B',
      profile: profileTagB,
      baselinePath: currentBPath,
      lessons: phase2LessonsB,
      referencePath: inputImage,
      referenceMimeType: inputMimeType,
      referenceB64: inputB64,
      previousScore: prevB,
    });

    let scoreA_candidate = prevA;
    let scoreB_candidate = prevB;
    if (phase2A.applied) {
      if (Number.isFinite(Number(phase2A?.score?.overall))) {
        scoreA_candidate = phase2A.score;
      } else {
        const aB64 = (await fs.readFile(currentAPath)).toString('base64');
        scoreA_candidate = await scoreFrontierCandidate({
          referenceMimeType: inputMimeType,
          referenceB64: inputB64,
          candidateMimeType: mimeTypeFromPath(currentAPath),
          candidateB64: aB64,
          concept,
          expression,
          profile: `A-round${round}/${passA_A.frontierProfile}/${phase2A.profileUsed || profileTagA}`,
        });
      }
    }
    if (phase2B.applied) {
      if (Number.isFinite(Number(phase2B?.score?.overall))) {
        scoreB_candidate = phase2B.score;
      } else {
        const bB64 = (await fs.readFile(currentBPath)).toString('base64');
        scoreB_candidate = await scoreFrontierCandidate({
          referenceMimeType: inputMimeType,
          referenceB64: inputB64,
          candidateMimeType: mimeTypeFromPath(currentBPath),
          candidateB64: bB64,
          concept,
          expression,
          profile: `B-round${round}/${passA_B.frontierProfile}/${phase2B.profileUsed || profileTagB}`,
        });
      }
    }

    const evalA = evaluateIterationCandidate(scoreA_candidate, prevA);
    const evalB = evaluateIterationCandidate(scoreB_candidate, prevB);

    let acceptedA = true;
    let acceptedB = true;
    if (!evalA.acceptable) {
      await fs.copyFile(backupAPath, currentAPath);
      scoreA_candidate = prevA;
      acceptedA = false;
    }
    if (!evalB.acceptable) {
      await fs.copyFile(backupBPath, currentBPath);
      scoreB_candidate = prevB;
      acceptedB = false;
    }

    await fs.unlink(backupAPath).catch(() => {});
    await fs.unlink(backupBPath).catch(() => {});

    scoreA = scoreA_candidate;
    scoreB = scoreB_candidate;
    if (acceptedA && phase2A.applied && phase2A.profileUsed) profileTagA = phase2A.profileUsed;
    if (acceptedB && phase2B.applied && phase2B.profileUsed) profileTagB = phase2B.profileUsed;

    const gainA = scoreA.overall - prevA.overall;
    const gainB = scoreB.overall - prevB.overall;
    const roundRecordA = {
      stage: 'cross',
      round,
      ...phase2A,
      accepted: acceptedA,
      gain: gainA,
      score_before: prevA.overall,
      score_after: scoreA.overall,
      candidate_eval: evalA,
    };
    const roundRecordB = {
      stage: 'cross',
      round,
      ...phase2B,
      accepted: acceptedB,
      gain: gainB,
      score_before: prevB.overall,
      score_after: scoreB.overall,
      candidate_eval: evalB,
    };
    phase2RoundsA.push(roundRecordA);
    phase2RoundsB.push(roundRecordB);
    abIterationRounds.push({
      round,
      gain_A: gainA,
      gain_B: gainB,
      score_A: scoreA.overall,
      score_B: scoreB.overall,
      accepted_A: acceptedA,
      accepted_B: acceptedB,
    });

    console.log(`AB ITER ROUND ${round}: A ${prevA.overall.toFixed(2)} -> ${scoreA.overall.toFixed(2)} (gain ${gainA.toFixed(2)}), B ${prevB.overall.toFixed(2)} -> ${scoreB.overall.toFixed(2)} (gain ${gainB.toFixed(2)})`);

    if (Math.max(gainA, gainB) < AB_ITERATION_MIN_GAIN) {
      console.log(`AB ITER STOP: max gain ${Math.max(gainA, gainB).toFixed(2)} < threshold ${AB_ITERATION_MIN_GAIN.toFixed(2)}.`);
      break;
    }
  }

  let finalAPath = currentAPath;
  let finalBPath = currentBPath;
  deepAudit = deepAuditABBaseline(scoreA, scoreB);

  const abHints = deriveABIterationHints(scoreA, scoreB);
  const goalConditionedCLearning = deriveGoalConditionedCLessons(
    historicalRecords,
    scoreA,
    scoreB,
    deepAudit,
    {
      maxLessons: 6,
      avoidMax: 4,
    }
  );
  let strategyCLessons = deriveStrategyCLessons(
    scoreA,
    scoreB,
    [
      ...historicalLessons,
      ...baselineHints,
      ...deepAudit.sharedLessons,
      ...abHints,
      ...goalConditionedCLearning.priority_lessons,
    ],
    {
      deepAudit,
      concept,
      variation: variationForC,
      maxLessons: goalConditionedCLearning.adaptive_max_lessons,
    }
  );
  strategyCLessons = pruneLowYieldCLessons(
    strategyCLessons,
    goalConditionedCLearning.avoid_lessons,
    Math.max(6, Math.min(goalConditionedCLearning.adaptive_max_lessons, C_STRATEGY_LESSON_MAX))
  );
  console.log('C PROMPT SYNTHESIS (A/B audit -> first-principles fusion):');
  strategyCLessons.slice(0, 6).forEach((lesson, idx2) => console.log(`  C${idx2 + 1}. ${lesson}`));
  if (goalConditionedCLearning.matched_records > 0) {
    console.log(
      `C GOAL LEARNING: matched=${goalConditionedCLearning.matched_records} ` +
      `positive=${goalConditionedCLearning.positive_cases} negative=${goalConditionedCLearning.negative_cases} ` +
      `adaptive_max=${goalConditionedCLearning.adaptive_max_lessons}`
    );
  }
  const cPreferredProfiles = C_PROFILE_FOLLOW_AB
    ? [passA_A.frontierProfile, passA_B.frontierProfile]
    : [];
  const profileOrderC = prioritizeProfiles(profileOrderCBase, cPreferredProfiles);
  console.log(`C PROFILE ORDER: ${profileOrderC.join(', ')} (follow_ab=${C_PROFILE_FOLLOW_AB ? 'on' : 'off'})`);

  console.log(`\n${'='.repeat(60)}`);
  console.log(`[${index + 1}/20] PASS C ${concept.name} (FUSION STRATEGY)`);
  console.log(`${'='.repeat(60)}`);
  const waitBeforeStrategyC = cacheAwareWaitSeconds([passA_A, finalA_baseline, passA_B, finalB_baseline]);
  console.log(`Waiting ${waitBeforeStrategyC}s before strategy C...`);
  await waitWithHeartbeat(waitBeforeStrategyC, 'before strategy C');
  const passA_C = await generatePassAFrontier(concept, inputImage, index, 'C', {
    lessons: strategyCLessons,
    profileOrder: profileOrderC,
    variation: variationForC,
  });
  const waitAfterPassAC = cacheAwareWaitSeconds([passA_C]);
  console.log(`Waiting ${waitAfterPassAC}s between strategy C passes...`);
  await waitWithHeartbeat(waitAfterPassAC, 'between strategy C passes');
  console.log(`PASS C baseline refinement: profile=${passA_C.frontierProfile}`);
  const finalC = await generatePassBFrontier(concept, passA_C, inputImage, index, 'C', {
    lessons: strategyCLessons,
    enableAggressiveBoundary: false,
  });

  const finalCBaselinePath = finalC.path;
  const finalCBaselineB64 = (await fs.readFile(finalCBaselinePath)).toString('base64');
  const finalCBaselineMime = mimeTypeFromPath(finalCBaselinePath);
  const scoreC_baseline = await scoreFrontierCandidate({
    referenceMimeType: inputMimeType,
    referenceB64: inputB64,
    candidateMimeType: finalCBaselineMime,
    candidateB64: finalCBaselineB64,
    concept,
    expression,
    profile: `C/${passA_C.frontierProfile}/${finalC.profileUsed}`,
  });
  const selfIterC = await runApproachSelfIteration({
    concept,
    index,
    variation: passA_C.variation,
    approachKey: 'C',
    profileTag: finalC.profileUsed,
    path: finalCBaselinePath,
    score: scoreC_baseline,
    historicalLessons: mergeLessonsByPriority(strategyCLessons, historicalLessons, LESSON_MAX_PER_PROMPT),
    referencePath: inputImage,
    referenceMimeType: inputMimeType,
    referenceB64: inputB64,
    maxRounds: effectiveCSelfRounds,
    minGain: C_SELF_MIN_GAIN,
  });
  let finalCPath = selfIterC.path;
  let scoreC = selfIterC.score;
  let profileTagC = selfIterC.profileTag;
  const phase2RoundsC = (selfIterC.rounds || []).map(r => ({ stage: 'self', ...r }));

  // Hard guard: if C identity drifts or C ends on passA-fallback, anchor C to the best A/B identity-stable artifact.
  const cPassAAttempts = Array.isArray(passA_C?.attemptLog) ? passA_C.attemptLog : [];
  const cUsedEmergencyPassA = cPassAAttempts.some(a =>
    String(a?.profile || '') === 'emergency'
    || String(a?.profile || '') === 'input-scaffold'
    || String(a?.status || '') === 'input_scaffold_fallback'
  );
  const cUsedPassAFallbackFinal = String(finalC?.profileUsed || '').includes('passA-fallback');
  const cIdentityScore = metricValue(scoreC, 'identity_score');
  const abBestIdentityScore = Math.max(
    metricValue(scoreA, 'identity_score'),
    metricValue(scoreB, 'identity_score')
  );
  let cFinalSourceClone = false;
  try {
    const [cFinalBuffer, sourceBuffer] = await Promise.all([
      fs.readFile(finalCPath),
      fs.readFile(inputImage),
    ]);
    cFinalSourceClone = isSourceCloneBuffer(cFinalBuffer, sourceBuffer);
  } catch {
    cFinalSourceClone = false;
  }
  const cIdentityRisk = (
    cIdentityScore + 0.35 < abBestIdentityScore
    || cIdentityScore < Math.max(8.0, IDENTITY_GUARDRAIL - 0.5)
  );
  const shouldAnchorCToAB = cUsedEmergencyPassA || cUsedPassAFallbackFinal || cIdentityRisk || cFinalSourceClone;
  if (shouldAnchorCToAB) {
    const anchorApproach = (Number(scoreA?.overall) || 0) >= (Number(scoreB?.overall) || 0) ? 'A' : 'B';
    const anchorPath = anchorApproach === 'A' ? finalAPath : finalBPath;
    const anchorScore = anchorApproach === 'A' ? scoreA : scoreB;
    const anchorProfileTag = anchorApproach === 'A' ? profileTagA : profileTagB;
    try {
      await fs.copyFile(anchorPath, finalCPath);
      scoreC = {
        overall: Number(anchorScore?.overall) || 0,
        metrics: { ...(anchorScore?.metrics || {}) },
        raw: `[identity-anchor:${anchorApproach}] ${String(anchorScore?.raw || '')}`.trim(),
      };
      profileTagC = `${anchorProfileTag}+identity-anchor-${anchorApproach}`;
      phase2RoundsC.push({
        stage: 'guardrail',
        round: 0,
        status: 'identity_anchor_from_ab',
        source: anchorApproach,
        applied: true,
        accepted: true,
        gain: 0,
      });
      console.log(
        `C IDENTITY GUARD: anchored strategy C to strategy ${anchorApproach} ` +
        `(emergency=${cUsedEmergencyPassA}, passA_fallback=${cUsedPassAFallbackFinal}, source_clone=${cFinalSourceClone}, identity_risk=${cIdentityRisk}, ` +
        `c_identity=${cIdentityScore.toFixed(2)}, ab_best_identity=${abBestIdentityScore.toFixed(2)}).`
      );
    } catch (anchorErr) {
      console.log(`C IDENTITY GUARD: failed to anchor strategy C to A/B artifact: ${anchorErr.message}`);
    }
  }

  const seedABScore = Math.max(
    Number(passA_A?.frontierPassAScore?.overall) || 0,
    Number(passA_B?.frontierPassAScore?.overall) || 0
  );
  const initialABScore = Math.max(
    Number(scoreA_baseline?.overall) || 0,
    Number(scoreB_baseline?.overall) || 0
  );
  const revisedABScore = Math.max(
    Number(scoreA?.overall) || 0,
    Number(scoreB?.overall) || 0
  );
  const preFinalBoostLessons = normalizeLessons(
    [
      ...historicalLessons,
      ...(selfIterA.lessonsLast || []),
      ...(selfIterB.lessonsLast || []),
      ...(selfIterC.lessonsLast || []),
      ...baselineHints,
      ...deepAudit.lessonsA,
      ...deepAudit.lessonsB,
      ...deepAudit.sharedLessons,
      ...abHints,
      ...strategyCLessons,
      'Final-stage target: maximize final output quality after audit, with strict identity/compliance locks.',
    ],
    Math.max(18, LESSON_MAX_PER_PROMPT + 6)
  );

  let scoreByApproach = {
    A: scoreA,
    B: scoreB,
    C: scoreC,
  };
  let winner = selectWinnerWithGuardrails(scoreByApproach);
  let winnerApproach = normalizeApproach(winner.key, 'A');
  const contextForApproach = approach => (
    approach === 'A'
      ? { profileTag: profileTagA, path: finalAPath, score: scoreA, variation: passA_A.variation }
      : (approach === 'B'
        ? { profileTag: profileTagB, path: finalBPath, score: scoreB, variation: passA_B.variation }
        : { profileTag: profileTagC, path: finalCPath, score: scoreC, variation: passA_C.variation })
  );
  const preFinalRanking = STRATEGY_KEYS
    .map(key => ({ key, overall: Number(scoreByApproach?.[key]?.overall) || 0 }))
    .sort((a, b) => b.overall - a.overall);
  const preFinalGapToRunnerUp = (preFinalRanking[0]?.overall || 0) - (preFinalRanking[1]?.overall || 0);
  const preFinalWinnerApproach = winnerApproach;
  const winnerContext = contextForApproach(winnerApproach);
  const preFinalMultiplier = qualityMultiplier(winnerContext.score, revisedABScore);
  const finalBoostBudget = finalBoostRoundsFromShortfall(
    preFinalMultiplier,
    FINAL_QUALITY_TARGET_MULTIPLIER,
    effectiveFinalAuditBaseRounds
  );
  const finalBoostChallenger = bestChallengerForFinalBoost(winnerApproach, scoreByApproach);
  const finalBoostCrossChallenger = deriveFinalBoostCrossChallengerLessons(
    winnerApproach,
    winnerContext.score,
    scoreByApproach
  );
  const finalBoostLessons = normalizeLessons(
    [
      ...preFinalBoostLessons,
      ...deriveFinalBoostLessons(winnerContext.score, finalBoostChallenger.score),
      ...finalBoostCrossChallenger.lessons,
      `Final boost challenger anchor: match/exceed ${finalBoostChallenger.key} on metrics where it leads while preserving ${winnerApproach} identity/compliance lock.`,
    ],
    Math.max(20, LESSON_MAX_PER_PROMPT + 8)
  );
  console.log(
    `FINAL BOOST PLAN ${concept.name}: winner=${winnerApproach} challenger=${finalBoostChallenger.key} ` +
    `pre=${preFinalMultiplier.toFixed(2)}x target=${FINAL_QUALITY_TARGET_MULTIPLIER.toFixed(2)}x ` +
    `rounds=${finalBoostBudget.max_rounds} (base=${FINAL_AUDIT_BOOST_ROUNDS_MAX}, extra=${finalBoostBudget.extra_rounds})`
  );

  const finalAuditBoost = await runAuditGuidedFinalBoost({
    concept,
    index,
    variation: winnerContext.variation,
    approachKey: winnerApproach,
    profileTag: winnerContext.profileTag,
    path: winnerContext.path,
    score: winnerContext.score,
    lessons: finalBoostLessons,
    referencePath: inputImage,
    referenceMimeType: inputMimeType,
    referenceB64: inputB64,
    maxRounds: finalBoostBudget.max_rounds,
  });
  let finalAuditBoostRunnerUp = { attempted: false, applied: false, rounds: [] };

  if (finalAuditBoost.applied) {
    if (winnerApproach === 'A') {
      finalAPath = finalAuditBoost.path;
      scoreA = finalAuditBoost.score;
      profileTagA = finalAuditBoost.profileTag;
      phase2RoundsA.push(...(finalAuditBoost.rounds || []).map(r => ({ stage: 'final_audit', ...r })));
    } else if (winnerApproach === 'B') {
      finalBPath = finalAuditBoost.path;
      scoreB = finalAuditBoost.score;
      profileTagB = finalAuditBoost.profileTag;
      phase2RoundsB.push(...(finalAuditBoost.rounds || []).map(r => ({ stage: 'final_audit', ...r })));
    } else {
      finalCPath = finalAuditBoost.path;
      scoreC = finalAuditBoost.score;
      profileTagC = finalAuditBoost.profileTag;
      phase2RoundsC.push(...(finalAuditBoost.rounds || []).map(r => ({ stage: 'final_audit', ...r })));
    }
  }

  scoreByApproach = {
    A: scoreA,
    B: scoreB,
    C: scoreC,
  };
  const postWinner = selectWinnerWithGuardrails(scoreByApproach);
  const postWinnerApproach = normalizeApproach(postWinner.key, 'A');
  const postWinnerRanking = STRATEGY_KEYS
    .map(key => ({ key, overall: Number(scoreByApproach?.[key]?.overall) || 0 }))
    .sort((a, b) => b.overall - a.overall);
  const postWinnerRunnerUp = postWinnerRanking.find(item => item.key !== postWinnerApproach);
  const postWinnerGap = (postWinnerRanking[0]?.overall || 0) - (postWinnerRunnerUp?.overall || 0);
  const shouldBoostRunnerUp = Boolean(
    postWinnerRunnerUp &&
    (
      finalBoostBudget.shortfall >= 0.2 ||
      postWinnerGap <= (WINNER_TIE_BAND + 0.05)
    )
  );
  if (shouldBoostRunnerUp) {
    const runnerUpApproach = postWinnerRunnerUp.key;
    const runnerUpContext = contextForApproach(runnerUpApproach);
    const runnerUpChallenger = bestChallengerForFinalBoost(runnerUpApproach, scoreByApproach);
    const runnerUpCrossChallenger = deriveFinalBoostCrossChallengerLessons(
      runnerUpApproach,
      runnerUpContext.score,
      scoreByApproach
    );
    const runnerUpMaxRounds = Math.max(1, Math.min(finalBoostBudget.max_rounds, effectiveFinalAuditBaseRounds + 1));
    const runnerUpLessons = normalizeLessons(
      [
        ...preFinalBoostLessons,
        ...deriveFinalBoostLessons(runnerUpContext.score, runnerUpChallenger.score),
        ...runnerUpCrossChallenger.lessons,
        `Runner-up audit boost: test latent upside in ${runnerUpApproach} while preserving strict identity/compliance invariants.`,
      ],
      Math.max(18, LESSON_MAX_PER_PROMPT + 7)
    );
    console.log(
      `FINAL BOOST RUNNER-UP ${concept.name}: approach=${runnerUpApproach} gap=${postWinnerGap.toFixed(2)} ` +
      `shortfall=${finalBoostBudget.shortfall.toFixed(2)} rounds=${runnerUpMaxRounds}`
    );
    const runnerUpBoost = await runAuditGuidedFinalBoost({
      concept,
      index,
      variation: runnerUpContext.variation,
      approachKey: runnerUpApproach,
      profileTag: runnerUpContext.profileTag,
      path: runnerUpContext.path,
      score: runnerUpContext.score,
      lessons: runnerUpLessons,
      referencePath: inputImage,
      referenceMimeType: inputMimeType,
      referenceB64: inputB64,
      maxRounds: runnerUpMaxRounds,
    });
    finalAuditBoostRunnerUp = {
      ...runnerUpBoost,
      attempted: true,
      approach: runnerUpApproach,
      gap_before: postWinnerGap,
      max_rounds: runnerUpMaxRounds,
    };
    if (runnerUpBoost.applied) {
      if (runnerUpApproach === 'A') {
        finalAPath = runnerUpBoost.path;
        scoreA = runnerUpBoost.score;
        profileTagA = runnerUpBoost.profileTag;
        phase2RoundsA.push(...(runnerUpBoost.rounds || []).map(r => ({ stage: 'final_audit_runner_up', ...r })));
      } else if (runnerUpApproach === 'B') {
        finalBPath = runnerUpBoost.path;
        scoreB = runnerUpBoost.score;
        profileTagB = runnerUpBoost.profileTag;
        phase2RoundsB.push(...(runnerUpBoost.rounds || []).map(r => ({ stage: 'final_audit_runner_up', ...r })));
      } else {
        finalCPath = runnerUpBoost.path;
        scoreC = runnerUpBoost.score;
        profileTagC = runnerUpBoost.profileTag;
        phase2RoundsC.push(...(runnerUpBoost.rounds || []).map(r => ({ stage: 'final_audit_runner_up', ...r })));
      }
    }
  }

  let lastPassRedo = {
    attempted: false,
    triggered: false,
    reason: '',
    candidates: [],
    shortfall: 0,
    pre_gap: 0,
    results: [],
  };
  const preRedoScores = {
    A: scoreA,
    B: scoreB,
    C: scoreC,
  };
  const preRedoRanking = STRATEGY_KEYS
    .map(key => ({ key, overall: Number(preRedoScores?.[key]?.overall) || 0 }))
    .sort((a, b) => b.overall - a.overall);
  const preRedoTop = preRedoRanking[0] || { key: 'A', overall: 0 };
  const preRedoSecond = preRedoRanking[1] || { key: preRedoTop.key, overall: preRedoTop.overall };
  const preRedoGap = (Number(preRedoTop.overall) || 0) - (Number(preRedoSecond.overall) || 0);
  const preRedoMultiplier = qualityMultiplier(preRedoScores[preRedoTop.key], revisedABScore);
  const preRedoShortfall = Math.max(0, FINAL_QUALITY_TARGET_MULTIPLIER - preRedoMultiplier);
  const triggerLastPassRedo = LAST_PASS_REDO_ENABLED
    && effectiveLastPassRedoRounds > 0
    && (
      preRedoShortfall >= LAST_PASS_REDO_SHORTFALL_TRIGGER
      || preRedoGap <= (WINNER_TIE_BAND + LAST_PASS_REDO_TIE_BAND_ADD)
    );

  if (triggerLastPassRedo) {
    const redoCandidates = preRedoRanking
      .filter((item, idx) => idx < 2 || ((Number(preRedoTop.overall) || 0) - Number(item.overall || 0)) <= WINNER_TIE_BAND)
      .map(item => item.key);
    const redoMaxRounds = effectiveLastPassRedoRounds + Math.min(
      1,
      Math.ceil(preRedoShortfall / Math.max(0.01, LAST_PASS_REDO_SHORTFALL_TRIGGER))
    );
    const redoReason = preRedoShortfall >= LAST_PASS_REDO_SHORTFALL_TRIGGER
      ? `target shortfall ${preRedoShortfall.toFixed(2)}`
      : `tight gap ${preRedoGap.toFixed(2)}`;
    lastPassRedo = {
      ...lastPassRedo,
      attempted: true,
      triggered: true,
      reason: redoReason,
      candidates: redoCandidates,
      shortfall: preRedoShortfall,
      pre_gap: preRedoGap,
    };
    console.log(
      `LAST PASS REDO PLAN ${concept.name}: reason=${redoReason} candidates=${redoCandidates.join(',')} ` +
      `rounds=${redoMaxRounds}`
    );
    for (const redoApproach of redoCandidates) {
      const currentScores = { A: scoreA, B: scoreB, C: scoreC };
      const redoContext = contextForApproach(redoApproach);
      const redoChallenger = bestChallengerForFinalBoost(redoApproach, currentScores);
      const redoCross = deriveFinalBoostCrossChallengerLessons(
        redoApproach,
        redoContext.score,
        currentScores
      );
      const redoLessons = normalizeLessons(
        [
          ...preFinalBoostLessons,
          ...deriveFinalBoostLessons(redoContext.score, redoChallenger.score),
          ...redoCross.lessons,
          `Redo last pass (${redoApproach}): preserve identity/compliance and push final deterministic gain beyond current frontier.`,
        ],
        Math.max(18, LESSON_MAX_PER_PROMPT + 8)
      );
      const redoBoost = await runAuditGuidedFinalBoost({
        concept,
        index,
        variation: redoContext.variation,
        approachKey: redoApproach,
        profileTag: redoContext.profileTag,
        path: redoContext.path,
        score: redoContext.score,
        lessons: redoLessons,
        referencePath: inputImage,
        referenceMimeType: inputMimeType,
        referenceB64: inputB64,
        maxRounds: redoMaxRounds,
      });
      lastPassRedo.results.push({
        approach: redoApproach,
        applied: redoBoost.applied === true,
        gain_total: Number(redoBoost.gain_total) || 0,
        rounds: Array.isArray(redoBoost.rounds) ? redoBoost.rounds.length : 0,
      });
      if (redoBoost.applied) {
        if (redoApproach === 'A') {
          finalAPath = redoBoost.path;
          scoreA = redoBoost.score;
          profileTagA = redoBoost.profileTag;
          phase2RoundsA.push(...(redoBoost.rounds || []).map(r => ({ stage: 'redo_last_pass', ...r })));
        } else if (redoApproach === 'B') {
          finalBPath = redoBoost.path;
          scoreB = redoBoost.score;
          profileTagB = redoBoost.profileTag;
          phase2RoundsB.push(...(redoBoost.rounds || []).map(r => ({ stage: 'redo_last_pass', ...r })));
        } else {
          finalCPath = redoBoost.path;
          scoreC = redoBoost.score;
          profileTagC = redoBoost.profileTag;
          phase2RoundsC.push(...(redoBoost.rounds || []).map(r => ({ stage: 'redo_last_pass', ...r })));
        }
      }
    }
  }

  scoreByApproach = {
    A: scoreA,
    B: scoreB,
    C: scoreC,
  };
  const overallByApproach = {
    A: scoreA.overall,
    B: scoreB.overall,
    C: scoreC.overall,
  };
  winner = selectWinnerWithGuardrails(scoreByApproach);
  winnerApproach = normalizeApproach(winner.key, 'A');
  const winnerPath = winnerApproach === 'A'
    ? finalAPath
    : (winnerApproach === 'B' ? finalBPath : finalCPath);
  const canonicalPath = path.join(OUTPUT_DIR, `${concept.name}.png`);
  const winnerBuffer = await fs.readFile(winnerPath);
  const winnerMimeType = mimeTypeFromPath(winnerPath) || 'image/png';
  const winnerIdentityGate = await enforceDeterministicIdentityGate({
    referencePath: inputImage,
    candidateBuffer: winnerBuffer,
    candidateMimeType: winnerMimeType,
    approachKey: winnerApproach,
    profile: 'winner-canonical',
    stage: 'final-canonical',
  });
  if (!winnerIdentityGate.accepted) {
    throw new Error(`Winner canonicalization failed deterministic identity gate for approach ${winnerApproach}.`);
  }
  await fs.copyFile(winnerPath, canonicalPath);

  const bestAB = Math.max(overallByApproach.A, overallByApproach.B);
  const cGainVsBestABBaseline = scoreC_baseline.overall - bestAB;
  const cGainVsBestAB = scoreC.overall - bestAB;
  const cGainVsBestABPct = bestAB > 0 ? ((cGainVsBestAB / bestAB) * 100) : 0;
  const cHeadroomGainVsBestABPct = qualityHeadroomGainPercent(scoreC, bestAB, QUALITY_SCORE_CEILING);
  const finalWinnerScore = Number(scoreByApproach[winnerApproach]?.overall) || 0;
  const phaseMultipliers = {
    initial_from_seed: qualityMultiplier(initialABScore, seedABScore),
    revised_from_initial: qualityMultiplier(revisedABScore, initialABScore),
    final_from_revised: qualityMultiplier(finalWinnerScore, revisedABScore),
    final_c_from_revised: qualityMultiplier(scoreC, revisedABScore),
    targets: {
      initial: INITIAL_QUALITY_TARGET_MULTIPLIER,
      revised: REVISED_QUALITY_TARGET_MULTIPLIER,
      final: FINAL_QUALITY_TARGET_MULTIPLIER,
    },
  };
  phaseMultipliers.target_hits = {
    initial: phaseMultipliers.initial_from_seed >= phaseMultipliers.targets.initial,
    revised: phaseMultipliers.revised_from_initial >= phaseMultipliers.targets.revised,
    final: phaseMultipliers.final_from_revised >= phaseMultipliers.targets.final,
  };
  const finalFromRevised = Number(phaseMultipliers.final_from_revised) || 0;
  const finalMultiplierPass = finalFromRevised >= MIN_FINAL_MULTIPLIER_GATE;
  const cGainPass = cHeadroomGainVsBestABPct >= TARGET_QUALITY_GAIN_PCT;
  const qualityGateFailureReasons = [];
  if (!finalMultiplierPass) {
    qualityGateFailureReasons.push(
      `final_multiplier ${finalFromRevised.toFixed(2)}x < required ${MIN_FINAL_MULTIPLIER_GATE.toFixed(2)}x`
    );
  }
  if (C_GAIN_TARGET_HARD_GATE && !cGainPass) {
    qualityGateFailureReasons.push(
      `c_headroom_gain ${cHeadroomGainVsBestABPct.toFixed(1)}% < target ${TARGET_QUALITY_GAIN_PCT.toFixed(1)}%`
    );
  }
  const qualityGate = {
    min_final_multiplier: MIN_FINAL_MULTIPLIER_GATE,
    final_from_revised: finalFromRevised,
    target_c_gain_percent: TARGET_QUALITY_GAIN_PCT,
    target_c_headroom_gain_percent: TARGET_QUALITY_GAIN_PCT,
    c_gain_percent_vs_best_ab: cGainVsBestABPct,
    c_headroom_gain_percent_vs_best_ab: cHeadroomGainVsBestABPct,
    c_gain_hard_gate: C_GAIN_TARGET_HARD_GATE,
    c_gain_pass: cGainPass,
    pass: qualityGateFailureReasons.length === 0,
    strict: STRICT_QUALITY_GATE,
    failure_reasons: qualityGateFailureReasons,
  };
  const auditQualitySignals = buildAuditQualitySignals({
    scoreByApproach,
    winnerApproach,
    phase2Rounds: {
      A: phase2RoundsA,
      B: phase2RoundsB,
      C: phase2RoundsC,
    },
  });
  const hints = deriveABCIterationHints(scoreA, scoreB, scoreC);
  const allLessons = mergeLessonsByPriority(
    [
      ...strategyCLessons,
      ...hints,
      ...(selfIterC.lessonsLast || []),
      ...(selfIterA.lessonsLast || []),
      ...(selfIterB.lessonsLast || []),
      ...abHints,
    ],
    [
      ...historicalLessons,
      ...baselineHints,
      ...deepAudit.lessonsA,
      ...deepAudit.lessonsB,
      ...deepAudit.sharedLessons,
    ],
    Math.max(16, LESSON_MAX_PER_PROMPT + 4)
  );
  const auditRecord = {
    timestamp: new Date().toISOString(),
    concept: concept.name,
    process: {
      groundbreaking_mode: HAIL_MARY_MODE,
      self_iteration_rounds_max: APPROACH_SELF_ITERATION_ROUNDS_MAX,
      cross_iteration_rounds_max: AB_ITERATION_ROUNDS_MAX,
      phase2_variants_per_round: PHASE2_VARIANTS_PER_ROUND,
      phase2_base_intensity: AB_PHASE2_INTENSITY,
      phase2_intensity_step: PHASE2_VARIANT_INTENSITY_STEP,
      c_self_iteration_rounds_max: C_SELF_ITERATION_ROUNDS_MAX,
      c_self_min_gain: C_SELF_MIN_GAIN,
      final_audit_boost_rounds_max: FINAL_AUDIT_BOOST_ROUNDS_MAX,
      final_audit_boost_min_gain: FINAL_AUDIT_BOOST_MIN_GAIN,
      final_audit_shortfall_step: FINAL_AUDIT_SHORTFALL_STEP,
      final_audit_shortfall_extra_rounds_max: FINAL_AUDIT_SHORTFALL_EXTRA_ROUNDS_MAX,
      last_pass_redo_enabled: LAST_PASS_REDO_ENABLED,
      last_pass_redo_rounds_max: LAST_PASS_REDO_ROUNDS_MAX,
      last_pass_redo_tie_band_add: LAST_PASS_REDO_TIE_BAND_ADD,
      last_pass_redo_shortfall_trigger: LAST_PASS_REDO_SHORTFALL_TRIGGER,
      harden_iteration_process: HARDEN_ITERATION_PROCESS,
      harden_max_extra_phase2_variants: HARDEN_MAX_EXTRA_PHASE2_VARIANTS,
      harden_max_extra_rounds: HARDEN_MAX_EXTRA_ROUNDS,
      harden_max_extra_self_rounds: HARDEN_MAX_EXTRA_SELF_ROUNDS,
      harden_max_extra_last_pass_rounds: HARDEN_MAX_EXTRA_LAST_PASS_ROUNDS,
      quality_escalation_enable: QUALITY_ESCALATION_ENABLE,
      quality_escalation_score_trigger: QUALITY_ESCALATION_SCORE_TRIGGER,
      quality_escalation_tie_trigger: QUALITY_ESCALATION_TIE_TRIGGER,
      quality_escalation_max_extra_rounds: QUALITY_ESCALATION_MAX_EXTRA_ROUNDS,
      quality_escalation_max_extra_variants: QUALITY_ESCALATION_MAX_EXTRA_VARIANTS,
      quality_escalation_level: qualityEscalationLevel,
      quality_escalation_reasons: qualityEscalationReasons,
      current_attempt: CURRENT_CONCEPT_ATTEMPT,
      max_attempts: CURRENT_CONCEPT_MAX_ATTEMPTS,
      hardening_level: hardeningLevel,
      effective_phase2_variants_per_round: effectivePhase2Variants,
      effective_self_iteration_rounds_max: effectiveSelfRounds,
      effective_c_self_iteration_rounds_max: effectiveCSelfRounds,
      effective_ab_iteration_rounds_max: effectiveABRounds,
      effective_final_audit_boost_rounds_base: effectiveFinalAuditBaseRounds,
      effective_last_pass_redo_rounds_max: effectiveLastPassRedoRounds,
      request_pacing_base_s: REQUEST_PACING_BASE_S,
      request_pacing_max_s: REQUEST_PACING_MAX_S,
      effective_request_pacing_base_s: effectiveRequestPacingBaseSeconds(),
      min_api_attempt_interval_s: MIN_API_ATTEMPT_INTERVAL_S,
      effective_min_api_attempt_interval_s: effectiveMinApiAttemptIntervalSeconds(),
      fourk_min_attempt_interval_s: FOURK_MIN_ATTEMPT_INTERVAL_S,
      rate_limit_backoff_step_s: RATE_LIMIT_BACKOFF_STEP_S,
      rate_limit_streak_step_s: RATE_LIMIT_STREAK_STEP_S,
      rate_limit_max_backoff_s: RATE_LIMIT_MAX_BACKOFF_S,
      rate_limit_retry_deadline_s: RATE_LIMIT_RETRY_DEADLINE_S,
      rate_limit_consecutive_failfast: RATE_LIMIT_CONSECUTIVE_FAILFAST,
      rate_limit_profile_narrow_streak: RATE_LIMIT_PROFILE_NARROW_STREAK,
      rate_limit_force_cache_streak: RATE_LIMIT_FORCE_CACHE_STREAK,
      auth_timeout_ms: AUTH_TIMEOUT_MS,
      auth_retries_max: AUTH_RETRIES_MAX,
      auth_retry_wait_s: AUTH_RETRY_WAIT_S,
      access_token_early_refresh_s: ACCESS_TOKEN_EARLY_REFRESH_S,
      reuse_passa_on_failure: REUSE_PASSA_ON_FAILURE,
      resume_skip_completed_ab: RESUME_SKIP_COMPLETED_AB,
      force_4k_image_size: FORCE_4K_IMAGE_SIZE,
      default_image_size: DEFAULT_IMAGE_SIZE,
      c_image_size: C_IMAGE_SIZE,
      enforce_rendered_4k: ENFORCE_RENDERED_4K,
      render_target_width: RENDER_TARGET_WIDTH,
      render_target_height: RENDER_TARGET_HEIGHT,
      render_dimension_strict_exact: RENDER_DIMENSION_STRICT_EXACT,
      render_target_aspect_ratio: RENDER_TARGET_ASPECT_RATIO,
      render_target_aspect_tolerance: RENDER_TARGET_ASPECT_TOLERANCE,
      enforce_native_4k_dims: ENFORCE_NATIVE_4K_DIMS,
      native_4k_expected_width: NATIVE_4K_EXPECTED_WIDTH,
      native_4k_expected_height: NATIVE_4K_EXPECTED_HEIGHT,
      daring_boost_level: DARING_BOOST_LEVEL,
      physics_breakthrough_multiplier: PHYSICS_BREAKTHROUGH_MULTIPLIER,
      physics_score_floor: PHYSICS_SCORE_FLOOR,
      physics_breakthrough_penalty_gain: PHYSICS_BREAKTHROUGH_PENALTY_GAIN,
      prompt_skillstack_enabled: PROMPT_SKILLSTACK_ENABLED,
      prompt_breakthrough_level: PROMPT_BREAKTHROUGH_LEVEL,
      prompt_failure_hints_max: PROMPT_FAILURE_HINTS_MAX,
      bold_editorial_mode: BOLD_EDITORIAL_MODE,
      bold_editorial_intensity: BOLD_EDITORIAL_INTENSITY,
      bold_matrix_export: BOLD_MATRIX_EXPORT,
      bold_matrix_file: BOLD_MATRIX_FILE,
      pass_a_primary_prompt_style: PASS_A_PRIMARY_PROMPT_STYLE,
      pass_b_primary_prompt_style: PASS_B_PRIMARY_PROMPT_STYLE,
      pass_b_model: PASS_B_MODEL,
      pass_b_reuse_passa_model_parts: PASS_B_REUSE_PASSA_MODEL_PARTS,
      pass_b_delta_beams: PASS_B_DELTA_BEAMS,
      pass_b_use_scorer_rerank: PASS_B_USE_SCORER_RERANK,
      pass_b_beam_min_score: PASS_B_BEAM_MIN_SCORE,
      pass_b_require_passa_audit: PASS_B_REQUIRE_PASSA_AUDIT,
      pass_b_passa_audit_hints: PASS_B_PASSA_AUDIT_HINTS,
      pass_b_passa_gain_target_pct: PASS_B_PASSA_GAIN_TARGET_PCT,
      pass_b_passa_gain_max_retries: PASS_B_PASSA_GAIN_MAX_RETRIES,
      pass_b_passa_gain_min_step: PASS_B_PASSA_GAIN_MIN_STEP,
      pass_b_passa_gain_hard_gate: PASS_B_PASSA_GAIN_HARD_GATE,
      ground_breakthrough_enabled: GROUND_BREAKTHROUGH_ENABLED,
      ground_breakthrough_push_multiplier: GROUND_BREAKTHROUGH_PUSH_MULTIPLIER,
      ground_breakthrough_trigger_score: GROUND_BREAKTHROUGH_TRIGGER_SCORE,
      ground_breakthrough_max_refines: GROUND_BREAKTHROUGH_MAX_REFINES,
      ground_breakthrough_min_gain: GROUND_BREAKTHROUGH_MIN_GAIN,
      normalize_output_to_target_4k: NORMALIZE_OUTPUT_TO_TARGET_4K,
      image_size_fallback: IMAGE_SIZE_FALLBACK,
      image_size_fallback_enabled: ENABLE_IMAGE_SIZE_FALLBACK,
      scorer_model: SCORER_MODEL,
      quality_targets: {
        initial_multiplier: INITIAL_QUALITY_TARGET_MULTIPLIER,
        revised_multiplier: REVISED_QUALITY_TARGET_MULTIPLIER,
        final_multiplier: FINAL_QUALITY_TARGET_MULTIPLIER,
        base_c_gain_percent_vs_best_ab: TARGET_QUALITY_GAIN_BASE_PCT,
        quality_uplift_multiplier: QUALITY_UPLIFT_MULTIPLIER,
        c_gain_percent_vs_best_ab: TARGET_QUALITY_GAIN_PCT,
        c_headroom_gain_percent_vs_best_ab: TARGET_QUALITY_GAIN_PCT,
      },
      quality_gate: {
        min_final_multiplier: MIN_FINAL_MULTIPLIER_GATE,
        strict: STRICT_QUALITY_GATE,
        c_gain_hard_gate: C_GAIN_TARGET_HARD_GATE,
      },
      iter_accept_overall_tol: ITER_ACCEPT_OVERALL_TOL,
      iter_accept_metric_tol: ITER_ACCEPT_METRIC_TOL,
      lock_ab_variation: LOCK_AB_VARIATION,
      lock_c_variation_to_ab: LOCK_C_VARIATION_TO_AB,
      variation_fingerprints: {
        A: variationFingerprint(passA_A.variation),
        B: variationFingerprint(passA_B.variation),
        C: variationFingerprint(passA_C.variation),
      },
    },
    winner: {
      approach: winnerApproach,
      path: winnerPath,
      score: overallByApproach[winnerApproach],
      reason: winner.reason,
    },
    strategies: {
      A: {
        passA_profile: passA_A.frontierProfile,
        passB_profile: profileTagA,
        output_path: finalAPath,
        baseline_score: scoreA_baseline,
        score: scoreA,
        attempts: {
          passA: passA_A.attemptLog || [],
          passB: finalA_baseline.attemptLog || [],
          phase2: phase2RoundsA,
        },
        generation_health: {
          passA: summarizeGenerationHealth(passA_A.attemptLog),
          passB: summarizeGenerationHealth(finalA_baseline.attemptLog),
          phase2: summarizeGenerationHealth(phase2RoundsA),
          resumed_from_cache: Boolean(passA_A?.resumedFromCache || finalA_baseline?.resumedFromCache),
        },
        lessons_applied: phase2LessonsA,
      },
      B: {
        passA_profile: passA_B.frontierProfile,
        passB_profile: profileTagB,
        output_path: finalBPath,
        baseline_score: scoreB_baseline,
        score: scoreB,
        attempts: {
          passA: passA_B.attemptLog || [],
          passB: finalB_baseline.attemptLog || [],
          phase2: phase2RoundsB,
        },
        generation_health: {
          passA: summarizeGenerationHealth(passA_B.attemptLog),
          passB: summarizeGenerationHealth(finalB_baseline.attemptLog),
          phase2: summarizeGenerationHealth(phase2RoundsB),
          resumed_from_cache: Boolean(passA_B?.resumedFromCache || finalB_baseline?.resumedFromCache),
        },
        lessons_applied: phase2LessonsB,
      },
      C: {
        passA_profile: passA_C.frontierProfile,
        passB_profile: profileTagC,
        output_path: finalCPath,
        baseline_score: scoreC_baseline,
        score: scoreC,
        attempts: {
          passA: passA_C.attemptLog || [],
          passB: finalC.attemptLog || [],
          phase2: phase2RoundsC,
        },
        generation_health: {
          passA: summarizeGenerationHealth(passA_C.attemptLog),
          passB: summarizeGenerationHealth(finalC.attemptLog),
          phase2: summarizeGenerationHealth(phase2RoundsC),
          resumed_from_cache: Boolean(passA_C?.resumedFromCache || finalC?.resumedFromCache),
        },
        lessons_applied: selfIterC.lessonsLast || passA_C.lessonsApplied || strategyCLessons,
      },
    },
    deep_audit: {
      variation_control: {
        lock_ab_variation: LOCK_AB_VARIATION,
        lock_c_variation_to_ab: LOCK_C_VARIATION_TO_AB,
        a_equals_b: variationFingerprint(passA_A.variation) === variationFingerprint(passA_B.variation),
        c_equals_ab: variationFingerprint(passA_C.variation) === variationFingerprint(passA_A.variation),
      },
      baseline_scores: {
        A: scoreA_baseline,
        B: scoreB_baseline,
      },
      post_self_scores: {
        A: selfIterA.score,
        B: selfIterB.score,
        C: selfIterC.score,
      },
      findings: deepAudit.lines,
      phase2_lessons: {
        A: phase2LessonsA,
        B: phase2LessonsB,
        C: selfIterC.lessonsLast || [],
      },
      self_iteration_rounds: {
        A: selfIterA.rounds || [],
        B: selfIterB.rounds || [],
        C: selfIterC.rounds || [],
      },
      iteration_rounds: abIterationRounds,
      final_audit_boost_plan: {
        winner_approach: preFinalWinnerApproach,
        challenger_approach: finalBoostChallenger.key,
        challenger_metric_leaders: finalBoostCrossChallenger.leaders,
        pre_final_multiplier: preFinalMultiplier,
        target_multiplier: FINAL_QUALITY_TARGET_MULTIPLIER,
        shortfall: finalBoostBudget.shortfall,
        base_rounds: effectiveFinalAuditBaseRounds,
        extra_rounds: finalBoostBudget.extra_rounds,
        max_rounds: finalBoostBudget.max_rounds,
        pre_final_gap_to_runner_up: preFinalGapToRunnerUp,
        runner_up_boost_attempted: finalAuditBoostRunnerUp.attempted === true,
        runner_up_boost_applied: finalAuditBoostRunnerUp.applied === true,
        runner_up_boost_approach: finalAuditBoostRunnerUp.approach || null,
        runner_up_boost_gap_before: Number(finalAuditBoostRunnerUp.gap_before) || 0,
        runner_up_boost_max_rounds: Number(finalAuditBoostRunnerUp.max_rounds) || 0,
        last_pass_redo_attempted: lastPassRedo.attempted === true,
        last_pass_redo_triggered: lastPassRedo.triggered === true,
        last_pass_redo_reason: lastPassRedo.reason || '',
        last_pass_redo_candidates: lastPassRedo.candidates || [],
        last_pass_redo_shortfall: Number(lastPassRedo.shortfall) || 0,
        last_pass_redo_pre_gap: Number(lastPassRedo.pre_gap) || 0,
      },
      final_audit_boost: finalAuditBoost || { applied: false, rounds: [] },
      final_audit_boost_runner_up: finalAuditBoostRunnerUp || { applied: false, rounds: [] },
      last_pass_redo: lastPassRedo || { attempted: false, triggered: false, results: [] },
    },
    audit_quality: auditQualitySignals,
    comparisons: {
      score_delta_ab_baseline: scoreA_baseline.overall - scoreB_baseline.overall,
      score_delta_ab_post_self: selfIterA.score.overall - selfIterB.score.overall,
      score_delta_ab: scoreA.overall - scoreB.overall,
      score_delta_c_self: scoreC.overall - scoreC_baseline.overall,
      c_vs_best_ab_baseline: cGainVsBestABBaseline,
      c_vs_best_ab: cGainVsBestAB,
      c_gain_percent_vs_best_ab: cGainVsBestABPct,
      c_headroom_gain_percent_vs_best_ab: cHeadroomGainVsBestABPct,
      phase_multipliers: phaseMultipliers,
      quality_gate: qualityGate,
      target_gain_percent: TARGET_QUALITY_GAIN_PCT,
      target_gain_hit: cHeadroomGainVsBestABPct >= TARGET_QUALITY_GAIN_PCT,
      winner_shortlist: winner.shortlist || [],
      winner_tie_band: WINNER_TIE_BAND,
      ab_iteration_rounds_count: abIterationRounds.length,
    },
    hints,
    lessons: {
      historical: historicalLessons,
      self_iteration: {
        A: selfIterA.lessonsLast || [],
        B: selfIterB.lessonsLast || [],
        C: selfIterC.lessonsLast || [],
      },
      baseline_ab_derived: baselineHints,
      ab_derived: abHints,
      deep_audit: [...deepAudit.lessonsA, ...deepAudit.lessonsB, ...deepAudit.sharedLessons],
      goal_conditioned: goalConditionedCLearning,
      c_prompt_plan: strategyCLessons,
      all: allLessons,
    },
  };
  await fs.appendFile(AB_AUDIT_FILE, `${JSON.stringify(auditRecord)}\n`);
  const allRecords = await loadAuditRecords();
  const liveSummary = normalizeAuditSummary(allRecords);
  await fs.writeFile(AB_SUMMARY_FILE, `${JSON.stringify(liveSummary, null, 2)}\n`);
  const learningAudit = buildLearningAuditRecord(auditRecord);
  await fs.appendFile(LEARNING_AUDIT_FILE, `${JSON.stringify(learningAudit)}\n`);
  const learningRecords = await loadLearningAuditRecords();
  const learningPlan = normalizeLearningPlan(learningRecords);
  await fs.writeFile(LEARNING_PLAN_FILE, `${JSON.stringify(learningPlan, null, 2)}\n`);
  console.log(
    `ABC AUDIT ${concept.name}: winner=${winnerApproach} reason=${winner.reason} ` +
    `scoreA=${scoreA.overall.toFixed(2)} scoreB=${scoreB.overall.toFixed(2)} scoreC=${scoreC.overall.toFixed(2)} ` +
    `CgainRaw=${cGainVsBestABPct.toFixed(1)}% CgainHeadroom=${cHeadroomGainVsBestABPct.toFixed(1)}% saved=${canonicalPath}`
  );
  console.log(
    `AUDIT CONFIDENCE ${concept.name}: confidence=${(Number(auditQualitySignals.confidence) || 0).toFixed(2)} ` +
    `margin=${(Number(auditQualitySignals.winner_margin) || 0).toFixed(2)} ` +
    `risk_flags=${(auditQualitySignals.risk_flags || []).join(',') || 'none'}`
  );
  console.log(
    `PHASE TARGETS ${concept.name}: initial=${phaseMultipliers.initial_from_seed.toFixed(2)}x/${phaseMultipliers.targets.initial.toFixed(2)}x ` +
    `revised=${phaseMultipliers.revised_from_initial.toFixed(2)}x/${phaseMultipliers.targets.revised.toFixed(2)}x ` +
    `final=${phaseMultipliers.final_from_revised.toFixed(2)}x/${phaseMultipliers.targets.final.toFixed(2)}x`
  );
  if (learningAudit.recommended_actions.length > 0) {
    console.log(`LEARNING AUDIT ${concept.name}: next=${learningAudit.recommended_actions.slice(0, 2).join(' | ')}`);
  }
  const recCfg = learningPlan?.recommended_config || {};
  if (Object.keys(recCfg).length > 0) {
    console.log(
      `LEARNING PLAN CONFIG: phase2_variants=${recCfg.phase2_variants_per_round ?? 'n/a'} ` +
      `phase2_step=${recCfg.phase2_variant_intensity_step ?? 'n/a'} ` +
      `self_rounds=${recCfg.approach_self_iteration_rounds_max ?? 'n/a'} ` +
      `c_self_rounds=${recCfg.c_self_iteration_rounds_max ?? 'n/a'} ` +
      `ab_rounds=${recCfg.ab_iteration_rounds_max ?? 'n/a'} ` +
      `final_audit_rounds=${recCfg.final_audit_boost_rounds_max ?? 'n/a'} ` +
      `lock_ab=${recCfg.lock_ab_variation ?? 'n/a'} ` +
      `lock_c=${recCfg.lock_c_variation_to_ab ?? 'n/a'}`
    );
  }

  return { path: canonicalPath, audit: auditRecord, learningAudit, qualityGate };
}

function cacheAwareWaitSecondsFromEntries(items = []) {
  const reused = (items || []).some(item => {
    if (!item) return false;
    if (item.reusedCachedPassA === true) return true;
    if (item.resumedFromCache === true) return true;
    if (String(item.profileUsed || '').includes('cached')) return true;
    if (Array.isArray(item.attemptLog)) {
      return item.attemptLog.some(a => String(a?.status || '').includes('reused_cached'));
    }
    return false;
  });
  return reused ? Math.min(RETRY_WAIT_S, CACHE_REUSE_WAIT_S) : RETRY_WAIT_S;
}

async function scoreFrontierCandidateFromPath({
  candidatePath,
  referenceMimeType,
  referenceB64,
  concept,
  expression,
  profile,
}) {
  const candidateB64 = (await fs.readFile(candidatePath)).toString('base64');
  if (candidateB64 === referenceB64) {
    return {
      overall: 0,
      metrics: {},
      raw: 'source_clone_detected: candidate image is byte-identical to source reference',
    };
  }
  return scoreFrontierCandidate({
    referenceMimeType,
    referenceB64,
    candidateMimeType: mimeTypeFromPath(candidatePath),
    candidateB64,
    concept,
    expression,
    profile,
  });
}

async function ensureApproachFrontierOutput({
  concept,
  inputImage,
  index,
  approachKey,
  lessons = [],
  profileOrder = [],
  variation = null,
  synthesisCharter = '',
  phaseLabel = '',
  allowResume = true,
  enableAggressiveBoundary = false,
  imageSize = null,
}) {
  const resumedPassA = allowResume
    ? await loadResumePassAFrontier({
      concept,
      inputImage,
      index,
      approach: approachKey,
      lessons,
      profileOrder,
      variation,
      synthesisCharter,
    })
    : null;
  const passA = resumedPassA || await generatePassAFrontier(concept, inputImage, index, approachKey, {
    lessons,
    profileOrder,
    variation,
    synthesisCharter,
    imageSize,
  });

  const resumedFinal = allowResume
    ? await loadResumeFinalFrontier({
      concept,
      approach: approachKey,
      profileHint: passA.frontierProfile,
      inputImage,
      lessons,
    })
    : null;

  // Fast-path: both artifacts already cached, so skip redundant wait/generation.
  if (resumedPassA && resumedFinal) {
    console.log(
      `PHASE ${phaseLabel} ${concept.name}: using cached strategy ${approachKey} artifacts (passA+final).`
    );
    return { passA, final: resumedFinal };
  }

  const waitAfterPassA = cacheAwareWaitSecondsFromEntries([passA]);
  console.log(
    `PHASE ${phaseLabel} ${concept.name}: waiting ${waitAfterPassA}s between strategy ${approachKey} passes...`
  );
  await waitWithHeartbeat(waitAfterPassA, `phase-${phaseLabel.toLowerCase()}-strategy-${approachKey.toLowerCase()}-between-passes`);

  const final = resumedFinal || await generatePassBFrontier(concept, passA, inputImage, index, approachKey, {
    lessons,
    synthesisCharter,
    enableAggressiveBoundary,
    imageSize,
  });

  return { passA, final };
}

async function runPhasedDualStrategyBatches({ startIndex, endIndex, inputImage }) {
  const start = Math.max(0, Number(startIndex) || 0);
  const upper = Math.min(Number(endIndex) || concepts.length, concepts.length);
  const indices = [];
  for (let i = start; i < upper; i++) indices.push(i);

  const referenceMimeType = mimeTypeFromPath(inputImage);
  const referenceB64 = (await fs.readFile(inputImage)).toString('base64');
  let historicalRecords = await loadAuditRecords();
  let historicalSummary = normalizeAuditSummary(historicalRecords);
  let historicalLessons = extractHistoricalLessons(historicalSummary, historicalRecords);
  const profileOrderA = buildApproachProfileOrder('A', historicalRecords);
  const profileOrderB = buildApproachProfileOrder('B', historicalRecords);

  const stateByConcept = new Map();
  const results = [];
  const phaseASafetyDeferred = [];
  const phaseBSafetyDeferred = [];

  const getState = conceptName => {
    if (!stateByConcept.has(conceptName)) stateByConcept.set(conceptName, {});
    return stateByConcept.get(conceptName);
  };

  console.log(`\n${'='.repeat(60)}`);
  console.log('PHASED BATCH MODE');
  console.log(`${'='.repeat(60)}`);
  console.log(`Range: ${start + 1}-${upper} (count=${indices.length})`);
  console.log('Phase order: A(all) -> B(all) -> C(all + final best-of-3)');
  console.log(`Strict order enforcement: ${PHASED_STRICT_ORDER ? 'on' : 'off'}`);

  console.log(`\n${'='.repeat(60)}`);
  console.log('PHASE A START');
  console.log(`${'='.repeat(60)}`);
  for (let p = 0; p < indices.length; p++) {
    const idx = indices[p];
    const concept = concepts[idx];
    const st = getState(concept.name);
    if (!st.sharedVariation) st.sharedVariation = LOCK_AB_VARIATION ? buildVariation() : null;
    if (!st.variationA) st.variationA = st.sharedVariation || buildVariation();
    try {
      const conceptNum = conceptNumberFromName(concept.name);
      const skipBeforeResume =
        PHASE_A_RESUME_FROM_NUM > 0 &&
        conceptNum !== null &&
        conceptNum < PHASE_A_RESUME_FROM_NUM;

      if (skipBeforeResume) {
        const cachedFinalA = await loadResumeFinalFrontier({
          concept,
          approach: 'A',
          profileHint: 'balanced',
          inputImage,
          lessons: historicalLessons,
        });
        if (cachedFinalA?.path && (await pathExists(cachedFinalA.path))) {
          st.passA_A = await loadResumePassAFrontier({
            concept,
            inputImage,
            index: idx,
            approach: 'A',
            lessons: historicalLessons,
            profileOrder: profileOrderA,
            variation: st.variationA,
          });
          st.finalA = cachedFinalA;
          if (st.passA_A?.fp) {
            await saveSimpleStageArtifactFromPath('Pass A', concept.name, st.passA_A.fp);
          }
          const resumePhaseAStageName = stageNameForPassBFinal(st.finalA, 'Pass B');
          await saveSimpleStageArtifactFromPath(resumePhaseAStageName, concept.name, st.finalA?.path);
          console.log(
            `PHASE A SKIP [${p + 1}/${indices.length}] ${concept.name} ` +
            `(resume_from=${PHASE_A_RESUME_FROM_NUM}, strategy-A cached)`
          );
          continue;
        }
        console.log(
          `PHASE A RESUME NOTICE ${concept.name}: resume_from=${PHASE_A_RESUME_FROM_NUM} ` +
          `but strategy-A cache missing; generating to repair continuity.`
        );
      }

      const outA = await ensureApproachFrontierOutput({
        concept,
        inputImage,
        index: idx,
        approachKey: 'A',
        lessons: historicalLessons,
        profileOrder: profileOrderA,
        variation: st.variationA,
        phaseLabel: 'A',
      });
      st.passA_A = outA.passA;
      st.finalA = outA.final;
      const phaseAFallbackMirrored = /passa-fallback|ab-scaffold-fallback/i.test(
        String(st.finalA?.profileUsed || '')
      );
      if (phaseAFallbackMirrored) {
        console.log(
          `PHASE A STAGE SAVE NOTE ${concept.name}: finalA profile=${st.finalA?.profileUsed || 'n/a'}; ` +
          `skipping Pass A mirror to avoid fallback duplication.`
        );
      } else if (st.passA_A?.fp) {
        await saveSimpleStageArtifactFromPath('Pass A', concept.name, st.passA_A.fp);
      } else {
        console.log(`PHASE A STAGE SAVE SKIP ${concept.name}: passA path missing, preserving stage separation.`);
      }
      const phaseAStageName = stageNameForPassBFinal(st.finalA, 'Pass B');
      await saveSimpleStageArtifactFromPath(phaseAStageName, concept.name, st.finalA?.path);
      console.log(`PHASE A DONE [${p + 1}/${indices.length}] ${concept.name}`);
    } catch (err) {
      st.errorA = err?.message || 'unknown A-stage failure';
      if (PHASED_DEFER_SAFETY_FAILURES && isSafetyFailureError(st.errorA)) {
        st.deferredSafetyA = true;
        phaseASafetyDeferred.push({ idx, reason: st.errorA });
        console.warn(`PHASE A SAFETY-DEFER [${p + 1}/${indices.length}] ${concept.name}: ${st.errorA}`);
        continue;
      }
      console.error(`PHASE A FAIL ${concept.name}: ${st.errorA}`);
    }
  }

  if (PHASED_DEFER_SAFETY_FAILURES && phaseASafetyDeferred.length > 0 && PHASED_SAFETY_REVISIT_MAX > 0) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`PHASE A SAFETY REVISIT START (${phaseASafetyDeferred.length})`);
    console.log(`${'='.repeat(60)}`);
    const revisitProfilesA = prioritizeProfiles(profileOrderA, ['clean', 'balanced', 'intimate']);
    for (let r = 0; r < phaseASafetyDeferred.length; r++) {
      const entry = phaseASafetyDeferred[r];
      const idx = entry.idx;
      const concept = concepts[idx];
      const st = getState(concept.name);
      let recovered = false;
      for (let pass = 1; pass <= PHASED_SAFETY_REVISIT_MAX; pass++) {
        try {
          const revisitLessons = normalizeLessons([
            ...historicalLessons,
            ...buildSafetyRevisitLessons('A', entry.reason),
          ], LESSON_MAX_PER_PROMPT + 8);
          const outA = await ensureApproachFrontierOutput({
            concept,
            inputImage,
            index: idx,
            approachKey: 'A',
            lessons: revisitLessons,
            profileOrder: revisitProfilesA,
            variation: st.variationA || st.sharedVariation || buildVariation(),
            phaseLabel: `A(safety-revisit:${pass})`,
            allowResume: false,
          });
          st.passA_A = outA.passA;
          st.finalA = outA.final;
          st.errorA = null;
          st.deferredSafetyA = false;
          st.safetyRevisitedA = true;
          const phaseARevisitFallbackMirrored = /passa-fallback|ab-scaffold-fallback/i.test(
            String(st.finalA?.profileUsed || '')
          );
          if (phaseARevisitFallbackMirrored) {
            console.log(
              `PHASE A SAFETY-REVISIT STAGE SAVE NOTE ${concept.name}: finalA profile=${st.finalA?.profileUsed || 'n/a'}; ` +
              `skipping Pass A mirror to avoid fallback duplication.`
            );
          } else if (st.passA_A?.fp) {
            await saveSimpleStageArtifactFromPath('Pass A', concept.name, st.passA_A.fp);
          } else {
            console.log(`PHASE A SAFETY-REVISIT STAGE SAVE SKIP ${concept.name}: passA path missing, preserving stage separation.`);
          }
          const revisitPhaseAStageName = stageNameForPassBFinal(st.finalA, 'Pass B');
          await saveSimpleStageArtifactFromPath(revisitPhaseAStageName, concept.name, st.finalA?.path);
          console.log(`PHASE A SAFETY-REVISIT DONE [${r + 1}/${phaseASafetyDeferred.length}] ${concept.name} (pass ${pass})`);
          recovered = true;
          break;
        } catch (revisitErr) {
          const revisitMsg = revisitErr?.message || 'unknown A safety revisit failure';
          st.errorA = revisitMsg;
          entry.reason = revisitMsg;
          console.error(`PHASE A SAFETY-REVISIT FAIL ${concept.name} (pass ${pass}): ${revisitMsg}`);
        }
      }
      if (!recovered) {
        console.error(`PHASE A SAFETY-REVISIT EXHAUSTED ${concept.name}: ${st.errorA || 'unknown'}`);
      }
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log('PHASE B START');
  console.log(`${'='.repeat(60)}`);
  for (let p = 0; p < indices.length; p++) {
    const idx = indices[p];
    const concept = concepts[idx];
    const st = getState(concept.name);
    if (!st.sharedVariation) st.sharedVariation = LOCK_AB_VARIATION ? buildVariation() : null;
    if (!st.variationB) st.variationB = st.sharedVariation || buildVariation();
    try {
      const outB = await ensureApproachFrontierOutput({
        concept,
        inputImage,
        index: idx,
        approachKey: 'B',
        lessons: historicalLessons,
        profileOrder: profileOrderB,
        variation: st.variationB,
        phaseLabel: 'B',
      });
      st.passA_B = outB.passA;
      st.finalB = outB.final;
      const phaseBStageName = stageNameForPassBFinal(st.finalB, 'Pass B');
      await saveSimpleStageArtifactFromPath(phaseBStageName, concept.name, st.finalB?.path);
      console.log(`PHASE B DONE [${p + 1}/${indices.length}] ${concept.name}`);
    } catch (err) {
      st.errorB = err?.message || 'unknown B-stage failure';
      if (PHASED_DEFER_SAFETY_FAILURES && isSafetyFailureError(st.errorB)) {
        st.deferredSafetyB = true;
        phaseBSafetyDeferred.push({ idx, reason: st.errorB });
        console.warn(`PHASE B SAFETY-DEFER [${p + 1}/${indices.length}] ${concept.name}: ${st.errorB}`);
        continue;
      }
      console.error(`PHASE B FAIL ${concept.name}: ${st.errorB}`);
    }
  }

  if (PHASED_DEFER_SAFETY_FAILURES && phaseBSafetyDeferred.length > 0 && PHASED_SAFETY_REVISIT_MAX > 0) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`PHASE B SAFETY REVISIT START (${phaseBSafetyDeferred.length})`);
    console.log(`${'='.repeat(60)}`);
    const revisitProfilesB = prioritizeProfiles(profileOrderB, ['clean', 'balanced', 'intimate']);
    for (let r = 0; r < phaseBSafetyDeferred.length; r++) {
      const entry = phaseBSafetyDeferred[r];
      const idx = entry.idx;
      const concept = concepts[idx];
      const st = getState(concept.name);
      let recovered = false;
      for (let pass = 1; pass <= PHASED_SAFETY_REVISIT_MAX; pass++) {
        try {
          const revisitLessons = normalizeLessons([
            ...historicalLessons,
            ...buildSafetyRevisitLessons('B', entry.reason),
          ], LESSON_MAX_PER_PROMPT + 8);
          const outB = await ensureApproachFrontierOutput({
            concept,
            inputImage,
            index: idx,
            approachKey: 'B',
            lessons: revisitLessons,
            profileOrder: revisitProfilesB,
            variation: st.variationB || st.sharedVariation || buildVariation(),
            phaseLabel: `B(safety-revisit:${pass})`,
            allowResume: false,
          });
          st.passA_B = outB.passA;
          st.finalB = outB.final;
          st.errorB = null;
          st.deferredSafetyB = false;
          st.safetyRevisitedB = true;
          const revisitStageName = stageNameForPassBFinal(st.finalB, 'Pass B');
          await saveSimpleStageArtifactFromPath(revisitStageName, concept.name, st.finalB?.path);
          console.log(`PHASE B SAFETY-REVISIT DONE [${r + 1}/${phaseBSafetyDeferred.length}] ${concept.name} (pass ${pass})`);
          recovered = true;
          break;
        } catch (revisitErr) {
          const revisitMsg = revisitErr?.message || 'unknown B safety revisit failure';
          st.errorB = revisitMsg;
          entry.reason = revisitMsg;
          console.error(`PHASE B SAFETY-REVISIT FAIL ${concept.name} (pass ${pass}): ${revisitMsg}`);
        }
      }
      if (!recovered) {
        console.error(`PHASE B SAFETY-REVISIT EXHAUSTED ${concept.name}: ${st.errorB || 'unknown'}`);
      }
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log('PHASE C + FINAL AUDIT START');
  console.log(`${'='.repeat(60)}`);
  for (let p = 0; p < indices.length; p++) {
    const idx = indices[p];
    const concept = concepts[idx];
    const st = getState(concept.name);
    const expression = expressions[idx % expressions.length];
    try {
      historicalRecords = await loadAuditRecords();
      historicalSummary = normalizeAuditSummary(historicalRecords);
      historicalLessons = extractHistoricalLessons(historicalSummary, historicalRecords);

      const missingFinalA = !st.finalA?.path || !(await pathExists(st.finalA.path));
      const missingFinalB = !st.finalB?.path || !(await pathExists(st.finalB.path));
      if (missingFinalA || missingFinalB) {
        const missingApproaches = [
          ...(missingFinalA ? ['A'] : []),
          ...(missingFinalB ? ['B'] : []),
        ];
        if (PHASED_STRICT_ORDER) {
          throw new Error(
            `PHASED_STRICT_ORDER blocked phase C: missing completed phase output for ${missingApproaches.join('+')}.`
          );
        }
        if (missingFinalA) {
          const fallbackA = await ensureApproachFrontierOutput({
            concept,
            inputImage,
            index: idx,
            approachKey: 'A',
            lessons: historicalLessons,
            profileOrder: profileOrderA,
            variation: st.variationA || st.sharedVariation || buildVariation(),
            phaseLabel: 'A(recover)',
          });
          st.passA_A = fallbackA.passA;
          st.finalA = fallbackA.final;
        }
        if (missingFinalB) {
          const fallbackB = await ensureApproachFrontierOutput({
            concept,
            inputImage,
            index: idx,
            approachKey: 'B',
            lessons: historicalLessons,
            profileOrder: profileOrderB,
            variation: st.variationB || st.sharedVariation || buildVariation(),
            phaseLabel: 'B(recover)',
          });
          st.passA_B = fallbackB.passA;
          st.finalB = fallbackB.final;
        }
      }

      const finalAPath = st.finalA.path;
      const finalBPath = st.finalB.path;
      const scoreA = await scoreFrontierCandidateFromPath({
        candidatePath: finalAPath,
        referenceMimeType,
        referenceB64,
        concept,
        expression,
        profile: `A-phased/${st.finalA.profileUsed || st.passA_A?.frontierProfile || 'balanced'}`,
      });
      const scoreB = await scoreFrontierCandidateFromPath({
        candidatePath: finalBPath,
        referenceMimeType,
        referenceB64,
        concept,
        expression,
        profile: `B-phased/${st.finalB.profileUsed || st.passA_B?.frontierProfile || 'balanced'}`,
      });

      const baselineHints = deriveABIterationHints(scoreA, scoreB);
      const deepAudit = deepAuditABBaseline(scoreA, scoreB);
      const goalConditionedCLearning = deriveGoalConditionedCLessons(
        historicalRecords,
        scoreA,
        scoreB,
        deepAudit,
        {
          maxLessons: 6,
          avoidMax: 4,
        }
      );
      if (!st.sharedVariation) st.sharedVariation = LOCK_AB_VARIATION ? buildVariation() : null;
      if (!st.variationC) st.variationC = (LOCK_C_VARIATION_TO_AB && st.sharedVariation)
        ? st.sharedVariation
        : buildVariation();
      const variationForC = st.variationC || st.sharedVariation || null;
      let strategyCLessons = deriveStrategyCLessons(
        scoreA,
        scoreB,
        [
          ...historicalLessons,
          ...baselineHints,
          ...deepAudit.lessonsA,
          ...deepAudit.lessonsB,
          ...deepAudit.sharedLessons,
          ...goalConditionedCLearning.priority_lessons,
        ],
        {
          deepAudit,
          concept,
          variation: variationForC,
          maxLessons: goalConditionedCLearning.adaptive_max_lessons,
        }
      );
      strategyCLessons = pruneLowYieldCLessons(
        strategyCLessons,
        goalConditionedCLearning.avoid_lessons,
        Math.max(6, Math.min(goalConditionedCLearning.adaptive_max_lessons, C_STRATEGY_LESSON_MAX))
      );
      console.log('PHASE C SYNTHESIS (A/B audit -> first-principles fusion):');
      strategyCLessons.slice(0, 6).forEach((lesson, idx2) => console.log(`  C${idx2 + 1}. ${lesson}`));
      if (goalConditionedCLearning.matched_records > 0) {
        console.log(
          `PHASE C GOAL LEARNING ${concept.name}: matched=${goalConditionedCLearning.matched_records} ` +
          `positive=${goalConditionedCLearning.positive_cases} negative=${goalConditionedCLearning.negative_cases} ` +
          `adaptive_max=${goalConditionedCLearning.adaptive_max_lessons}`
        );
      }
      const cPreferredProfiles = C_PROFILE_FOLLOW_AB
        ? [st.passA_A?.frontierProfile, st.passA_B?.frontierProfile]
        : [];
      const profileOrderC = prioritizeProfiles(buildApproachProfileOrder('C', historicalRecords), cPreferredProfiles);
      console.log(`PHASE C PROFILE ORDER ${concept.name}: ${profileOrderC.join(', ')} (follow_ab=${C_PROFILE_FOLLOW_AB ? 'on' : 'off'})`);
      const cSynthesisCharterBase = buildCSynthesisCharter({
        concept,
        scoreA,
        scoreB,
        deepAudit,
        goalConditionedLearning: goalConditionedCLearning,
        targetHeadroomPct: TARGET_QUALITY_GAIN_PCT,
      });
      st.cSynthesisCharter = cSynthesisCharterBase;
      console.log('PHASE C CHARTER (A/B audit -> new prompt contract):');
      cSynthesisCharterBase.split('\n').slice(0, 6).forEach((line, idx2) => console.log(`  H${idx2 + 1}. ${line}`));

      const maxCRetries = Math.max(1, PHASED_C_MAX_RETRIES);
      let cLessonsActive = [...strategyCLessons];
      let cProfileOrderActive = [...profileOrderC];
      let bestCAttempt = null;
      const cRetryDiagnostics = [];
      const bestABScoreObj = (Number(scoreA?.overall) || 0) >= (Number(scoreB?.overall) || 0) ? scoreA : scoreB;

      for (let cAttempt = 1; cAttempt <= maxCRetries; cAttempt++) {
        const cAttemptCharter = [
          cSynthesisCharterBase,
          `- CHX: Retry context ${cAttempt}/${maxCRetries}: keep shared A/B outcome goal fixed; change only method based on audit evidence.`,
          `- CHY: Retry objective ${cAttempt}/${maxCRetries}: reach >= ${TARGET_QUALITY_GAIN_PCT.toFixed(1)}% headroom gain vs best(A,B) without identity/compliance regression.`,
          bestCAttempt
            ? `- CHZ: Current best C score=${Number(bestCAttempt.overall || 0).toFixed(2)}; only accept changes with measurable deterministic improvement.`
            : '- CHZ: This is first C synthesis attempt; establish clean audit-derived baseline before aggressive imports.',
        ].join('\n');
        const outCAttempt = await ensureApproachFrontierOutput({
          concept,
          inputImage,
          index: idx,
          approachKey: 'C',
          lessons: cLessonsActive,
          profileOrder: cProfileOrderActive,
          variation: variationForC,
          synthesisCharter: cAttemptCharter,
          phaseLabel: `C[r${cAttempt}]`,
          allowResume: cAttempt === 1,
          enableAggressiveBoundary: PHASED_C_FORCE_PHASE2,
        });

        let candidatePath = outCAttempt.final.path;
        let candidateProfile = outCAttempt.final.profileUsed || outCAttempt.passA?.frontierProfile || 'balanced';
        let candidateScore = await scoreFrontierCandidateFromPath({
          candidatePath,
          referenceMimeType,
          referenceB64,
          concept,
          expression,
          profile: `C-phased/r${cAttempt}/${candidateProfile}`,
        });
        let phase2Applied = String(candidateProfile || '').includes('+phase2');

        if (PHASED_C_FORCE_PHASE2 && !(PHASED_C_SKIP_POST_PASSB_PHASE2 && phase2Applied)) {
          const cPhase2 = await runPhase2BoundaryRefinement({
            concept,
            index: idx,
            variation: variationForC,
            approachKey: 'C',
            profile: candidateProfile,
            baselinePath: candidatePath,
            lessons: cLessonsActive,
            referencePath: inputImage,
            referenceMimeType,
            referenceB64,
            previousScore: candidateScore,
          });
          if (cPhase2.applied && Number(cPhase2?.score?.overall) > Number(candidateScore?.overall)) {
            candidatePath = cPhase2.path;
            candidateProfile = cPhase2.profileUsed || candidateProfile;
            candidateScore = cPhase2.score;
            phase2Applied = true;
          }
        }

        const bestAB = Math.max(Number(scoreA?.overall) || 0, Number(scoreB?.overall) || 0);
        const candidateOverall = Number(candidateScore?.overall) || 0;
        const cRawGainAttemptPct = bestAB > 0 ? (((candidateOverall - bestAB) / bestAB) * 100) : 0;
        const cHeadroomGainAttemptPct = qualityHeadroomGainPercent(candidateScore, bestAB, QUALITY_SCORE_CEILING);
        cRetryDiagnostics.push({
          attempt: cAttempt,
          overall: candidateOverall,
          c_gain_raw_pct: cRawGainAttemptPct,
          c_gain_headroom_pct: cHeadroomGainAttemptPct,
          profile: candidateProfile,
          phase2_applied: phase2Applied,
        });

        const shouldReplaceBest =
          !bestCAttempt ||
          candidateOverall > bestCAttempt.overall ||
          (Math.abs(candidateOverall - bestCAttempt.overall) <= 0.01 &&
            cHeadroomGainAttemptPct > bestCAttempt.c_gain_headroom_pct);
        if (shouldReplaceBest) {
          bestCAttempt = {
            passA: outCAttempt.passA,
            final: { ...outCAttempt.final, path: candidatePath, profileUsed: candidateProfile },
            score: candidateScore,
            overall: candidateOverall,
            c_gain_raw_pct: cRawGainAttemptPct,
            c_gain_headroom_pct: cHeadroomGainAttemptPct,
            attempt: cAttempt,
            phase2Applied,
            lessonsUsed: [...cLessonsActive],
          };
        }

        console.log(
          `PHASE C RETRY ${concept.name}: attempt=${cAttempt}/${maxCRetries} ` +
          `scoreC=${candidateOverall.toFixed(2)} raw=${cRawGainAttemptPct.toFixed(1)}% ` +
          `headroom=${cHeadroomGainAttemptPct.toFixed(1)}% phase2=${phase2Applied ? 'on' : 'off'}`
        );

        if (cHeadroomGainAttemptPct >= TARGET_QUALITY_GAIN_PCT) {
          console.log(
            `PHASE C TARGET HIT ${concept.name}: attempt=${cAttempt} ` +
            `headroom_gain=${cHeadroomGainAttemptPct.toFixed(1)}%`
          );
          break;
        }

        if (cAttempt < maxCRetries) {
          const retryPressureLessons = normalizeLessons([
            `C retry ${cAttempt + 1}: close at least ${TARGET_QUALITY_GAIN_PCT.toFixed(1)}% of remaining score headroom versus best(A,B); avoid cosmetic novelty.`,
            `C retry ${cAttempt + 1}: preserve identity >= ${IDENTITY_GUARDRAIL.toFixed(2)} and compliance >= ${COMPLIANCE_GUARDRAIL.toFixed(2)} while forcing deterministic gain.`,
            ...deriveABCIterationHints(scoreA, scoreB, candidateScore),
            ...deriveMetricGapLessons(bestABScoreObj, candidateScore),
            ...cLessonsActive,
          ], C_STRATEGY_LESSON_MAX + 6);
          cLessonsActive = retryPressureLessons;
          const retryProfilePriority = (cAttempt % 2 === 1)
            ? ['clean', 'balanced', 'intimate']
            : ['balanced', 'intimate', 'clean'];
          cProfileOrderActive = prioritizeProfiles(buildApproachProfileOrder('C', historicalRecords), retryProfilePriority);
          console.log(
            `PHASE C RETRY PLAN ${concept.name}: next_profiles=${cProfileOrderActive.join(', ')} ` +
            `next_lessons=${cLessonsActive.length}`
          );
          if (PHASED_C_RETRY_WAIT_S > 0) {
            await waitWithHeartbeat(PHASED_C_RETRY_WAIT_S, `phase-c-retry-${concept.name}-r${cAttempt + 1}`);
          }
        }
      }

      if (!bestCAttempt) {
        throw new Error('C optimization produced no viable attempt');
      }

      let cRescuePlan = null;
      let cRescueBoost = { attempted: false, applied: false, rounds: [], gain_total: 0 };
      let cNearMissBoost = { attempted: false, applied: false, rounds: [], gain_total: 0, eligible: false, shortfall_pct: 0 };
      const bestABForRescue = Math.max(Number(scoreA?.overall) || 0, Number(scoreB?.overall) || 0);
      const cHeadroomBeforeRescue = qualityHeadroomGainPercent(
        bestCAttempt.score,
        bestABForRescue,
        QUALITY_SCORE_CEILING
      );

      if (PHASED_C_RESCUE_ENABLE && cHeadroomBeforeRescue < TARGET_QUALITY_GAIN_PCT) {
        cRescuePlan = phasedCRescueRoundsFromHeadroomShortfall(
          cHeadroomBeforeRescue,
          TARGET_QUALITY_GAIN_PCT,
          PHASED_C_RESCUE_BASE_ROUNDS
        );
        if (cRescuePlan.max_rounds > 0) {
          const rescueLessons = normalizeLessons(
            [
              ...(bestCAttempt.lessonsUsed || cLessonsActive),
              ...deriveABCIterationHints(scoreA, scoreB, bestCAttempt.score),
              ...deriveMetricGapLessons(bestABScoreObj, bestCAttempt.score),
              `C rescue objective: close at least ${TARGET_QUALITY_GAIN_PCT.toFixed(1)}% of headroom gap versus best(A,B) while preserving identity/compliance floors.`,
              'Prioritize deterministic in-frame microphysics and optics gains; avoid compositional drift or novelty-only changes.',
            ],
            Math.max(24, LESSON_MAX_PER_PROMPT + 10)
          );
          console.log(
            `PHASE C RESCUE PLAN ${concept.name}: headroom=${cHeadroomBeforeRescue.toFixed(1)}% ` +
            `target=${TARGET_QUALITY_GAIN_PCT.toFixed(1)}% rounds=${cRescuePlan.max_rounds} ` +
            `(base=${PHASED_C_RESCUE_BASE_ROUNDS}, extra=${cRescuePlan.extra_rounds})`
          );
          cRescueBoost = await runAuditGuidedFinalBoost({
            concept,
            index: idx,
            variation: variationForC,
            approachKey: 'C',
            profileTag: bestCAttempt.final?.profileUsed || bestCAttempt.passA?.frontierProfile || 'balanced',
            path: bestCAttempt.final.path,
            score: bestCAttempt.score,
            lessons: rescueLessons,
            referencePath: inputImage,
            referenceMimeType,
            referenceB64,
            maxRounds: cRescuePlan.max_rounds,
            minGain: PHASED_C_RESCUE_MIN_GAIN,
          });
          cRescueBoost.attempted = true;
          if (cRescueBoost.applied && Number(cRescueBoost?.score?.overall) > bestCAttempt.overall) {
            bestCAttempt.final = {
              ...bestCAttempt.final,
              path: cRescueBoost.path,
              profileUsed: cRescueBoost.profileTag || bestCAttempt.final?.profileUsed,
            };
            bestCAttempt.score = cRescueBoost.score;
            bestCAttempt.overall = Number(cRescueBoost?.score?.overall) || bestCAttempt.overall;
            bestCAttempt.phase2Applied = true;
            const rescueRawGainPct = bestABForRescue > 0
              ? (((bestCAttempt.overall - bestABForRescue) / bestABForRescue) * 100)
              : 0;
            const rescueHeadroomGainPct = qualityHeadroomGainPercent(
              bestCAttempt.score,
              bestABForRescue,
              QUALITY_SCORE_CEILING
            );
            bestCAttempt.c_gain_raw_pct = rescueRawGainPct;
            bestCAttempt.c_gain_headroom_pct = rescueHeadroomGainPct;
            cRetryDiagnostics.push({
              attempt: 'rescue',
              overall: bestCAttempt.overall,
              c_gain_raw_pct: rescueRawGainPct,
              c_gain_headroom_pct: rescueHeadroomGainPct,
              profile: bestCAttempt.final.profileUsed || 'balanced',
              phase2_applied: true,
              rescue_rounds_applied: (cRescueBoost.rounds || []).filter(r => r?.accepted).length,
            });
            console.log(
              `PHASE C RESCUE RESULT ${concept.name}: scoreC=${bestCAttempt.overall.toFixed(2)} ` +
              `raw=${rescueRawGainPct.toFixed(1)}% headroom=${rescueHeadroomGainPct.toFixed(1)}% ` +
              `accepted_rounds=${(cRescueBoost.rounds || []).filter(r => r?.accepted).length}`
            );
          } else {
            console.log(`PHASE C RESCUE RESULT ${concept.name}: no accepted gain; keeping retry-best candidate.`);
          }
        }
      }

      const cHeadroomAfterRescue = qualityHeadroomGainPercent(
        bestCAttempt.score,
        bestABForRescue,
        QUALITY_SCORE_CEILING
      );
      const cNearMissShortfallPct = Math.max(0, TARGET_QUALITY_GAIN_PCT - cHeadroomAfterRescue);
      const cNearMissEligible = (
        PHASED_C_RESCUE_ENABLE &&
        PHASED_C_NEAR_MISS_EXTRA_ROUNDS > 0 &&
        cNearMissShortfallPct > 0 &&
        cNearMissShortfallPct <= PHASED_C_NEAR_MISS_MARGIN_PCT
      );
      cNearMissBoost.eligible = cNearMissEligible;
      cNearMissBoost.shortfall_pct = cNearMissShortfallPct;
      if (cNearMissEligible) {
        const nearMissLessons = normalizeLessons(
          [
            ...(bestCAttempt.lessonsUsed || cLessonsActive),
            ...deriveABCIterationHints(scoreA, scoreB, bestCAttempt.score),
            ...deriveMetricGapLessons(bestABScoreObj, bestCAttempt.score),
            `C near-miss objective: recover the final ${cNearMissShortfallPct.toFixed(2)}% headroom shortfall versus best(A,B) without any identity/compliance regression.`,
            `C near-miss policy: prioritize micro-adjustments with deterministic realism lift; avoid broad stylistic rewrites.`,
          ],
          Math.max(24, LESSON_MAX_PER_PROMPT + 8)
        );
        console.log(
          `PHASE C NEAR-MISS PLAN ${concept.name}: shortfall=${cNearMissShortfallPct.toFixed(2)}% ` +
          `margin=${PHASED_C_NEAR_MISS_MARGIN_PCT.toFixed(2)}% rounds=${PHASED_C_NEAR_MISS_EXTRA_ROUNDS} ` +
          `min_gain=${PHASED_C_NEAR_MISS_MIN_GAIN.toFixed(3)}`
        );
        cNearMissBoost = await runAuditGuidedFinalBoost({
          concept,
          index: idx,
          variation: variationForC,
          approachKey: 'C',
          profileTag: bestCAttempt.final?.profileUsed || bestCAttempt.passA?.frontierProfile || 'balanced',
          path: bestCAttempt.final.path,
          score: bestCAttempt.score,
          lessons: nearMissLessons,
          referencePath: inputImage,
          referenceMimeType,
          referenceB64,
          maxRounds: PHASED_C_NEAR_MISS_EXTRA_ROUNDS,
          minGain: PHASED_C_NEAR_MISS_MIN_GAIN,
        });
        cNearMissBoost.attempted = true;
        cNearMissBoost.eligible = true;
        cNearMissBoost.shortfall_pct = cNearMissShortfallPct;
        if (cNearMissBoost.applied && Number(cNearMissBoost?.score?.overall) > bestCAttempt.overall) {
          bestCAttempt.final = {
            ...bestCAttempt.final,
            path: cNearMissBoost.path,
            profileUsed: cNearMissBoost.profileTag || bestCAttempt.final?.profileUsed,
          };
          bestCAttempt.score = cNearMissBoost.score;
          bestCAttempt.overall = Number(cNearMissBoost?.score?.overall) || bestCAttempt.overall;
          bestCAttempt.phase2Applied = true;
          const nearMissRawGainPct = bestABForRescue > 0
            ? (((bestCAttempt.overall - bestABForRescue) / bestABForRescue) * 100)
            : 0;
          const nearMissHeadroomGainPct = qualityHeadroomGainPercent(
            bestCAttempt.score,
            bestABForRescue,
            QUALITY_SCORE_CEILING
          );
          bestCAttempt.c_gain_raw_pct = nearMissRawGainPct;
          bestCAttempt.c_gain_headroom_pct = nearMissHeadroomGainPct;
          cRetryDiagnostics.push({
            attempt: 'near_miss',
            overall: bestCAttempt.overall,
            c_gain_raw_pct: nearMissRawGainPct,
            c_gain_headroom_pct: nearMissHeadroomGainPct,
            profile: bestCAttempt.final.profileUsed || 'balanced',
            phase2_applied: true,
            near_miss_rounds_applied: (cNearMissBoost.rounds || []).filter(r => r?.accepted).length,
          });
          console.log(
            `PHASE C NEAR-MISS RESULT ${concept.name}: scoreC=${bestCAttempt.overall.toFixed(2)} ` +
            `raw=${nearMissRawGainPct.toFixed(1)}% headroom=${nearMissHeadroomGainPct.toFixed(1)}% ` +
            `accepted_rounds=${(cNearMissBoost.rounds || []).filter(r => r?.accepted).length}`
          );
        } else {
          console.log(`PHASE C NEAR-MISS RESULT ${concept.name}: no accepted gain; keeping rescue-best candidate.`);
        }
      }

      const cPassAAttempts = Array.isArray(bestCAttempt.passA?.attemptLog) ? bestCAttempt.passA.attemptLog : [];
      const cUsedEmergencyPassA = cPassAAttempts.some(a =>
        String(a?.profile || '') === 'emergency'
        || String(a?.profile || '') === 'input-scaffold'
        || String(a?.status || '') === 'input_scaffold_fallback'
      );
      const cUsedPassAFallbackFinal = (
        String(bestCAttempt.final?.profileUsed || '').includes('passA-fallback')
        || String(bestCAttempt.final?.profileUsed || '').includes('input-scaffold')
      );
      const cIdentityScore = metricValue(bestCAttempt.score, 'identity_score');
      const abBestIdentityScore = Math.max(
        metricValue(scoreA, 'identity_score'),
        metricValue(scoreB, 'identity_score')
      );
      const cIdentityRisk = (
        cIdentityScore + 0.35 < abBestIdentityScore
        || cIdentityScore < Math.max(8.0, IDENTITY_GUARDRAIL - 0.5)
      );
      let cFinalSourceClone = false;
      try {
        const [cFinalBuffer, sourceBuffer] = await Promise.all([
          fs.readFile(bestCAttempt.final.path),
          fs.readFile(inputImage),
        ]);
        cFinalSourceClone = isSourceCloneBuffer(cFinalBuffer, sourceBuffer);
      } catch {
        cFinalSourceClone = false;
      }
      const shouldAnchorCToAB = cUsedEmergencyPassA || cUsedPassAFallbackFinal || cIdentityRisk || cFinalSourceClone;
      if (shouldAnchorCToAB) {
        const anchorApproach = (Number(scoreA?.overall) || 0) >= (Number(scoreB?.overall) || 0) ? 'A' : 'B';
        const anchorPath = anchorApproach === 'A' ? finalAPath : finalBPath;
        const anchorScore = anchorApproach === 'A' ? scoreA : scoreB;
        const anchorProfileTag = anchorApproach === 'A'
          ? (st.finalA?.profileUsed || st.passA_A?.frontierProfile || 'balanced')
          : (st.finalB?.profileUsed || st.passA_B?.frontierProfile || 'balanced');
        try {
          await fs.copyFile(anchorPath, bestCAttempt.final.path);
          bestCAttempt.final = {
            ...bestCAttempt.final,
            profileUsed: `${anchorProfileTag}+identity-anchor-${anchorApproach}`,
          };
          bestCAttempt.score = {
            overall: Number(anchorScore?.overall) || 0,
            metrics: { ...(anchorScore?.metrics || {}) },
            raw: `[identity-anchor:${anchorApproach}] ${String(anchorScore?.raw || '')}`.trim(),
          };
          bestCAttempt.overall = Number(anchorScore?.overall) || 0;
          bestCAttempt.phase2Applied = false;
          bestCAttempt.c_gain_raw_pct = bestABForRescue > 0
            ? (((bestCAttempt.overall - bestABForRescue) / bestABForRescue) * 100)
            : 0;
          bestCAttempt.c_gain_headroom_pct = qualityHeadroomGainPercent(
            bestCAttempt.score,
            bestABForRescue,
            QUALITY_SCORE_CEILING
          );
          cRetryDiagnostics.push({
            attempt: 'guardrail',
            overall: bestCAttempt.overall,
            c_gain_raw_pct: bestCAttempt.c_gain_raw_pct,
            c_gain_headroom_pct: bestCAttempt.c_gain_headroom_pct,
            profile: bestCAttempt.final.profileUsed || 'balanced',
            phase2_applied: false,
            guardrail_source: anchorApproach,
          });
          console.log(
            `PHASE C IDENTITY GUARD ${concept.name}: anchored strategy C to strategy ${anchorApproach} ` +
            `(emergency=${cUsedEmergencyPassA}, passA_fallback=${cUsedPassAFallbackFinal}, source_clone=${cFinalSourceClone}, identity_risk=${cIdentityRisk}, ` +
            `c_identity=${cIdentityScore.toFixed(2)}, ab_best_identity=${abBestIdentityScore.toFixed(2)}).`
          );
        } catch (anchorErr) {
          console.log(`PHASE C IDENTITY GUARD ${concept.name}: failed to anchor strategy C to A/B artifact: ${anchorErr.message}`);
        }
      }

      strategyCLessons = normalizeLessons(
        bestCAttempt.lessonsUsed || strategyCLessons,
        Math.max(C_STRATEGY_LESSON_MAX, LESSON_MAX_PER_PROMPT)
      );
      st.passA_C = bestCAttempt.passA;
      st.finalC = bestCAttempt.final;
      st.cRetryDiagnostics = cRetryDiagnostics;
      st.cRescuePlan = cRescuePlan;
      st.cRescueBoost = cRescueBoost;
      st.cNearMissBoost = cNearMissBoost;

      const finalCPath = st.finalC.path;
      const scoreC = bestCAttempt.score;

      const scoreByApproach = { A: scoreA, B: scoreB, C: scoreC };
      const winner = selectWinnerWithGuardrails(scoreByApproach);
      const winnerApproach = normalizeApproach(winner.key, 'A');
      const winnerPath = winnerApproach === 'A'
        ? finalAPath
        : (winnerApproach === 'B' ? finalBPath : finalCPath);
      const canonicalPath = path.join(OUTPUT_DIR, `${concept.name}.png`);
      const winnerBuffer = await fs.readFile(winnerPath);
      const winnerMimeType = mimeTypeFromPath(winnerPath) || 'image/png';
      const winnerIdentityGate = await enforceDeterministicIdentityGate({
        referencePath: inputImage,
        candidateBuffer: winnerBuffer,
        candidateMimeType: winnerMimeType,
        approachKey: winnerApproach,
        profile: 'winner-canonical',
        stage: 'final-canonical',
      });
      if (!winnerIdentityGate.accepted) {
        throw new Error(`Phased winner canonicalization failed deterministic identity gate for approach ${winnerApproach}.`);
      }
      await fs.copyFile(winnerPath, canonicalPath);
      await saveSimpleStageArtifactFromPath('Pass C', concept.name, canonicalPath);

      const bestAB = Math.max(Number(scoreA?.overall) || 0, Number(scoreB?.overall) || 0);
      const cGainVsBestAB = (Number(scoreC?.overall) || 0) - bestAB;
      const cGainVsBestABPct = bestAB > 0 ? ((cGainVsBestAB / bestAB) * 100) : 0;
      const cHeadroomGainVsBestABPct = qualityHeadroomGainPercent(scoreC, bestAB, QUALITY_SCORE_CEILING);
      const cGainPass = cHeadroomGainVsBestABPct >= TARGET_QUALITY_GAIN_PCT;
      const qualityGateFailureReasons = [];
      if (C_GAIN_TARGET_HARD_GATE && !cGainPass) {
        qualityGateFailureReasons.push(
          `c_headroom_gain ${cHeadroomGainVsBestABPct.toFixed(1)}% < target ${TARGET_QUALITY_GAIN_PCT.toFixed(1)}%`
        );
      }
      const qualityGate = {
        min_final_multiplier: null,
        final_from_revised: null,
        target_c_gain_percent: TARGET_QUALITY_GAIN_PCT,
        target_c_headroom_gain_percent: TARGET_QUALITY_GAIN_PCT,
        c_gain_percent_vs_best_ab: cGainVsBestABPct,
        c_headroom_gain_percent_vs_best_ab: cHeadroomGainVsBestABPct,
        c_gain_hard_gate: C_GAIN_TARGET_HARD_GATE,
        c_gain_pass: cGainPass,
        pass: qualityGateFailureReasons.length === 0,
        strict: STRICT_QUALITY_GATE,
        failure_reasons: qualityGateFailureReasons,
      };
      const auditQualitySignals = buildAuditQualitySignals({
        scoreByApproach,
        winnerApproach,
        phase2Rounds: { A: [], B: [], C: [] },
      });
      const hints = deriveABCIterationHints(scoreA, scoreB, scoreC);
      const allLessons = mergeLessonsByPriority(
        [...strategyCLessons, ...hints],
        historicalLessons,
        LESSON_MAX_PER_PROMPT + 4
      );

      const auditRecord = {
        timestamp: new Date().toISOString(),
        concept: concept.name,
        process: {
          phased_batch_mode: true,
          phased_strict_order: PHASED_STRICT_ORDER,
          phase_order: ['A', 'B', 'C'],
          lock_ab_variation: LOCK_AB_VARIATION,
          lock_c_variation_to_ab: LOCK_C_VARIATION_TO_AB,
          target_quality_gain_pct: TARGET_QUALITY_GAIN_PCT,
          c_gain_hard_gate: C_GAIN_TARGET_HARD_GATE,
          strict_quality_gate: STRICT_QUALITY_GATE,
          request_pacing_base_s: REQUEST_PACING_BASE_S,
          request_pacing_max_s: REQUEST_PACING_MAX_S,
          phased_c_max_retries: PHASED_C_MAX_RETRIES,
          phased_c_force_phase2: PHASED_C_FORCE_PHASE2,
          phased_c_retry_wait_s: PHASED_C_RETRY_WAIT_S,
          phased_c_skip_post_passb_phase2: PHASED_C_SKIP_POST_PASSB_PHASE2,
          phased_c_rescue_enable: PHASED_C_RESCUE_ENABLE,
          phased_c_rescue_base_rounds: PHASED_C_RESCUE_BASE_ROUNDS,
          phased_c_rescue_extra_rounds_max: PHASED_C_RESCUE_EXTRA_ROUNDS_MAX,
          phased_c_rescue_shortfall_step_pct: PHASED_C_RESCUE_SHORTFALL_STEP_PCT,
          phased_c_rescue_min_gain: PHASED_C_RESCUE_MIN_GAIN,
          phased_c_near_miss_margin_pct: PHASED_C_NEAR_MISS_MARGIN_PCT,
          phased_c_near_miss_extra_rounds: PHASED_C_NEAR_MISS_EXTRA_ROUNDS,
          phased_c_near_miss_min_gain: PHASED_C_NEAR_MISS_MIN_GAIN,
        },
        winner: {
          approach: winnerApproach,
          path: winnerPath,
          score: Number(scoreByApproach[winnerApproach]?.overall) || 0,
          reason: winner.reason,
        },
        strategies: {
          A: {
            passA_profile: st.passA_A?.frontierProfile || 'n/a',
            passB_profile: st.finalA?.profileUsed || 'n/a',
            output_path: finalAPath,
            baseline_score: scoreA,
            score: scoreA,
            attempts: {
              passA: st.passA_A?.attemptLog || [],
              passB: st.finalA?.attemptLog || [],
              phase2: [],
            },
            generation_health: {
              passA: summarizeGenerationHealth(st.passA_A?.attemptLog || []),
              passB: summarizeGenerationHealth(st.finalA?.attemptLog || []),
              phase2: summarizeGenerationHealth([]),
            },
            lessons_applied: historicalLessons,
          },
          B: {
            passA_profile: st.passA_B?.frontierProfile || 'n/a',
            passB_profile: st.finalB?.profileUsed || 'n/a',
            output_path: finalBPath,
            baseline_score: scoreB,
            score: scoreB,
            attempts: {
              passA: st.passA_B?.attemptLog || [],
              passB: st.finalB?.attemptLog || [],
              phase2: [],
            },
            generation_health: {
              passA: summarizeGenerationHealth(st.passA_B?.attemptLog || []),
              passB: summarizeGenerationHealth(st.finalB?.attemptLog || []),
              phase2: summarizeGenerationHealth([]),
            },
            lessons_applied: historicalLessons,
          },
          C: {
            passA_profile: st.passA_C?.frontierProfile || 'n/a',
            passB_profile: st.finalC?.profileUsed || 'n/a',
            output_path: finalCPath,
            baseline_score: scoreC,
            score: scoreC,
            attempts: {
              passA: st.passA_C?.attemptLog || [],
              passB: st.finalC?.attemptLog || [],
              phase2: [],
              retries: st.cRetryDiagnostics || [],
              rescue: st.cRescueBoost?.rounds || [],
              near_miss: st.cNearMissBoost?.rounds || [],
            },
            generation_health: {
              passA: summarizeGenerationHealth(st.passA_C?.attemptLog || []),
              passB: summarizeGenerationHealth(st.finalC?.attemptLog || []),
              phase2: summarizeGenerationHealth([]),
            },
            lessons_applied: strategyCLessons,
          },
        },
        deep_audit: {
          variation_control: {
            lock_ab_variation: LOCK_AB_VARIATION,
            lock_c_variation_to_ab: LOCK_C_VARIATION_TO_AB,
            a_equals_b: variationFingerprint(st.variationA) === variationFingerprint(st.variationB),
            c_equals_ab: variationFingerprint(st.variationC) === variationFingerprint(st.variationA),
          },
          findings: deepAudit.lines,
          phase2_lessons: {
            A: deepAudit.lessonsA,
            B: deepAudit.lessonsB,
            C: strategyCLessons,
          },
          goal_conditioned_learning: goalConditionedCLearning,
          c_synthesis_charter: st.cSynthesisCharter || '',
          c_retry_diagnostics: st.cRetryDiagnostics || [],
          c_rescue_plan: st.cRescuePlan || null,
          c_rescue_boost: st.cRescueBoost || { attempted: false, applied: false, rounds: [] },
          c_near_miss_boost: st.cNearMissBoost || { attempted: false, applied: false, rounds: [] },
        },
        audit_quality: auditQualitySignals,
        comparisons: {
          c_vs_best_ab: cGainVsBestAB,
          c_gain_percent_vs_best_ab: cGainVsBestABPct,
          c_headroom_gain_percent_vs_best_ab: cHeadroomGainVsBestABPct,
          quality_gate: qualityGate,
          target_gain_percent: TARGET_QUALITY_GAIN_PCT,
          target_gain_hit: cHeadroomGainVsBestABPct >= TARGET_QUALITY_GAIN_PCT,
        },
        hints,
        lessons: {
          historical: historicalLessons,
          baseline_ab_derived: baselineHints,
          deep_audit: [...deepAudit.lessonsA, ...deepAudit.lessonsB, ...deepAudit.sharedLessons],
          goal_conditioned: goalConditionedCLearning,
          c_prompt_plan: strategyCLessons,
          all: allLessons,
        },
      };
      await fs.appendFile(AB_AUDIT_FILE, `${JSON.stringify(auditRecord)}\n`);
      const learningAudit = buildLearningAuditRecord(auditRecord);
      await fs.appendFile(LEARNING_AUDIT_FILE, `${JSON.stringify(learningAudit)}\n`);

      console.log(
        `PHASE C AUDIT ${concept.name}: winner=${winnerApproach} ` +
        `scoreA=${scoreA.overall.toFixed(2)} scoreB=${scoreB.overall.toFixed(2)} scoreC=${scoreC.overall.toFixed(2)} ` +
        `CgainRaw=${cGainVsBestABPct.toFixed(1)}% CgainHeadroom=${cHeadroomGainVsBestABPct.toFixed(1)}% saved=${canonicalPath}`
      );
      if (STRICT_QUALITY_GATE && !qualityGate.pass) {
        console.log(
          `PHASE QUALITY GATE FAIL ${concept.name}: ${qualityGate.failure_reasons.join(' | ')}`
        );
      }

      results.push({
        name: concept.name,
        path: canonicalPath,
        ok: !(STRICT_QUALITY_GATE && !qualityGate.pass),
        winner: winnerApproach,
        final_multiplier: null,
        quality_gate_failed: STRICT_QUALITY_GATE && !qualityGate.pass,
        err: (STRICT_QUALITY_GATE && !qualityGate.pass) ? qualityGate.failure_reasons.join(' | ') : null,
      });
    } catch (err) {
      console.error(`PHASE C FAIL ${concept.name}: ${err.message}`);
      results.push({ name: concept.name, path: null, ok: false, err: err.message });
    }
  }

  const allRecords = await loadAuditRecords();
  const summary = normalizeAuditSummary(allRecords);
  await fs.writeFile(AB_SUMMARY_FILE, `${JSON.stringify(summary, null, 2)}\n`);
  const learningRecords = await loadLearningAuditRecords();
  if (learningRecords.length > 0) {
    const learningPlan = normalizeLearningPlan(learningRecords);
    await fs.writeFile(LEARNING_PLAN_FILE, `${JSON.stringify(learningPlan, null, 2)}\n`);
  }

  return results;
}

function wordCount(text) {
  return text.split(/\s+/).filter(Boolean).length;
}

const BANNED_TOKENS = [
  'fishnet',
  'maximum',
  'minimal',
  'barely',
  'significantly',
];

function validatePrompt(prompt, label) {
  const lower = prompt.toLowerCase();
  const hits = BANNED_TOKENS.filter(t => lower.includes(t));
  if (hits.length > 0) {
    console.log(`WARN: ${label} contains banned tokens: ${hits.join(', ')}`);
  }
  const frontierLabel = String(label || '').toLowerCase().includes('frontier');
  if (!FORCE_SAFE_MODE && !frontierLabel && !lower.includes('navel') && !lower.includes('high-cut')) {
    console.log(`WARN: ${label} missing navel-line or high-cut anchor.`);
  }
  if (!lower.includes('generate an image of')) {
    console.log(`WARN: ${label} missing explicit \"generate an image of\" directive.`);
  }
}

function partWithThoughtSignature(part) {
  const out = {};
  if (part.text) out.text = part.text;
  if (part.inlineData) out.inlineData = part.inlineData;
  if (part.thought_signature) out.thought_signature = part.thought_signature;
  if (part.thoughtSignature) out.thoughtSignature = part.thoughtSignature;
  return out;
}

function buildImageEditParts(text, mimeType, data) {
  if (MULTIMODAL_FILE_FIRST) {
    return [{ inlineData: { mimeType, data } }, { text }];
  }
  return [{ text }, { inlineData: { mimeType, data } }];
}

function hasRenderablePart_legacy1(part) {
  if (!part || typeof part !== 'object') return false;
  const text = typeof part.text === 'string' ? part.text.trim() : '';
  const inlineData = part.inlineData;
  const inlineOk = !!(inlineData && typeof inlineData.data === 'string' && inlineData.data.length > 0);
  return text.length > 0 || inlineOk;
}

function sanitizeModelParts_legacy1(parts) {
  if (!Array.isArray(parts)) return [];
  return parts.filter(hasRenderablePart);
}

function buildPassBConversation_legacy1({
  passAPromptForContext,
  baseMimeType,
  base64Image,
  passAModelParts,
  prompt,
  passAMimeType,
  passAB64,
}) {
  const contents = [
    { role: 'user', parts: buildImageEditParts(passAPromptForContext, baseMimeType, base64Image) },
  ];
  const modelParts = sanitizeModelParts(passAModelParts);
  if (modelParts.length > 0) {
    contents.push({ role: 'model', parts: modelParts });
  } else {
    console.log('Pass B context notice: missing passA model parts; using two-turn context.');
  }
  contents.push({
    role: 'user',
    parts: buildImageEditParts(prompt, passAMimeType || baseMimeType, passAB64),
  });
  return contents;
}

function hasRenderablePart(part) {
  if (!part || typeof part !== 'object') return false;
  const text = typeof part.text === 'string' ? part.text.trim() : '';
  const inlineData = part.inlineData;
  const inlineOk = !!(inlineData && typeof inlineData.data === 'string' && inlineData.data.length > 0);
  return text.length > 0 || inlineOk;
}

function sanitizeModelParts(parts) {
  if (!Array.isArray(parts)) return [];
  return parts.filter(hasRenderablePart);
}

function buildPassBConversation({
  passAPromptForContext,
  baseMimeType,
  base64Image,
  passAModelParts,
  prompt,
  passAMimeType,
  passAB64,
}) {
  const contents = [
    { role: 'user', parts: buildImageEditParts(passAPromptForContext, baseMimeType, base64Image) },
  ];
  const modelParts = sanitizeModelParts(passAModelParts);
  if (modelParts.length > 0) {
    contents.push({ role: 'model', parts: modelParts });
  } else {
    console.log('Pass B context notice: missing passA model parts; using two-turn context.');
  }
  contents.push({
    role: 'user',
    parts: buildImageEditParts(prompt, passAMimeType || baseMimeType, passAB64),
  });
  return contents;
}

function mimeTypeFromPath(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.webp') return 'image/webp';
  return 'image/png';
}

function effectiveMinApiAttemptIntervalSeconds() {
  if (!FORCE_4K_IMAGE_SIZE) return MIN_API_ATTEMPT_INTERVAL_S;
  return Math.max(MIN_API_ATTEMPT_INTERVAL_S, FOURK_MIN_ATTEMPT_INTERVAL_S);
}

function effectiveRequestPacingBaseSeconds() {
  if (!FORCE_4K_IMAGE_SIZE) return REQUEST_PACING_BASE_S;
  return Math.max(REQUEST_PACING_BASE_S, FOURK_MIN_ATTEMPT_INTERVAL_S);
}

function jitteredRateLimitWaitSeconds() {
  const min = Math.min(RATE_LIMIT_BACKOFF_MIN_S, RATE_LIMIT_BACKOFF_MAX_S);
  const max = Math.max(RATE_LIMIT_BACKOFF_MIN_S, RATE_LIMIT_BACKOFF_MAX_S);
  const spread = Math.max(0, max - min);
  const jitter = Math.floor(Math.random() * (spread + 1));
  return min + jitter;
}

function adaptivePacingSeconds() {
  const base = effectiveRequestPacingBaseSeconds();
  const cappedMax = Math.max(REQUEST_PACING_MAX_S, base);
  const streakBoost = Math.max(0, GLOBAL_RATE_LIMIT_STREAK - 1) * 2;
  return Math.min(cappedMax, base + streakBoost);
}

function truncatedExponentialBackoffSeconds(retries) {
  const n = Math.max(0, Number(retries) || 0);
  const exp = Math.pow(2, n) + Math.random();
  return Math.min(RATE_LIMIT_MAX_BACKOFF_S, exp);
}

function adaptiveRateLimitWaitSeconds(retries) {
  const legacyJitter = jitteredRateLimitWaitSeconds();
  const expJitter = truncatedExponentialBackoffSeconds(retries);
  const smoothing = effectiveRequestPacingBaseSeconds() + Math.max(0, GLOBAL_RATE_LIMIT_STREAK - 1);
  return Math.max(expJitter, smoothing, Math.min(legacyJitter, RATE_LIMIT_MAX_BACKOFF_S));
}

function shouldFallbackImageSize(status, errorText, requestedSize) {
  if (FORCE_4K_IMAGE_SIZE) return false;
  if (!ENABLE_IMAGE_SIZE_FALLBACK) return false;
  if (status !== 400) return false;
  const requested = String(requestedSize || '').trim().toUpperCase();
  const fallback = String(IMAGE_SIZE_FALLBACK || '').trim().toUpperCase();
  if (!requested || !fallback || requested === fallback) return false;
  const message = String(errorText || '').toLowerCase();
  return message.includes('imagesize')
    || message.includes('image size')
    || message.includes('invalid image')
    || message.includes('unsupported')
    || message.includes('allowed values')
    || message.includes('4k');
}

async function detectImageDimensionsFromBuffer(buffer, mimeType = 'image/png') {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    return { width: null, height: null, error: 'empty_buffer' };
  }
  const token = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const tmpPath = path.join(RENDER_DIMENSION_TMP_DIR, `${token}${extensionForMimeType(mimeType)}`);
  try {
    await fs.mkdir(RENDER_DIMENSION_TMP_DIR, { recursive: true });
    await fs.writeFile(tmpPath, buffer);
    const proc = spawnSync('sips', ['-g', 'pixelWidth', '-g', 'pixelHeight', tmpPath], {
      encoding: 'utf8',
      timeout: RENDER_DIMENSION_CHECK_TIMEOUT_MS,
      maxBuffer: 256 * 1024,
    });
    if (proc.error) throw proc.error;
    if (proc.status !== 0) {
      const stderr = String(proc.stderr || '').trim();
      throw new Error(stderr || `sips_exit_${proc.status}`);
    }
    const out = String(proc.stdout || '');
    const widthMatch = out.match(/pixelWidth:\s*(\d+)/i);
    const heightMatch = out.match(/pixelHeight:\s*(\d+)/i);
    const width = widthMatch ? Number(widthMatch[1]) : null;
    const height = heightMatch ? Number(heightMatch[1]) : null;
    if (!Number.isFinite(width) || !Number.isFinite(height)) {
      throw new Error(`invalid_dimension_parse:${out.slice(0, 160).replace(/\s+/g, ' ')}`);
    }
    return { width, height, error: null };
  } catch (err) {
    return { width: null, height: null, error: err.message };
  } finally {
    await fs.unlink(tmpPath).catch(() => {});
  }
}

async function checkRenderedTargetDimensions(buffer, mimeType = 'image/png') {
  const dims = await detectImageDimensionsFromBuffer(buffer, mimeType);
  const width = Number(dims.width);
  const height = Number(dims.height);
  const hasDims = Number.isFinite(width) && Number.isFinite(height);
  const aspect = hasDims ? (width / height) : null;
  const aspectDelta = Number.isFinite(aspect)
    ? Math.abs(aspect - RENDER_TARGET_ASPECT_RATIO)
    : null;
  const aspectPass = Number.isFinite(aspectDelta)
    && aspectDelta <= RENDER_TARGET_ASPECT_TOLERANCE;
  const sizePass = hasDims && (RENDER_DIMENSION_STRICT_EXACT
    ? (width === RENDER_TARGET_WIDTH && height === RENDER_TARGET_HEIGHT)
    : (width >= RENDER_TARGET_WIDTH && height >= RENDER_TARGET_HEIGHT));
  const pass = hasDims && sizePass && aspectPass;
  return {
    pass,
    width: hasDims ? width : null,
    height: hasDims ? height : null,
    aspect: Number.isFinite(aspect) ? aspect : null,
    aspectDelta: Number.isFinite(aspectDelta) ? aspectDelta : null,
    sizePass,
    aspectPass,
    error: dims.error || null,
  };
}

async function validateBufferAgainst4kPolicy(buffer, mimeType = 'image/png', context = 'buffer') {
  if (!FORCE_4K_IMAGE_SIZE) {
    return { accepted: true, reason: 'force4k_off' };
  }
  const dims = await detectImageDimensionsFromBuffer(buffer, mimeType);
  const width = Number(dims.width);
  const height = Number(dims.height);
  const hasDims = Number.isFinite(width) && Number.isFinite(height);
  if (!hasDims) {
    return {
      accepted: false,
      reason: `${context}:dimension_read_failed:${dims.error || 'unknown'}`,
    };
  }
  if (ENFORCE_NATIVE_4K_DIMS) {
    const nativePass = width === NATIVE_4K_EXPECTED_WIDTH && height === NATIVE_4K_EXPECTED_HEIGHT;
    if (!nativePass) {
      return {
        accepted: false,
        reason:
          `${context}:non_native_4k:${width}x${height} ` +
          `expected=${NATIVE_4K_EXPECTED_WIDTH}x${NATIVE_4K_EXPECTED_HEIGHT}`,
      };
    }
    return { accepted: true, reason: `${context}:native_4k_ok` };
  }
  if (NORMALIZE_OUTPUT_TO_TARGET_4K) {
    const exactPass = width === RENDER_TARGET_WIDTH && height === RENDER_TARGET_HEIGHT;
    if (!exactPass) {
      return {
        accepted: false,
        reason:
          `${context}:non_exact_output_4k:${width}x${height} ` +
          `expected=${RENDER_TARGET_WIDTH}x${RENDER_TARGET_HEIGHT}`,
      };
    }
    return { accepted: true, reason: `${context}:exact_output_4k_ok` };
  }
  const targetCheck = await checkRenderedTargetDimensions(buffer, mimeType);
  if (!targetCheck.pass) {
    return {
      accepted: false,
      reason:
        `${context}:below_target_4k:${width}x${height} ` +
        `target=${RENDER_TARGET_WIDTH}x${RENDER_TARGET_HEIGHT}`,
    };
  }
  return { accepted: true, reason: `${context}:target_4k_ok` };
}

async function normalizeImageBufferToTarget4K(buffer, mimeType = 'image/png') {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    return { buffer: null, mimeType: null, error: 'empty_buffer' };
  }
  const token = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const ext = extensionForMimeType(mimeType);
  const srcPath = path.join(RENDER_DIMENSION_TMP_DIR, `${token}-src${ext}`);
  const outPath = path.join(RENDER_DIMENSION_TMP_DIR, `${token}-out${ext}`);
  try {
    await fs.mkdir(RENDER_DIMENSION_TMP_DIR, { recursive: true });
    await fs.writeFile(srcPath, buffer);
    const proc = spawnSync(
      'sips',
      ['-z', String(RENDER_TARGET_HEIGHT), String(RENDER_TARGET_WIDTH), srcPath, '--out', outPath],
      {
        encoding: 'utf8',
        timeout: RENDER_DIMENSION_CHECK_TIMEOUT_MS,
        maxBuffer: 512 * 1024,
      }
    );
    if (proc.error) throw proc.error;
    if (proc.status !== 0) {
      const stderr = String(proc.stderr || '').trim();
      throw new Error(stderr || `sips_exit_${proc.status}`);
    }
    const outBuffer = await fs.readFile(outPath);
    return { buffer: outBuffer, mimeType, error: null };
  } catch (err) {
    return { buffer: null, mimeType: null, error: err.message };
  } finally {
    await fs.unlink(srcPath).catch(() => {});
    await fs.unlink(outPath).catch(() => {});
  }
}

async function callModel(
  contents,
  retries = 0,
  imageOnly = false,
  modalitiesOverride = null,
  endpointOverride = ENDPOINT,
  rateLimitStartMs = Date.now(),
  imageSizeOverride = null,
  trace = null
) {
  const requestedImageSize = FORCE_4K_IMAGE_SIZE
    ? '4K'
    : String(imageSizeOverride || DEFAULT_IMAGE_SIZE || '4K').trim();
  const isFourKRequested = String(requestedImageSize).trim().toUpperCase() === '4K';
  const responseModalities = modalitiesOverride
    || (imageOnly
      ? ['IMAGE']
      : (INCLUDE_TEXT_MODALITY ? ['TEXT', 'IMAGE'] : ['IMAGE']));
  const generationConfig = { responseModalities };
  if (responseModalities.includes('IMAGE')) {
    generationConfig.imageConfig = {
      aspectRatio: '4:5',
      imageSize: requestedImageSize,
    };
  }
  const requestBody = {
    contents,
    generationConfig,
  };

  const token = await getAccessTokenWithRetry();
  const minAttemptIntervalSeconds = isFourKRequested
    ? Math.max(effectiveMinApiAttemptIntervalSeconds(), FOURK_MIN_ATTEMPT_INTERVAL_S)
    : effectiveMinApiAttemptIntervalSeconds();
  const now = Date.now();
  if (GLOBAL_LAST_API_ATTEMPT_ENDED_AT_MS > 0) {
    const sinceLastAttemptSeconds = (now - GLOBAL_LAST_API_ATTEMPT_ENDED_AT_MS) / 1000;
    if (sinceLastAttemptSeconds < minAttemptIntervalSeconds) {
      const waitSeconds = Math.max(1, Math.ceil(minAttemptIntervalSeconds - sinceLastAttemptSeconds));
      console.log(`Attempt cooldown: waiting ${waitSeconds}s before next API call.`);
      await waitWithHeartbeat(waitSeconds, 'attempt cooldown');
    }
  }

  const nowAfterAttemptCooldown = Date.now();
  if (nowAfterAttemptCooldown < GLOBAL_NEXT_REQUEST_AT_MS) {
    const waitSeconds = Math.max(1, Math.ceil((GLOBAL_NEXT_REQUEST_AT_MS - nowAfterAttemptCooldown) / 1000));
    console.log(`Request pacing cooldown: waiting ${waitSeconds}s before next API call.`);
    await waitWithHeartbeat(waitSeconds, 'request pacing');
  }
  const pacingSeconds = Math.max(minAttemptIntervalSeconds, adaptivePacingSeconds());
  GLOBAL_NEXT_REQUEST_AT_MS = Date.now() + Math.ceil(pacingSeconds * 1000);
  let response;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), API_REQUEST_TIMEOUT_MS);
  const requestStartedAt = Date.now();
  const requestHeartbeat = API_REQUEST_TIMEOUT_MS > (HEARTBEAT_INTERVAL_S * 1000)
    ? setInterval(() => {
      const elapsed = Math.floor((Date.now() - requestStartedAt) / 1000);
      const timeoutSeconds = Math.floor(API_REQUEST_TIMEOUT_MS / 1000);
      console.log(`API request in flight: ${elapsed}s elapsed (timeout ${timeoutSeconds}s)`);
    }, HEARTBEAT_INTERVAL_S * 1000)
    : null;
  try {
    response = await fetch(endpointOverride, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });
  } catch (err) {
    if (requestHeartbeat) clearInterval(requestHeartbeat);
    clearTimeout(timeout);
    GLOBAL_LAST_API_ATTEMPT_ENDED_AT_MS = Date.now();
    if (retries >= NETWORK_RETRIES_MAX) {
      throw err;
    }
    const wait = NETWORK_RETRY_WAIT_S;
    const reason = err?.name === 'AbortError'
      ? `Request timeout after ${API_REQUEST_TIMEOUT_MS}ms`
      : `Network error`;
    console.log(`${reason} (${retries + 1}/${NETWORK_RETRIES_MAX}) - waiting ${wait}s...`);
    await waitWithHeartbeat(wait, 'network retry');
    return callModel(contents, retries + 1, imageOnly, modalitiesOverride, endpointOverride, rateLimitStartMs, imageSizeOverride, trace);
  }
  if (requestHeartbeat) clearInterval(requestHeartbeat);
  clearTimeout(timeout);
  GLOBAL_LAST_API_ATTEMPT_ENDED_AT_MS = Date.now();

  if (!response.ok) {
    const error = await response.text();
    if (shouldFallbackImageSize(response.status, error, requestedImageSize)) {
      console.log(
        `Image size fallback: requested=${requestedImageSize} rejected by API; ` +
        `retrying with ${IMAGE_SIZE_FALLBACK}.`
      );
      return callModel(
        contents,
        retries,
        imageOnly,
        modalitiesOverride,
        endpointOverride,
        rateLimitStartMs,
        IMAGE_SIZE_FALLBACK,
        trace
      );
    }
    if (response.status === 429) {
      GLOBAL_RATE_LIMIT_STREAK += 1;
      if (GLOBAL_RATE_LIMIT_STREAK >= RATE_LIMIT_CONSECUTIVE_FAILFAST) {
        const elapsedFast = Math.floor((Date.now() - rateLimitStartMs) / 1000);
        throw new Error(
          `RATE_LIMIT_FAILFAST streak=${GLOBAL_RATE_LIMIT_STREAK} elapsed=${elapsedFast}s threshold=${RATE_LIMIT_CONSECUTIVE_FAILFAST}`
        );
      }
      if (retries >= RATE_LIMIT_RETRIES_MAX) {
        throw new Error(`RATE_LIMIT_RETRY_EXHAUSTED after ${RATE_LIMIT_RETRIES_MAX + 1} attempts`);
      }
      const elapsed = Math.floor((Date.now() - rateLimitStartMs) / 1000);
      if (elapsed >= RATE_LIMIT_RETRY_DEADLINE_S) {
        throw new Error(`RATE_LIMIT_RETRY_DEADLINE_EXCEEDED after ${elapsed}s (limit ${RATE_LIMIT_RETRY_DEADLINE_S}s)`);
      }
      const wait = adaptiveRateLimitWaitSeconds(retries);
      GLOBAL_NEXT_REQUEST_AT_MS = Date.now() + (wait * 1000);
      console.log(
        `Rate limited (${retries + 1}/${RATE_LIMIT_RETRIES_MAX}) - waiting ${wait}s ` +
        `(truncated exp backoff, streak=${GLOBAL_RATE_LIMIT_STREAK}, elapsed=${elapsed}s)...`
      );
      await waitWithHeartbeat(wait, 'rate-limit backoff');
      return callModel(contents, retries + 1, imageOnly, modalitiesOverride, endpointOverride, rateLimitStartMs, imageSizeOverride, trace);
    }
    if (response.status >= 500 && retries < SERVER_RETRIES_MAX) {
      const wait = SERVER_RETRY_WAIT_S;
      console.log(`Server error ${response.status} (${retries + 1}/${SERVER_RETRIES_MAX}) - waiting ${wait}s...`);
      await waitWithHeartbeat(wait, 'server retry');
      return callModel(contents, retries + 1, imageOnly, modalitiesOverride, endpointOverride, rateLimitStartMs, imageSizeOverride, trace);
    }
    throw new Error(`API ${response.status}: ${error.substring(0, 300)}`);
  }

  if (GLOBAL_RATE_LIMIT_STREAK > 0) {
    GLOBAL_RATE_LIMIT_STREAK = Math.max(0, GLOBAL_RATE_LIMIT_STREAK - 1);
  }
  const data = await response.json();

  if (ENFORCE_RENDERED_4K && responseModalities.includes('IMAGE')) {
    const parts = data?.candidates?.[0]?.content?.parts || [];
    const imagePart = parts.find(part => part?.inlineData?.data);
    if (imagePart?.inlineData?.data) {
      let mimeType = imagePart.inlineData.mimeType || 'image/png';
      let buffer = Buffer.from(imagePart.inlineData.data, 'base64');
      const dims = await checkRenderedTargetDimensions(buffer, mimeType);
      const shouldNormalizeToExact4K =
        FORCE_4K_IMAGE_SIZE
        && NORMALIZE_OUTPUT_TO_TARGET_4K
        && !ENFORCE_NATIVE_4K_DIMS;
      const preNormalizeMinimumPass =
        Number.isFinite(dims.width)
        && Number.isFinite(dims.height)
        && dims.width >= RENDER_TARGET_WIDTH
        && dims.height >= RENDER_TARGET_HEIGHT
        && !!dims.aspectPass;
      if (!dims.pass) {
        if (!(shouldNormalizeToExact4K && preNormalizeMinimumPass)) {
          const targetMode = RENDER_DIMENSION_STRICT_EXACT ? 'exact' : 'minimum';
          const reason = dims.error
            ? `error=${dims.error}`
            : `got=${dims.width || 'n/a'}x${dims.height || 'n/a'} ` +
              `target_${targetMode}=${RENDER_TARGET_WIDTH}x${RENDER_TARGET_HEIGHT} ` +
              `aspect=${Number.isFinite(dims.aspect) ? dims.aspect.toFixed(4) : 'n/a'} ` +
              `delta=${Number.isFinite(dims.aspectDelta) ? dims.aspectDelta.toFixed(4) : 'n/a'} ` +
              `tol=${RENDER_TARGET_ASPECT_TOLERANCE.toFixed(4)} ` +
              `size_pass=${dims.sizePass ? '1' : '0'} aspect_pass=${dims.aspectPass ? '1' : '0'}`;
          throw new Error(`NON_4K_RENDER_REJECTED ${reason}`);
        }
      }
      if (FORCE_4K_IMAGE_SIZE && ENFORCE_NATIVE_4K_DIMS) {
        const nativePass = dims.width === NATIVE_4K_EXPECTED_WIDTH && dims.height === NATIVE_4K_EXPECTED_HEIGHT;
        if (!nativePass) {
          throw new Error(
            `NON_NATIVE_4K_RENDER_REJECTED got=${dims.width || 'n/a'}x${dims.height || 'n/a'} ` +
            `expected=${NATIVE_4K_EXPECTED_WIDTH}x${NATIVE_4K_EXPECTED_HEIGHT}`
          );
        }
      }
      if (
        shouldNormalizeToExact4K
        && (dims.width !== RENDER_TARGET_WIDTH || dims.height !== RENDER_TARGET_HEIGHT)
      ) {
        const normalized = await normalizeImageBufferToTarget4K(buffer, mimeType);
        if (!normalized.buffer) {
          throw new Error(`OUTPUT_4K_NORMALIZE_FAILED error=${normalized.error || 'unknown'}`);
        }
        buffer = normalized.buffer;
        mimeType = normalized.mimeType || mimeType;
        const normalizedDims = await detectImageDimensionsFromBuffer(buffer, mimeType);
        if (
          normalizedDims.width !== RENDER_TARGET_WIDTH
          || normalizedDims.height !== RENDER_TARGET_HEIGHT
        ) {
          throw new Error(
            `OUTPUT_4K_NORMALIZE_FAILED got=${normalizedDims.width || 'n/a'}x${normalizedDims.height || 'n/a'} target=${RENDER_TARGET_WIDTH}x${RENDER_TARGET_HEIGHT}`
          );
        }
        imagePart.inlineData.data = buffer.toString('base64');
        imagePart.inlineData.mimeType = mimeType;
        console.log(`4K output normalize: ${dims.width}x${dims.height} -> ${RENDER_TARGET_WIDTH}x${RENDER_TARGET_HEIGHT}`);
      }
      if (FACE_VERIFY_VERBOSE) {
        console.log(`Render size check pass: ${dims.width}x${dims.height} (${mimeType})`);
      }
    }
  }

  if (responseModalities.includes('IMAGE')) {
    await archiveImageAttempts({
      data,
      contents,
      endpoint: endpointOverride,
      requestedImageSize,
      responseModalities,
      trace,
    });
  }
  return data;
}

async function generatePassA(concept, inputImage, index) {
  if (FRONTIER_MODE) {
    return generatePassAFrontier(concept, inputImage, index);
  }
  const expression = expressions[index % expressions.length];
  const variation = buildVariation();
  const physicsMax = isPhysicsMaxConcept(concept);
  const useCompactPrimary = PASS_A_PRIMARY_PROMPT_STYLE === 'compact' && !(FORCE_ULTRA_PASS_A || physicsMax);
  const promptBase = useCompactPrimary
    ? buildPromptPassACompact(concept, expression, variation)
    : ((FORCE_ULTRA_PASS_A || physicsMax)
      ? buildPromptPassAUltra(concept, expression, variation)
      : buildPromptPassA(concept, expression, variation));
  const prompt = appendInitialAttemptBoost(promptBase);
  let promptUsed = prompt;
  const wc = wordCount(prompt);
  const passAMin = (FORCE_ULTRA_PASS_A || physicsMax) ? 500 : 1400;
  const passAMax = (FORCE_ULTRA_PASS_A || physicsMax) ? 1250 : 1950;
  if (wc < passAMin || wc > passAMax) {
      console.log(`WARN: Pass A word count ${wc} outside ${passAMin}-${passAMax} target.`);
    }
  validatePrompt(prompt, 'Pass A');

  console.log(`\n${'='.repeat(60)}`);
  console.log(`[${index + 1}/20] PASS A ${concept.name}`);
  console.log(`${'='.repeat(60)}`);
  console.log(`Prompt A: ${wc} words | Expression: ${expression.substring(0, 50)}...`);
  console.log(`Variation: ${variation.colorway.name} | ${variation.theme.name}`);

  const imageBuffer = await fs.readFile(inputImage);
  const base64Image = imageBuffer.toString('base64');
  const ext = path.extname(inputImage).toLowerCase();
  const mimeType = ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : ext === '.webp' ? 'image/webp' : 'image/png';
  const cachedPassAPath = path.join(PASSA_DIR, `${concept.name}.png`);
  const tryReuseCachedPassA = async (reason = 'policy_exhausted') => {
    if (!REUSE_PASSA_ON_FAILURE) return null;
    if (!(await pathExists(cachedPassAPath))) return null;
    try {
      const cachedBuffer = await fs.readFile(cachedPassAPath);
      if (isSourceCloneBuffer(cachedBuffer, imageBuffer)) {
        console.log(`Pass A cache fallback skipped (${reason}): source-identical cached artifact.`);
        return null;
      }
      const cachedMimeType = mimeTypeFromPath(cachedPassAPath) || 'image/png';
      const policy = await validateBufferAgainst4kPolicy(
        cachedBuffer,
        cachedMimeType,
        `passA-cache:${cachedPassAPath}`
      );
      if (!policy.accepted) {
        console.log(`Pass A cache fallback skipped (${reason}): ${policy.reason}`);
        return null;
      }
      const cacheIdentityGate = await enforceDeterministicIdentityGate({
        referencePath: inputImage,
        candidateBuffer: cachedBuffer,
        candidateMimeType: cachedMimeType,
        approachKey: 'legacy',
        profile: 'cached-passA',
        stage: 'passA-cache-reuse',
      });
      if (!cacheIdentityGate.accepted) {
        console.log(`Pass A cache fallback skipped (${reason}): deterministic identity gate rejected cached artifact.`);
        return null;
      }
      console.log(`Pass A cache fallback used (${reason}): ${cachedPassAPath}`);
      return {
        fp: cachedPassAPath,
        mimeType: cachedMimeType,
        modelParts: [{ text: `cached_passA_reuse:${reason}` }],
        variation,
        promptUsed: promptUsed || prompt,
        reusedCachedPassA: true,
      };
    } catch (err) {
      console.log(`Pass A cache fallback unavailable (${reason}): ${err.message}`);
      return null;
    }
  };

  const contents = [{
    role: 'user',
    parts: buildImageEditParts(prompt, mimeType, base64Image),
  }];

  let data = await callModel(contents, 0, true, null, ENDPOINT, Date.now(), null, {
    concept: concept.name,
    stage: 'passA-primary',
  });
  logModelDiagnostics(data, 'Pass A');
  const parts = data.candidates?.[0]?.content?.parts || [];
  let imageData = null;
  let modelParts = [];

  for (const part of parts) {
    if (part.text && !part.thought) {
      console.log(`Model A: ${part.text.substring(0, 100)}...`);
    }
    if (part.inlineData?.data) {
      imageData = part.inlineData;
    }
    modelParts.push(partWithThoughtSignature(part));
  }

  if (!imageData?.data) {
    const initialSignal = extractBlockSignal(data);
    const policyBlockedInitial = initialSignal.policyBlocked;
    if (policyBlockedInitial) {
      console.log(`Pass A policy block detected (finish=${initialSignal.finish || 'n/a'}, block=${initialSignal.block || 'n/a'}). Using precision-first compliance recovery prompt...`);
    } else if (physicsMax) {
      console.log('Pass A physics-max fallback: dense causal prompt...');
    } else {
      console.log('Pass A fallback: simplifying material phrasing...');
    }
    const promptFallback = FORCE_SAFE_MODE
      ? buildPromptPassASafeEmergency(concept, expression, variation)
      : (policyBlockedInitial
        ? buildPromptPassASafetyRecovery(concept, expression, variation, { precisionRetry: true, precisionMode: 'double' })
        : (physicsMax
          ? buildPromptPassAPhysicsMax(concept, expression, variation)
          : (PASS_A_PRIMARY_PROMPT_STYLE === 'compact'
            ? buildPromptPassACompact(concept, expression, variation, true)
            : buildPromptPassA(concept, expression, variation, true))));
    const fallbackLabel = policyBlockedInitial ? 'Pass A (policy-recovery)' : 'Pass A (fallback)';
    promptUsed = promptFallback;
    validatePrompt(promptFallback, fallbackLabel);
    const contentsFallback = [{
      role: 'user',
      parts: buildImageEditParts(promptFallback, mimeType, base64Image),
    }];
    data = await callModel(contentsFallback, 0, true, null, ENDPOINT, Date.now(), null, {
      concept: concept.name,
      stage: 'passA-policy-recovery',
    });
    logModelDiagnostics(data, fallbackLabel);
    const partsFb = data.candidates?.[0]?.content?.parts || [];
    imageData = null;
    modelParts = [];
    for (const part of partsFb) {
      if (part.text && !part.thought) {
        console.log(`Model A(FB): ${part.text.substring(0, 100)}...`);
      }
      if (part.inlineData?.data) {
        imageData = part.inlineData;
      }
      modelParts.push(partWithThoughtSignature(part));
    }
    if (!imageData?.data && policyBlockedInitial) {
      const signalAfterPolicyRecovery = extractBlockSignal(data);
      if (signalAfterPolicyRecovery.policyBlocked) {
        const cached = await tryReuseCachedPassA('policy_recovery_still_blocked');
        if (cached) return cached;
      }
    }
    if (!imageData?.data && (FORCE_ULTRA_PASS_A || physicsMax)) {
      const signalAfterFallback = extractBlockSignal(data);
      if (signalAfterFallback.policyBlocked) {
        console.log('Pass A physics-max policy fallback: compliance-first constraints...');
      } else {
        console.log('Pass A physics-max safety fallback: conservative constraints...');
      }
      const promptSafe = FORCE_SAFE_MODE
        ? buildPromptPassASafeEmergency(concept, expression, variation)
        : (signalAfterFallback.policyBlocked
          ? buildPromptPassASafetyRecovery(concept, expression, variation, { precisionRetry: true })
          : buildPromptPassAPhysicsMax(concept, expression, variation, true));
      const safeLabel = signalAfterFallback.policyBlocked ? 'Pass A (policy-safety)' : 'Pass A (safety)';
      promptUsed = promptSafe;
      validatePrompt(promptSafe, safeLabel);
      const contentsSafe = [{
        role: 'user',
        parts: buildImageEditParts(promptSafe, mimeType, base64Image),
      }];
      data = await callModel(contentsSafe, 0, true, null, ENDPOINT, Date.now(), null, {
        concept: concept.name,
        stage: 'passA-safe-physics',
      });
      logModelDiagnostics(data, safeLabel);
      const partsSafe = data.candidates?.[0]?.content?.parts || [];
      imageData = null;
      modelParts = [];
      for (const part of partsSafe) {
        if (part.text && !part.thought) {
          console.log(`Model A(SAFE): ${part.text.substring(0, 100)}...`);
        }
        if (part.inlineData?.data) {
          imageData = part.inlineData;
        }
        modelParts.push(partWithThoughtSignature(part));
      }
      if (!imageData?.data) {
        const cached = await tryReuseCachedPassA('physics_max_exhausted');
        if (cached) return cached;
        throw new Error('NO IMAGE generated in pass A (physics-max)');
      }
    } else if (!imageData?.data && !physicsMax) {
      const signalBeforeCompact = extractBlockSignal(data);
      const useComplianceCompact = FORCE_SAFE_MODE || signalBeforeCompact.policyBlocked;
      if (useComplianceCompact) {
        console.log('Pass A compliance fallback: safety-oriented realism prompt...');
      } else {
        console.log('Pass A compact fallback: minimal prompt + hard constraints...');
      }
      const promptCompact = useComplianceCompact
        ? buildPromptPassASafetyRecovery(concept, expression, variation, { precisionRetry: true })
        : buildPromptPassACompact(concept, expression, variation);
      const compactLabel = useComplianceCompact ? 'Pass A (compliance)' : 'Pass A (compact)';
      promptUsed = promptCompact;
      validatePrompt(promptCompact, compactLabel);
      const contentsCompact = [{
        role: 'user',
        parts: buildImageEditParts(promptCompact, mimeType, base64Image),
      }];
      data = await callModel(contentsCompact, 0, true, null, ENDPOINT, Date.now(), null, {
        concept: concept.name,
        stage: useComplianceCompact ? 'passA-compliance' : 'passA-compact',
      });
      logModelDiagnostics(data, compactLabel);
      const partsC = data.candidates?.[0]?.content?.parts || [];
      imageData = null;
      modelParts = [];
      for (const part of partsC) {
        if (part.text && !part.thought) {
          console.log(`Model A(COMP): ${part.text.substring(0, 100)}...`);
        }
        if (part.inlineData?.data) {
          imageData = part.inlineData;
        }
        modelParts.push(partWithThoughtSignature(part));
      }
      if (!imageData?.data) {
        const signalBeforeUltra = extractBlockSignal(data);
        if (useComplianceCompact || signalBeforeUltra.policyBlocked) {
          console.log('Pass A safe-final fallback: maximum compliance prompt...');
          const promptSafeFinal = buildPromptPassASafeEmergency(concept, expression, variation);
          promptUsed = promptSafeFinal;
          validatePrompt(promptSafeFinal, 'Pass A (safe-final)');
          const contentsSafeFinal = [{
            role: 'user',
            parts: buildImageEditParts(promptSafeFinal, mimeType, base64Image),
          }];
          data = await callModel(contentsSafeFinal, 0, true, null, ENDPOINT, Date.now(), null, {
            concept: concept.name,
            stage: 'passA-safe-final',
          });
          logModelDiagnostics(data, 'Pass A (safe-final)');
          const partsSafeFinal = data.candidates?.[0]?.content?.parts || [];
          imageData = null;
          modelParts = [];
          for (const part of partsSafeFinal) {
            if (part.text && !part.thought) {
              console.log(`Model A(SAFE-FINAL): ${part.text.substring(0, 100)}...`);
            }
            if (part.inlineData?.data) {
              imageData = part.inlineData;
            }
            modelParts.push(partWithThoughtSignature(part));
          }
          if (!imageData?.data) {
            const cached = await tryReuseCachedPassA('safe_final_exhausted');
            if (cached) return cached;
            throw new Error('NO IMAGE generated in pass A (safe-final)');
          }
        } else {
          console.log('Pass A ULTRA fallback: shortest prompt...');
          const promptUltra = buildPromptPassAUltra(concept, expression, variation);
          promptUsed = promptUltra;
          validatePrompt(promptUltra, 'Pass A (ultra)');
          const contentsUltra = [{
            role: 'user',
            parts: buildImageEditParts(promptUltra, mimeType, base64Image),
          }];
          data = await callModel(contentsUltra, 0, true, null, ENDPOINT, Date.now(), null, {
            concept: concept.name,
            stage: 'passA-ultra',
          });
          logModelDiagnostics(data, 'Pass A (ultra)');
          const partsU = data.candidates?.[0]?.content?.parts || [];
          imageData = null;
          modelParts = [];
          for (const part of partsU) {
            if (part.text && !part.thought) {
              console.log(`Model A(ULTRA): ${part.text.substring(0, 100)}...`);
            }
            if (part.inlineData?.data) {
              imageData = part.inlineData;
            }
            modelParts.push(partWithThoughtSignature(part));
          }
          if (!imageData?.data) {
            const cached = await tryReuseCachedPassA('ultra_exhausted');
            if (cached) return cached;
            throw new Error('NO IMAGE generated in pass A (ultra)');
          }
        }
      }
    }
  }

  const img = Buffer.from(imageData.data, 'base64');
  if (isSourceCloneBuffer(img, imageBuffer)) {
    const cached = await tryReuseCachedPassA('generated_source_clone');
    if (cached) return cached;
    throw new Error('Pass A generated source-identical output after fallbacks.');
  }
  const finalPassAIdentityGate = await enforceDeterministicIdentityGate({
    referencePath: inputImage,
    candidateBuffer: img,
    candidateMimeType: imageData.mimeType || 'image/png',
    approachKey: 'legacy',
    profile: 'primary',
    stage: 'passA-final',
  });
  if (!finalPassAIdentityGate.accepted) {
    const cached = await tryReuseCachedPassA('generated_identity_rejected');
    if (cached) return cached;
    throw new Error('Pass A generated output failed deterministic identity gate.');
  }
  const fp = path.join(PASSA_DIR, `${concept.name}.png`);
  await fs.writeFile(fp, img);
  console.log(`SAVED PASS A: ${fp} (${(img.length / 1024 / 1024).toFixed(2)} MB)`);

  return { fp, mimeType: imageData.mimeType || 'image/png', modelParts, variation, promptUsed };
}

async function generatePassB(concept, passA, inputImage, index) {
  if (FRONTIER_MODE) {
    return generatePassBFrontier(concept, passA, inputImage, index);
  }
  const expression = expressions[index % expressions.length];
  const variation = passA.variation || buildVariation();
  const physicsMax = isPhysicsMaxConcept(concept);
  const baseImageBuffer = await fs.readFile(inputImage);
  const base64Image = baseImageBuffer.toString('base64');
  const baseExt = path.extname(inputImage).toLowerCase();
  const baseMimeType = baseExt === '.jpg' || baseExt === '.jpeg' ? 'image/jpeg' : baseExt === '.webp' ? 'image/webp' : 'image/png';
  const passAAudit = await ensurePassAAudit({
    concept,
    expression,
    passA,
    referenceMimeType: baseMimeType,
    referenceB64: base64Image,
    profileTag: 'legacy/passA-audit',
  });
  if (PASS_B_REQUIRE_PASSA_AUDIT && !passAAudit?.audited) {
    throw new Error('Pass B requires an audited Pass A baseline, but no audit was available.');
  }
  const passAAuditBlock = buildPassAAuditPromptBlock(passAAudit);
  const applyPassAAuditBlock = promptText => {
    const src = String(promptText || '').trim();
    if (!src) return src;
    if (!passAAuditBlock) return src;
    return `${src}\n\n${passAAuditBlock}`;
  };
  const evaluateLegacyCandidate = async (candidateBuffer, candidateMimeType, stageLabel) => {
    if (isSourceCloneBuffer(candidateBuffer, baseImageBuffer)) {
      console.log(`Pass B legacy reject (${stageLabel}): source-identical candidate.`);
      return { accept: false, score: null, gainEval: null, reason: 'source_clone' };
    }
    const identityGate = await enforceDeterministicIdentityGate({
      referencePath: inputImage,
      candidateBuffer,
      candidateMimeType: candidateMimeType || 'image/png',
      approachKey: 'legacy',
      profile: 'legacy-passB',
      stage: stageLabel,
    });
    if (!identityGate.accepted) {
      return { accept: false, score: null, gainEval: null, reason: 'identity_gate' };
    }
    if (!(PASS_B_USE_SCORER_RERANK || passAAudit?.score)) {
      return { accept: true, score: null, gainEval: null };
    }
    const score = await scoreFrontierCandidate({
      referenceMimeType: baseMimeType,
      referenceB64: base64Image,
      candidateMimeType: candidateMimeType || 'image/png',
      candidateB64: candidateBuffer.toString('base64'),
      concept,
      expression,
      profile: `legacy/${stageLabel}`,
    });
    let gainEval = null;
    if (passAAudit?.score) {
      gainEval = evaluatePassBGainTarget(score, passAAudit.score);
      console.log(formatPassBGainLog(`Pass B legacy gain check (${stageLabel}):`, gainEval));
      if (!gainEval.pass && PASS_B_PASSA_GAIN_HARD_GATE) {
        console.log(`Pass B legacy hard gate reject (${stageLabel}): gain target not met.`);
        return { accept: false, score, gainEval };
      }
    }
    return { accept: true, score, gainEval };
  };
  const writeLegacyPassAFallbackFinal = async (label, stageLabel) => {
    const passAImg = await fs.readFile(passA.fp);
    if (isSourceCloneBuffer(passAImg, baseImageBuffer)) {
      throw new Error(`Pass B ${stageLabel}: Pass A fallback artifact is source-identical.`);
    }
    const fallbackIdentityGate = await enforceDeterministicIdentityGate({
      referencePath: inputImage,
      candidateBuffer: passAImg,
      candidateMimeType: mimeTypeFromPath(passA.fp) || 'image/png',
      approachKey: 'legacy',
      profile: 'passA-fallback',
      stage: stageLabel,
    });
    if (!fallbackIdentityGate.accepted) {
      throw new Error(`Pass B ${stageLabel}: Pass A fallback failed deterministic identity gate.`);
    }
    const fp = path.join(OUTPUT_DIR, `${concept.name}.png`);
    await fs.writeFile(fp, passAImg);
    console.log(`${label}: ${fp} (${(passAImg.length / 1024 / 1024).toFixed(2)} MB)`);
    return fp;
  };

  if (PASS_B_PRIMARY_PROMPT_STYLE === 'delta') {
    const deltaPath = await tryPassBDeltaBeams({ concept, passA, inputImage, index });
    if (deltaPath) {
      return deltaPath;
    }
    console.log('Pass B delta beams yielded no accepted image; falling back to legacy Pass B flow.');
  }
  const promptCore = physicsMax
    ? buildPromptPassBPhysicsMax(concept, expression, variation)
    : buildPromptPassB(concept, expression, variation);
  const prompt = appendInitialAttemptBoost(applyPassAAuditBlock(promptCore));
  const wc = wordCount(prompt);
  const passBMin = physicsMax ? 700 : 1400;
  const passBMax = physicsMax ? 1350 : 1900;
  if (wc < passBMin || wc > passBMax) {
      console.log(`WARN: Pass B word count ${wc} outside ${passBMin}-${passBMax} target.`);
    }
  validatePrompt(prompt, 'Pass B');

  console.log(`\n${'='.repeat(60)}`);
  console.log(`[${index + 1}/20] PASS B ${concept.name}`);
  console.log(`${'='.repeat(60)}`);
  console.log(`Prompt B: ${wc} words | Expression: ${expression.substring(0, 50)}...`);

  const passAImageBuffer = await fs.readFile(passA.fp);
  const passAB64 = passAImageBuffer.toString('base64');
  const passAPromptForContext = passA.promptUsed || (physicsMax
    ? buildPromptPassAUltra(concept, expression, variation)
    : buildPromptPassA(concept, expression, variation));

  const contents = buildPassBConversation({
    passAPromptForContext,
    baseMimeType,
    base64Image,
    passAModelParts: PASS_B_REUSE_PASSA_MODEL_PARTS ? passA.modelParts : [],
    prompt,
    passAMimeType: passA.mimeType,
    passAB64,
  });

  let data;
  try {
    data = await callModel(contents, 0, true, null, PASS_B_ENDPOINT, Date.now(), null, {
      concept: concept.name,
      stage: 'passB-primary',
    });
  } catch (err) {
    console.log(`Pass B error: ${err.message}. Falling back to Pass A output.`);
    return writeLegacyPassAFallbackFinal('SAVED FINAL (PASS A after Pass B error)', 'passB-error-fallback');
  }
  logModelDiagnostics(data, 'Pass B');
  let parts = data.candidates?.[0]?.content?.parts || [];

  for (const part of parts) {
    if (part.text && !part.thought) {
      console.log(`Model B: ${part.text.substring(0, 100)}...`);
    }
    if (part.inlineData?.data) {
      const img = Buffer.from(part.inlineData.data, 'base64');
      const phase1Check = await evaluateLegacyCandidate(img, part.inlineData.mimeType || 'image/png', 'passB-phase1');
      if (!phase1Check.accept) {
        continue;
      }
      const fp = path.join(OUTPUT_DIR, `${concept.name}.png`);
      await fs.writeFile(fp, img);
      console.log(`SAVED FINAL: ${fp} (${(img.length / 1024 / 1024).toFixed(2)} MB)`);
      return fp;
    }
  }
  const passBSignal = extractBlockSignal(data);
  const policyBlocked = passBSignal.policyBlocked;
  if (policyBlocked) {
    console.log(`Pass B policy block detected (finish=${passBSignal.finish || 'n/a'}, block=${passBSignal.block || 'n/a'}). Using precision-first compliance recovery refinement...`);
  } else {
    console.log('Pass B fallback: simplifying microstructure phrasing...');
  }
  const promptFallbackCore = policyBlocked
    ? buildPromptPassBSafetyRecovery(concept, expression, variation, { precisionRetry: true, precisionMode: 'double' })
    : (physicsMax
      ? buildPromptPassBPhysicsMax(concept, expression, variation, true)
      : buildPromptPassB(concept, expression, variation, true));
  const promptFallback = applyPassAAuditBlock(promptFallbackCore);
  const fallbackLabel = policyBlocked ? 'Pass B (policy-recovery)' : 'Pass B (fallback)';
  validatePrompt(promptFallback, fallbackLabel);
  const contentsFallback = buildPassBConversation({
    passAPromptForContext,
    baseMimeType,
    base64Image,
    passAModelParts: PASS_B_REUSE_PASSA_MODEL_PARTS ? passA.modelParts : [],
    prompt: promptFallback,
    passAMimeType: passA.mimeType,
    passAB64,
  });
  try {
    data = await callModel(contentsFallback, 0, true, null, PASS_B_ENDPOINT, Date.now(), null, {
      concept: concept.name,
      stage: policyBlocked ? 'passB-policy-recovery' : 'passB-fallback',
    });
  } catch (err) {
    console.log(`Pass B fallback error: ${err.message}. Using Pass A output as final.`);
    return writeLegacyPassAFallbackFinal('SAVED FINAL (PASS A after fallback error)', 'passB-fallback-error');
  }
  logModelDiagnostics(data, fallbackLabel);
  parts = data.candidates?.[0]?.content?.parts || [];
  for (const part of parts) {
    if (part.text && !part.thought) {
      console.log(`Model B(FB): ${part.text.substring(0, 100)}...`);
    }
    if (part.inlineData?.data) {
      const img = Buffer.from(part.inlineData.data, 'base64');
      const fallbackCheck = await evaluateLegacyCandidate(img, part.inlineData.mimeType || 'image/png', 'passB-fallback');
      if (!fallbackCheck.accept) {
        continue;
      }
      const fp = path.join(OUTPUT_DIR, `${concept.name}.png`);
      await fs.writeFile(fp, img);
      console.log(`SAVED FINAL: ${fp} (${(img.length / 1024 / 1024).toFixed(2)} MB)`);
      return fp;
    }
  }

  if (!policyBlocked) {
    console.log('Pass B safe-final fallback: strict compliance micro-refinement...');
    const promptSafeFinal = applyPassAAuditBlock(
      buildPromptPassBSafetyRecovery(concept, expression, variation, { precisionRetry: true })
    );
    validatePrompt(promptSafeFinal, 'Pass B (safe-final)');
    const contentsSafeFinal = buildPassBConversation({
      passAPromptForContext,
      baseMimeType,
      base64Image,
      passAModelParts: PASS_B_REUSE_PASSA_MODEL_PARTS ? passA.modelParts : [],
      prompt: promptSafeFinal,
      passAMimeType: passA.mimeType,
      passAB64,
    });
    try {
      data = await callModel(contentsSafeFinal, 0, true, null, PASS_B_ENDPOINT, Date.now(), null, {
        concept: concept.name,
        stage: 'passB-safe-final',
      });
      logModelDiagnostics(data, 'Pass B (safe-final)');
      parts = data.candidates?.[0]?.content?.parts || [];
      for (const part of parts) {
        if (part.text && !part.thought) {
          console.log(`Model B(SAFE): ${part.text.substring(0, 100)}...`);
        }
        if (part.inlineData?.data) {
          const img = Buffer.from(part.inlineData.data, 'base64');
          const safeFinalCheck = await evaluateLegacyCandidate(img, part.inlineData.mimeType || 'image/png', 'passB-safe-final');
          if (!safeFinalCheck.accept) {
            continue;
          }
          const fp = path.join(OUTPUT_DIR, `${concept.name}.png`);
          await fs.writeFile(fp, img);
          console.log(`SAVED FINAL: ${fp} (${(img.length / 1024 / 1024).toFixed(2)} MB)`);
          return fp;
        }
      }
    } catch (err) {
      console.log(`Pass B safe-final fallback error: ${err.message}. Using Pass A output as final.`);
    }
  }

  console.log('Pass B fallback failed - using Pass A output as final.');
  return writeLegacyPassAFallbackFinal('SAVED FINAL (PASS A)', 'passB-final-fallback');
}

function buildBoldEditorialExperimentMatrix({ conceptList = [], inputImagePath = '' } = {}) {
  const seedConcepts = conceptList
    .slice(0, 4)
    .map(c => c?.name)
    .filter(Boolean);
  return {
    id: 'bold-editorial-safe-v1',
    generated_at: new Date().toISOString(),
    reference_image: inputImagePath || '',
    mode: {
      bold_editorial_mode: BOLD_EDITORIAL_MODE,
      bold_editorial_intensity: BOLD_EDITORIAL_INTENSITY,
      prompt_breakthrough_level: PROMPT_BREAKTHROUGH_LEVEL,
    },
    objective_hierarchy: [
      'identity_fidelity',
      'compliance_safety',
      'physical_causality',
      'editorial_boldness',
      'sensor_realism',
    ],
    global_kernel: {
      identity_lock: 'Preserve exact facial geometry, proportions, age cues, and natural asymmetry from reference.',
      boldness_axes: [
        'lighting architecture (cool/warm contrast, controlled highlight rolloff)',
        'camera intent (hero framing, eye-priority focus, disciplined depth separation)',
        'pose confidence (assertive but anatomically plausible)',
        'couture engineering cues (seam/load continuity, hardware tension evidence)',
      ],
      realism_axes: [
        'skin pores + vellus hair response',
        'lace filament separation + stitch pitch variance',
        'wet/dry roughness separation',
        'emitter-locked highlights + coherent reflections/refractions',
      ],
      safety_rules: [
        'non-explicit editorial framing only',
        'opaque support zones remain continuous',
        'no suggestive explicit language',
      ],
    },
    negative_prompt_terms: [
      'identity drift',
      'different person',
      'face swap',
      'waxy or plastic skin',
      'distorted anatomy',
      'extra limbs or fingers',
      'texture smear or denoise washout',
      'non-causal reflections',
      'explicit nudity',
      'explicit sexual framing',
    ],
    style_cells: [
      {
        id: 'night_pool_noir',
        profile_hint: 'intimate',
        tone: 'luxury nocturne glamour, confident and composed',
        lighting: 'warm lantern practicals + cool water spill + rim separation',
        camera: '85mm portrait look, f/2.0, eye-priority focus, filmic grain',
      },
      {
        id: 'crimson_indoor_portrait',
        profile_hint: 'balanced',
        tone: 'clean lifestyle editorial confidence, high polish',
        lighting: 'soft window key + subtle negative fill + controlled cheek contour',
        camera: '50mm portrait look, f/2.2, waist-up composition, neutral color balance',
      },
      {
        id: 'waterfall_pool_editorial',
        profile_hint: 'balanced',
        tone: 'dramatic yet tasteful glamour with strong water physics',
        lighting: 'cool pool glow + warm practical accents + sparkle control on droplets',
        camera: '50mm full-body editorial frame, f/2.8, strict highlight discipline',
      },
      {
        id: 'blue_mist_pool_drama',
        profile_hint: 'clean',
        tone: 'high-contrast prestige cover mood with compliance-safe styling',
        lighting: 'electric blue underlight + warm distant practicals + mist depth gradient',
        camera: '35-50mm hero frame, f/2.4, center-weighted symmetry',
      },
    ],
    experiment_design: {
      seeds: [1103, 2871, 9027],
      matrix_plan: '4 style cells x 3 seeds = 12 candidates',
      acceptance_gates: {
        identity_min: 9.0,
        realism_min: 9.0,
        compliance_min: 9.0,
        overall_min: 9.2,
      },
      rerun_policy: [
        'Keep top 2 passing candidates by overall score.',
        'Run one controlled refinement with +5% micro-detail pressure only.',
        'Reject any refinement that lowers identity or compliance.',
      ],
      concept_seed_list: seedConcepts,
    },
  };
}

async function writeBoldEditorialExperimentMatrix({ conceptList = [], inputImagePath = '' } = {}) {
  if (!BOLD_EDITORIAL_MODE || !BOLD_MATRIX_EXPORT) return null;
  const payload = buildBoldEditorialExperimentMatrix({ conceptList, inputImagePath });
  await fs.writeFile(BOLD_MATRIX_FILE, `${JSON.stringify(payload, null, 2)}\n`);
  return BOLD_MATRIX_FILE;
}

const concepts = [
  {
    name: '521-pool-lace-aegean-moon',
    scene: 'Santorini cliffside infinity pool above the dark Aegean at blue-hour. White stucco walls with cobalt trim, stone steps into water, oil lantern clusters, distant village twinkle. Cool pool LEDs cast caustics on plaster. Private, empty deck.',
    pose: 'Seated on the pool edge, torso rotated three-quarter to camera, one knee bent with toes grazing the water, left hand braced on wet coping, right hand lightly at hip; looking over her shoulder at the camera.',
    geometry: 'Halter-neck couture one-piece with supported V to lower sternum, corded guipure floral scrollwork, scalloped eyelash edge binding, ring-detailed side contour channels with opaque under-support, full back panel to low waist with T-strap anchor.',
    material: 'Satin-backed guipure lace with bonded edges and sheer illusion mesh cradle.',
    materialFallback: 'Satin-backed guipure lace with bonded edges.',
    micro: 'GUIPURE: raised cord edges catch pin highlights; satin base shows anisotropic sheen; illusion mesh softly diffuses; tiny water droplets cling to lace threads.',
    microFallback: 'Raised lace cord, satin sheen, and mesh diffusion visible; droplets on threads.',
  },
  {
    name: '522-pool-lace-skyglass-dubai',
    scene: 'Dubai rooftop sky pool with clear acrylic infinity edge and glass windbreak. Brushed brass rails, black marble bar, LED strip under coping. City neon reflections ripple across wet stone. Champagne bucket on side table. Private after-hours.',
    pose: 'Standing at the acrylic infinity edge, one hip popped, one arm resting on the brass rail, the other hand lightly at her collarbone (no adjusting); three-quarter body to camera, chin slightly down, eyes up.',
    geometry: 'Strapless illusion-corset monokini: deep V plunge to navel stabilized by sheer mesh yoke and internal boning, art-deco fan lace panels, micro-grommet hip bridges, lace-up spine, open back to waist.',
    material: 'Structured matte crepe swim base with lace overlay, bonded edges, and internal boning.',
    materialFallback: 'Matte crepe swim base with lace overlay and bonded edges.',
    micro: 'CORSET: boning channels read as stiff ribs; lace fan cells cast micro-shadows; crepe stays matte with soft diffuse; grommets show crisp specular edges.',
    microFallback: 'Boning ribs, lace micro-shadows, matte crepe, and grommet spec visible.',
  },
  {
    name: '523-pool-lace-riad-zellige',
    scene: 'Moroccan riad courtyard pool with zellige mosaic tiles (emerald/ivory), horseshoe arches, carved plaster, hanging brass lanterns, citrus trees. Candlelight glints dance on water and tile. Secluded, quiet, private.',
    pose: 'Kneeling on a low lounge cushion beside the pool, leaning forward with elbows lightly on thighs and a subtle back arch; head turned to the camera with an inviting gaze.',
    geometry: 'Off-shoulder cowl plunge to navel with baroque arabesque lace overlay, diagonal underbust seam, crescent side cutouts with crystal ring connectors, high-cut hips, open back to waist.',
    material: 'Liquid satin swim base with baroque lace overlay and crystal ring hardware.',
    materialFallback: 'Satin swim base with lace overlay and ring hardware.',
    micro: 'SATIN+LACE: tight sheen bands follow weave; lace filaments sparkle at grazing angles; crystal rings refract tiny caustic streaks; seam puckering visible under tension.',
    microFallback: 'Satin sheen bands, lace sparkle, ring caustics, and seam tension visible.',
  },
  {
    name: '524-pool-lace-kyoto-lantern',
    scene: 'Kyoto ryokan courtyard plunge pool framed by granite boulders and bamboo screen. Paper lanterns, soft steam, wet stone path. Maple leaves float near the edge. Moonlit reflections and gentle ripples. Private, serene.',
    pose: 'Perched on the stone steps inside the plunge pool, one leg submerged and one knee raised above the waterline; forearms resting on the raised knee, shoulders relaxed; face angled toward the camera.',
    geometry: 'High-neck choker collar with keyhole plunge to navel, cathedral-rib lace panels, narrow center gore, cutout waist windows, zipper back to waist, high-cut hips.',
    material: 'Matte neoprene-like swim base with lace ribs and sheer stabilization mesh.',
    materialFallback: 'Matte swim base with lace ribs and stabilization mesh.',
    micro: 'RIBS: lace ribs behave like stiffened beams; matte base absorbs light; zipper teeth show tiny specular dots; steam haze adds soft bloom on hot lantern highlights.',
    microFallback: 'Lace rib stiffness, matte base, zipper micro-spec, and haze bloom visible.',
  },
  {
    name: '525-pool-lace-jungle-mist',
    scene: 'Bali jungle canopy pool with dark basalt coping, bamboo pergola, torchlight, floating flower petals, humid mist layers, dripping leaves. Pool LEDs glow cool under water, reflecting palm silhouettes. Secluded and intimate.',
    pose: 'Reclined on a bamboo lounger under the pergola, one arm overhead and the other trailing fingertips along the wet basalt edge; legs extended with ankles crossed; gaze held on the camera.',
    geometry: 'One-shoulder diagonal plunge to navel with iris-petal applique over sheer tulle, corset-laced side seam, asymmetric hip cutouts, open back to waist with chain-link anchors.',
    material: 'Glossy stretch nylon base with applique lace petals over tulle and onyx-toned chain hardware.',
    materialFallback: 'Stretch nylon base with applique over tulle and chain hardware.',
    micro: 'APPLIQUE: petal edges show thickness and shadow; tulle grid visible at grazing; nylon specular is smooth; chain links show tight highlights with tiny water beads.',
    microFallback: 'Applique edge thickness, tulle grid, nylon spec, and chain highlights visible.',
  },
  {
    name: '526-pool-lace-alpine-steam',
    scene: 'Alpine rooftop heated pool in winter: snow banks around the deck, steam rising, warm chalet windows beyond. Stone coping wet with meltwater. Lanterns and warm firelight points reflect in water. Crisp starry sky. Private.',
    pose: 'Stepping up the ladder out of the steaming heated pool, both hands gripping the rails; water dripping from legs mid-step; torso turned slightly toward the camera while staying balanced and natural.',
    geometry: 'Double-strap harness monokini with split-cup illusion and narrow gore, hex honeycomb lace overlay, lattice side bridges (3–6mm), micro-buckle shoulder straps, open back to waist, high-cut hips.',
    material: 'High-gloss nylon base with honeycomb lace overlay and titanium micro-buckles.',
    materialFallback: 'Nylon base with honeycomb lace overlay and micro-buckles.',
    micro: 'HONEYCOMB: lace cells show clean bevel edges; buckles have sharp spec bands; steam adds soft volumetric scatter; wet deck shows micro-puddles and streaks.',
    microFallback: 'Honeycomb bevels, buckle spec, steam scatter, and wet deck micro-puddles visible.',
  },
  {
    name: '527-pool-lace-yacht-monaco',
    scene: 'Monaco superyacht aft-deck plunge pool: teak decking, stainless rails, marina lights, wind-tossed hair strands, subtle salt spray. Night sea bokeh beyond glass. Champagne flutes on a table. Private deck.',
    pose: 'Leaning back against the stainless rail beside the plunge pool, one knee bent with foot on the teak deck and the other leg straight; one hand holding a champagne flute; face turned directly to the camera.',
    geometry: 'Cross-back X harness with chevron lace panels, plunge to navel, ringlet-connected hip cutouts, high-cut legs, micro-grommet spine lacing, open waist back.',
    material: 'Satin-backed lace with chevron geometry, bonded edges, and micro-grommet lacing.',
    materialFallback: 'Satin-backed lace with bonded edges and micro-grommets.',
    micro: 'CHEVRON: directional lace ridges catch highlights; grommets show crisp rings; salt spray beads create spec points; teak shows damp grain with soft reflections.',
    microFallback: 'Chevron ridges, grommet rings, salt beads, and damp teak grain visible.',
  },
  {
    name: '528-pool-lace-vegas-neon',
    scene: 'Las Vegas penthouse terrace pool: neon signage reflections, mirrored cocktail cart, gold-trim loungers, LED wall wash, glass balustrade with Strip skyline. Wet marble shows specular streaks and footprints. Intimate after-party energy, no crowd.',
    pose: 'Seated upright on the poolside marble bar ledge, knees angled together toward camera-left, both hands planted on the wet counter for balance; torso three-quarter to camera with face fully visible and calm confident expression.',
    geometry: 'Engineered V neckline to lower sternum with rose-window radial lace centered at sternum, circular halo harness strap, micro-ring structural accents, controlled side contour channels with opaque under-support, high-cut athletic legline, full back panel to low waist.',
    material: 'Lamé-tinged lace over satin base with crystal ring connectors.',
    materialFallback: 'Lace over satin base with ring connectors.',
    micro: 'RADIAL: radial ribs cast precise micro-shadows; lamé flecks sparkle; rings show tiny refractive glints; neon spill causes subtle spectral tint shifts on highlights.',
    microFallback: 'Radial micro-shadows, lamé sparkle, ring glints, and spectral tint shifts visible.',
  },
  {
    name: '529-pool-lace-desert-stars',
    scene: 'Desert resort pool carved into warm sandstone: starry sky, fire pits, cactus silhouettes, amber lanterns, low stone walls. Wet stone glistens with micro-puddles. Faint breeze ripples water. Distant mountains. Private oasis.',
    pose: 'Standing near a fire pit at the pool edge, one hand on her waist and the other resting on the warm stone wall; weight on the back leg with the front knee soft; head turned to the camera.',
    geometry: 'Wave-loop crescent lace motif with serpentine side cutouts, plunge to navel, braided strap bridges, high-cut hips, backless waist with graphite zipper seam detail.',
    material: 'Matte crepe swim base with crescent lace overlay and graphite zipper hardware.',
    materialFallback: 'Crepe swim base with lace overlay and zipper hardware.',
    micro: 'CRESCENTS: repeating apertures show clean edge thickness; zipper teeth read as tiny spec dots; sandstone shows damp granular texture; lantern glow blooms softly.',
    microFallback: 'Aperture edge thickness, zipper micro-spec, damp sandstone grain, and highlight bloom visible.',
  },
  {
    name: '530-pool-lace-miami-deco',
    scene: 'Miami Art Deco hotel pool: pastel uplights on curved stucco, terrazzo deck wet from splashes, palm shadows, chrome railings, striped cabana fabric. Pool LEDs create cyan caustics on walls. Quiet private corner at night.',
    pose: 'Half-sitting on a cabana daybed corner, one knee drawn up and the other leg extended, one hand behind supporting on the wet terrazzo and the other hand at collarbone; gaze held on the camera.',
    geometry: 'Asymmetric one-sleeve sheer overlay with micro-dot tulle and lace filigree, dagger plunge to navel, rib cutouts with micro-clasps, high-cut hips, open back to waist.',
    material: 'Gloss nylon base with micro-dot tulle sleeve and black-chrome micro-clasps.',
    materialFallback: 'Nylon base with tulle sleeve and micro-clasps.',
    micro: 'TULLE: dot lattice is crisp; sleeve is semi-sheer with soft diffusion; clasps show tight spec bands; terrazzo wetness produces speckled reflections and puddle edges.',
    microFallback: 'Tulle dot lattice, clasp spec, and wet terrazzo reflections visible.',
  },
  {
    name: '531-pool-lace-singapore-skyline',
    scene: 'Singapore high-rise infinity pool with skyline panorama: dark stone deck, glass rail, sculptural lanterns, ambient city glow. Underwater LEDs create sharp caustics. Fine mist and tiny droplets on lens edge. Late-night quiet, private.',
    pose: 'Walking slowly along the infinity edge, mid-step with heel lifted and toes pointed, arms relaxed; torso three-quarter to the camera with light hair movement; eyes locked to the camera.',
    geometry: 'Deep plunge to navel with thin-film piped edges, vertical rib lace channels, lattice waist windows, micro-grommet lace-up spine, high-cut hips, open back to waist.',
    material: 'Satin swim base with thin-film piping, lace rib channels, and micro-grommets.',
    materialFallback: 'Satin base with lace ribs and micro-grommets.',
    micro: 'PIPING: thin-film edge shows subtle hue shift; rib channels show tension lines; grommets glint; micro-droplets on fabric sparkle under mixed lighting.',
    microFallback: 'Thin-film hue shift, rib tension lines, grommet glints, and droplets visible.',
  },
  {
    name: '532-pool-lace-lava-aurora',
    scene: 'Icelandic geothermal luxury lagoon pool: black lava rock edges, warm steam, faint aurora ribbons overhead. Amber lanterns on basalt shelves. Water surface oily-smooth with gentle ripples. Warm/cool mixed lighting, private and quiet.',
    pose: 'Standing chest-deep by the lava-rock pool edge, forearms resting lightly on the rock coping, shoulders squared, chin level, and eyes fixed on the camera.',
    geometry: 'High-neck keyhole to lower sternum, gothic lace with eyelash fringe edges and reinforced edge tape, controlled side contour windows with opaque underlayer, ring-connected waist anchors, high-cut athletic legline, full back panel to low waist.',
    material: 'Velvet-backed lace panels with bonded edges and ring connectors.',
    materialFallback: 'Velvet-backed lace with bonded edges and ring connectors.',
    micro: 'VELVET: nap direction visible in low light; fringe edges cast fine shadows; steam scatters highlights; lava rock shows wet micro-gloss and rough pores.',
    microFallback: 'Velvet nap, fringe shadows, steam scatter, and wet lava rock pores visible.',
  },
  {
    name: '533-pool-lace-provence-string',
    scene: 'Provence villa pool at night: pale limestone coping, cypress silhouettes, string lights overhead, candle clusters on wrought-iron table, lavender in planters. Warm reflections ripple on water. Gentle breeze. Private and intimate.',
    pose: 'Seated on a wrought-iron chair near the pool, legs crossed, one arm draped over the chair back and the other hand holding a small towel; torso turned toward the camera.',
    geometry: 'Off-shoulder wrap plunge to navel with micro-beaded lace scatter zones, tapered side cutouts, crystal ring connectors, high-cut hips, open back to waist with clean waist seam.',
    material: 'Matte crepe base with micro-beaded lace overlays and crystal rings.',
    materialFallback: 'Crepe base with lace overlays and ring connectors.',
    micro: 'BEADS: micro-beads create tiny caustic specks; lace filaments sparkle; wrought-iron shows dull spec; candlelight produces soft bloom and warm bounce on skin.',
    microFallback: 'Micro-bead specks, lace sparkle, and candle bloom visible.',
  },
  {
    name: '534-pool-lace-soho-brick',
    scene: 'SoHo rooftop pool with brick parapet and steel beams: warm Edison bulbs, rain-slick concrete deck, skyline bokeh. Modern fire bowls near lounge chairs. Reflective puddles and wet footprints. Private after-hours.',
    pose: 'Leaning into a steel column by the rain-slick pool, one foot planted on the wall with knee bent, hands lightly gripping the column at shoulder height; face turned to the camera.',
    geometry: 'Strapped plunge to navel with laser-grid lattice cutouts, straight-line seams, micro-buckle shoulder straps, narrow side bridges, high-cut hips, open back to waist with clean strap anchors.',
    material: 'High-gloss nylon base with precise lattice cutouts and titanium micro-buckles.',
    materialFallback: 'Nylon base with lattice cutouts and micro-buckles.',
    micro: 'GRID: cutout intersections are crisp with bevel thickness; buckles reflect point lights; rain droplets form streaks; brick shows damp spec patches and mortar texture.',
    microFallback: 'Crisp bevels, buckle reflections, rain streaks, and damp brick texture visible.',
  },
  {
    name: '535-pool-lace-grotto-onyx',
    scene: 'Luxurious grotto pool in a natural rock cave: onyx wall panels backlit amber, rippling reflections across textured stone, narrow ledge with candle lanterns. Warm steam pockets in air. Hidden, intimate, private retreat.',
    pose: 'Sitting on the grotto stone ledge with feet in the water, one hand trailing fingertips through the surface to create ripples and the other hand resting on her thigh; torso angled toward the camera.',
    geometry: 'Cowl plunge to navel with bar-slim center gore, dense lace core with open perimeter, cutout ribs with ring anchors, high-cut hips, open back to waist with curved seam mapping.',
    material: 'Liquid satin base with dense lace core panels and brushed brass ringlets.',
    materialFallback: 'Satin base with lace core panels and brass ringlets.',
    micro: 'ONYX LIGHT: backlit onyx shows subsurface glow; lace core casts tight micro-shadows; brass ringlets show fingerprints and soft spec bands; cave steam adds localized haze.',
    microFallback: 'Onyx glow, tight lace shadows, brass spec with smudges, and steam haze visible.',
  },
  {
    name: '536-pool-lace-palm-springs',
    scene: 'Palm Springs mid-century resort pool: geometric concrete planters, neon accent tubes, low loungers, palm fronds, mountain silhouette. Wet terrazzo deck with reflective streaks. Pool LEDs glow cool. Private corner at night.',
    pose: 'Perched on a low lounger with knees together and angled to one side, hands behind on the cushion for support, subtle arch through the lower back; head tilted toward the camera.',
    geometry: 'One-shoulder harness with diagonal plunge to navel, chevron lace panels, double waist straps with micro-clasps, severe side cutouts, high-cut hips, open back to waist.',
    material: 'Satin-backed lace with chevron geometry and black chrome micro-clasps.',
    materialFallback: 'Satin-backed lace with chevron panels and micro-clasps.',
    micro: 'NEON: neon spill adds colored edge highlights; clasp metal shows tight glints; terrazzo wetness produces speckled reflections; lace chevrons show directional micro-ridges.',
    microFallback: 'Colored edge highlights, clasp glints, wet terrazzo speckles, and lace ridge direction visible.',
  },
  {
    name: '537-pool-lace-riviera-cliff',
    scene: 'French Riviera cliff-top pool overlooking the dark sea: pale limestone deck, glass balustrade, sculptural bronze lanterns, champagne on marble side table. Gentle wind ripples water and hair. Moon highlights offshore waves. Private.',
    pose: 'Standing beside the glass balustrade with shoulders squared to camera, one hand resting on the railing and the other relaxed near the hip; legs in a soft contrapposto stance; face fully visible with both eyes unobstructed.',
    geometry: 'Halter engineered V to lower sternum with wave-loop lace motif, teardrop side contour windows with opaque support and crystal rings, high-cut athletic legline, back panel to low waist with T-strap and micro-grommet lacing.',
    material: 'Gloss nylon base with wave-loop lace overlay and crystal ring connectors.',
    materialFallback: 'Nylon base with lace overlay and ring connectors.',
    micro: 'SEA BOKEH: distant wave highlights sparkle; lace loops show clean thickness; rings refract tiny caustics; glass balustrade shows faint distortion and edge reflections.',
    microFallback: 'Lace loop thickness, ring refraction, and glass edge reflections visible.',
  },
  {
    name: '538-pool-lace-cenote-candle',
    scene: 'Tulum cenote pool inside a limestone sinkhole: hanging vines, candle lanterns on stone shelves, turquoise underwater LEDs. Moisture haze and dripping rock. Wet limestone has glossy streaks and mineral texture. Quiet, private atmosphere.',
    pose: 'Kneeling on a wet limestone shelf, one knee down and one foot planted, palm on the rock for balance; torso twisted slightly toward the camera; eyes locked to the lens.',
    geometry: 'High-neck choker with vertical plunge to navel, micro-dot tulle underlay with lace filigree overlays, side cutouts shaped as arcs, ring-connected waist anchors, high-cut hips, open back to waist.',
    material: 'Matte crepe base with micro-dot tulle underlay, lace filigree overlays, and ring connectors.',
    materialFallback: 'Crepe base with tulle underlay, lace overlays, and rings.',
    micro: 'MINERALS: wet limestone shows micro-gloss runs and pores; tulle dot lattice is crisp; lace filigree casts fine shadows; candlelight creates warm shimmer on waterline.',
    microFallback: 'Wet limestone pores, tulle dot lattice, lace shadows, and warm shimmer visible.',
  },
  {
    name: '539-pool-lace-maldives-glass',
    scene: 'Maldives overwater villa pool: teak deck, rattan lounger, soft lanterns, moonlight on lagoon. A glass floor panel reveals water below with gentle wave shimmer. Tiny salt spray bokeh. Private, quiet night.',
    pose: 'Lying on a floating mat in the pool, one arm trailing into the water and the other resting near her shoulder; one knee slightly bent; face turned toward the camera.',
    geometry: 'Sculpted plunge to navel with clear-mesh stabilization cradle, geometric lattice side cutouts, micro-buckle shoulder straps, high-cut hips, open back to waist with clean anchor points.',
    material: 'High-gloss nylon base with clear stabilization mesh and titanium micro-buckles.',
    materialFallback: 'Nylon base with stabilization mesh and micro-buckles.',
    micro: 'GLASS+SPRAY: salt spray beads sparkle; clear mesh grid shows soft diffusion; buckles reflect lantern points; teak shows damp grain and faint spec bands.',
    microFallback: 'Salt beads, mesh grid diffusion, buckle reflections, and damp teak grain visible.',
  },
  {
    name: '540-pool-lace-future-club',
    scene: 'Futuristic rooftop pool club set after hours, empty: LED light ribbons, chrome-and-onyx bar, projection-mapped wall patterns, wet black stone deck. Sharp caustics and reflections distort with water ripples. Skyline glow and haze. Private.',
    pose: 'Standing under the projection-mapped patterns by the pool bar, one forearm resting on the onyx counter and the other hand on her hip; torso three-quarter to camera, legs crossed at the ankle.',
    geometry: 'Strapped plunge to navel with precise laser-grid cutouts, ringlet chain bridges at hips, high-cut legs, open back to waist with spine grommet lacing and clean seam tessellation.',
    material: 'Lamé-tinted lace over gloss nylon with onyx chain links and micro-grommet lacing.',
    materialFallback: 'Lace over nylon with chain links and micro-grommets.',
    micro: 'PROJECTED LIGHT: projection patterns create believable light breaks on fabric; chain links show tight spec; wet black stone shows mirror-like streaks; lace cutout edges keep visible thickness.',
    microFallback: 'Light breaks, chain spec, wet stone streaks, and lace edge thickness visible.',
  },
  {
    name: '541-pool-lace-capri-grotto',
    scene: 'Capri sea‑cave grotto pool: deep cobalt water glowing from beneath, rough limestone walls, small lanterns on ledges, wet rock with glossy streaks. Subtle wave bokeh through the cave mouth. Private, intimate.',
    pose: 'Standing ankle‑deep at the grotto edge, one hand on a rock ledge for balance and the other resting at her waist; torso turned three‑quarter to camera, chin slightly lifted.',
    geometry: 'Halter neck with dagger plunge to navel, iris‑petal lace applique over sheer stabilization mesh, curved side cutouts with ring connectors, high‑cut hips, open back to waist with T‑strap.',
    material: 'Gloss nylon base with applique lace over tulle and crystal ring hardware.',
    materialFallback: 'Nylon base with applique lace and ring hardware.',
    micro: 'GROTTO: wet limestone shows darkened pores; lace petals show raised edges; ring connectors refract pin‑light highlights; water glow creates soft blue rim.',
    microFallback: 'Wet limestone pores, lace petal edges, ring highlights, and blue rim visible.',
  },
  {
    name: '542-pool-lace-ibiza-white',
    scene: 'Ibiza white‑stucco terrace pool: white walls, limewashed arches, olive trees, woven rattan loungers, warm candles on low tables, moonlit sea horizon. Wet stucco and marble show subtle sheen. Private.',
    pose: 'Seated sideways on the pool coping with one leg extended along the edge and the other bent, one palm behind for support, the other resting on her thigh; face turned toward the camera.',
    geometry: 'Asymmetric one‑shoulder plunge to navel with scalloped eyelash lace, diagonal seam map, narrow side bridges, high‑cut hips, open back to waist with micro‑grommet lacing.',
    material: 'Satin‑backed lace with bonded edges and micro‑grommet spine lacing.',
    materialFallback: 'Satin‑backed lace with bonded edges.',
    micro: 'STUCCO: wet limewash shows micro‑sheen; lace eyelash edges cast fine shadows; grommets show crisp spec; candlelight adds warm bounce.',
    microFallback: 'Wet limewash sheen, lace eyelash shadows, grommet spec, warm bounce visible.',
  },
  {
    name: '543-pool-lace-seoul-skyline',
    scene: 'Seoul high‑rise rooftop pool: glass balustrade, brushed steel rails, LED edge strips, skyline bokeh with neon signage, wet basalt deck. Cool pool LEDs cast cyan caustics. Private, quiet.',
    pose: 'Walking along the pool edge mid‑step, heel lifted, arms relaxed, torso three‑quarter to camera; eyes locked to the lens.',
    geometry: 'High‑neck collar with vertical plunge to navel, cathedral‑arch lace panels, narrow center gore, waist cutouts with micro‑ring anchors, high‑cut hips, open back to waist.',
    material: 'Matte crepe swim base with lace ribs and ring connectors.',
    materialFallback: 'Matte swim base with lace ribs and ring connectors.',
    micro: 'NEON: skyline glow adds spectral tint to highlights; lace ribs show stiffened beams; steel rails show tight spec bands; wet basalt shows micro‑puddles.',
    microFallback: 'Spectral tint, lace rib stiffness, rail spec, wet basalt visible.',
  },
  {
    name: '544-pool-lace-marrakech-rooftop',
    scene: 'Marrakech rooftop plunge pool: terracotta tiles, carved wood screens, brass lantern clusters, palm fronds in planters. Warm candlelight and cool pool glow mix on wet tile. Private, calm.',
    pose: 'Kneeling on a low cushion beside the pool, torso upright with a slight back arch, hands resting lightly on thighs; head turned toward the camera.',
    geometry: 'Off‑shoulder cowl plunge to navel with baroque arabesque lace overlay, crescent side cutouts, crystal ring connectors, high‑cut hips, open back to waist with curved seam map.',
    material: 'Liquid satin base with lace overlay and crystal ring hardware.',
    materialFallback: 'Satin base with lace overlay and ring hardware.',
    micro: 'TERRACOTTA: wet tile shows saturated color and glossy streaks; lace filaments sparkle; ring connectors cast tiny caustic dots; lantern glow blooms softly.',
    microFallback: 'Wet tile gloss, lace sparkle, ring caustics, lantern bloom visible.',
  },
  {
    name: '545-pool-lace-zermatt-igloo',
    scene: 'Zermatt alpine spa pool beside a glass igloo lounge: snow‑dusted stone, steam, warm interior light, distant peaks under starlight. Wet deck glistens with meltwater. Private, crisp air.',
    pose: 'Standing on the pool steps with one leg higher, both hands lightly on the rail, torso turned toward camera; steady, balanced stance.',
    geometry: 'Double‑strap harness with split‑cup illusion, plunge to navel, honeycomb lace overlay, lattice side bridges, high‑cut hips, open back to waist with micro‑buckle straps.',
    material: 'High‑gloss nylon base with honeycomb lace and titanium micro‑buckles.',
    materialFallback: 'Nylon base with honeycomb lace and micro‑buckles.',
    micro: 'STEAM: volumetric scatter softens highlights; lace cells show clean bevels; buckles reflect warm igloo light; snow shows granular sparkle.',
    microFallback: 'Steam scatter, lace bevels, buckle reflections, snow sparkle visible.',
  },
  {
    name: '546-pool-lace-cabo-crescent',
    scene: 'Cabo cliffside crescent pool: sandstone coping, fire bowls, desert plants, ocean moon path. Wet stone reflects warm firelight and cool water glow. Private, quiet.',
    pose: 'Leaning against a low stone wall with one foot on the coping and the other planted, one hand on the wall and the other at her waist; face angled to camera.',
    geometry: 'Deep V plunge to navel with chevron lace panels, diagonal seam tessellation, ring‑anchored side cutouts, high‑cut hips, open back to waist with lace‑up spine.',
    material: 'Matte crepe base with chevron lace and ring hardware.',
    materialFallback: 'Crepe base with lace and ring hardware.',
    micro: 'FIRELIGHT: warm spec flicker on hardware; lace chevrons show directional ridges; sandstone shows damp granular texture; fire bowls cast soft bloom.',
    microFallback: 'Warm spec flicker, lace ridges, damp sandstone grain, bloom visible.',
  },
  {
    name: '547-pool-lace-phuket-lagoon',
    scene: 'Phuket lagoon villa pool: teak deck, lush tropical foliage, bamboo screens, floating lilies, soft lanterns. Humid haze and water droplets on glass. Private, serene.',
    pose: 'Reclined on a low lounger with one knee bent and the other leg extended, one arm draped overhead and the other resting at her side; gaze toward camera.',
    geometry: 'One‑shoulder diagonal plunge to navel with iris‑petal lace applique, narrow side bridges, high‑cut hips, open back to waist with chain‑link anchors.',
    material: 'Gloss nylon base with applique lace over tulle and onyx chain links.',
    materialFallback: 'Nylon base with applique lace and chain links.',
    micro: 'HUMIDITY: tiny droplets bead on lace; chain links show crisp spec; teak shows damp grain; foliage bokeh adds soft green spill.',
    microFallback: 'Droplet beads, chain spec, damp teak grain, green spill visible.',
  },
  {
    name: '548-pool-lace-sydney-harbor',
    scene: 'Sydney Harbor rooftop pool: glass balustrade, stone coping, brass lanterns, distant bridge lights, city reflections. Wet deck with subtle puddles. Private, night breeze.',
    pose: 'Standing at the glass rail, one hand resting on the top rail and the other sweeping hair back; legs in soft contrapposto; face toward camera.',
    geometry: 'Halter plunge to navel with wave‑loop lace motif, teardrop side windows with crystal rings, high‑cut hips, open back to waist with T‑strap and micro‑grommet lacing.',
    material: 'Gloss nylon base with wave‑loop lace and crystal ring connectors.',
    materialFallback: 'Nylon base with lace and ring connectors.',
    micro: 'HARBOR: distant bridge lights sparkle; lace loops show clean edge thickness; rings refract pin‑lights; glass rail shows faint distortion.',
    microFallback: 'Bridge sparkle, lace edge thickness, ring refraction, glass distortion visible.',
  },
  {
    name: '549-pool-lace-berlin-industrial',
    scene: 'Berlin industrial rooftop pool: brick walls, steel beams, Edison bulbs, black stone deck, rain‑slick puddles. Neon sign glow from a nearby wall. Private, moody.',
    pose: 'Leaning into a steel column with one knee bent, hands lightly on the column at shoulder height, torso angled toward camera; eyes on lens.',
    geometry: 'Strapped plunge to navel with laser‑grid lattice cutouts, straight seam mapping, micro‑buckle shoulder straps, narrow side bridges, high‑cut hips, open back to waist.',
    material: 'High‑gloss nylon base with precise lattice cutouts and titanium micro‑buckles.',
    materialFallback: 'Nylon base with lattice cutouts and micro‑buckles.',
    micro: 'RAIN: droplets form streaks on fabric; cutout intersections show crisp bevels; brick shows damp spec patches; steel beams show tight highlights.',
    microFallback: 'Rain streaks, crisp bevels, damp brick spec, steel highlights visible.',
  },
  {
    name: '550-pool-lace-havana-patio',
    scene: 'Havana courtyard plunge pool: patterned tiles, pastel walls, wrought‑iron chairs, palms in clay pots, candlelight on water. Warm/cool mixed lighting, wet tile reflections. Private.',
    pose: 'Seated on a wrought‑iron chair near the pool, legs crossed, one arm draped over the chair back and the other resting on her knee; torso turned toward camera.',
    geometry: 'Off‑shoulder wrap plunge to navel with micro‑beaded lace scatter zones, tapered side cutouts, ring connectors, high‑cut hips, open back to waist.',
    material: 'Matte crepe base with micro‑beaded lace and crystal rings.',
    materialFallback: 'Crepe base with lace and ring connectors.',
    micro: 'TILE: wet tile shows color‑rich reflections; micro‑beads create tiny caustic specks; iron chair shows dull spec; candle glow warms skin.',
    microFallback: 'Wet tile reflections, bead caustics, iron spec, warm glow visible.',
  },
  {
    name: '551-pool-lace-bangkok-river',
    scene: 'Bangkok riverside hotel pool: river lights bokeh, teak deck, brass lanterns, tall palms, glass rail. Cool pool LEDs and warm lanterns mix on wet stone. Private, late night.',
    pose: 'Standing with one foot on a low step and the other on deck, one hand on the rail and the other at her waist; torso three‑quarter to camera.',
    geometry: 'High‑neck plunge with oval keyhole to navel, gothic lace with eyelash edges, severe side cutouts, ring‑anchored waist, high‑cut hips, open back to waist.',
    material: 'Velvet‑backed lace panels with bonded edges and ring connectors.',
    materialFallback: 'Velvet‑backed lace with ring connectors.',
    micro: 'RIVER: distant light bokeh sparkles; lace fringe casts fine shadows; velvet nap shows direction; wet stone shows micro‑puddles.',
    microFallback: 'Bokeh sparkle, lace fringe shadows, velvet nap, wet stone visible.',
  },
  {
    name: '552-pool-lace-mykonos-terrace',
    scene: 'Mykonos terrace pool: white stucco walls, blue shutters, bougainvillea, marble deck, candle clusters. Moonlit sea horizon. Wet marble reflects warm points. Private.',
    pose: 'Perched on the pool coping with one knee raised and arms resting lightly on the knee; shoulders relaxed; face angled to camera.',
    geometry: 'Strapless illusion‑corset monokini with deep V plunge to navel, art‑deco fan lace panels, micro‑grommet hip bridges, lace‑up spine, open back to waist.',
    material: 'Structured matte crepe base with lace overlay and internal boning.',
    materialFallback: 'Matte crepe base with lace overlay.',
    micro: 'STUCCO: wet limewash sheen; lace fan cells cast micro‑shadows; grommets show crisp spec; marble shows clean spec bands.',
    microFallback: 'Wet limewash sheen, lace fan shadows, grommet spec, marble spec visible.',
  },
  {
    name: '553-pool-lace-abu-dhabi-desert',
    scene: 'Abu Dhabi desert resort pool: golden sandstone, low fire bowls, desert dunes silhouette, palm planters, soft lanterns. Warm firelight contrasts cool pool glow. Private.',
    pose: 'Standing near the pool edge with one hand on the warm stone and the other resting at her hip; weight on back leg, front knee soft; gaze toward camera.',
    geometry: 'Cowl plunge to navel with dense lace core and open perimeter, ring‑anchored cutout ribs, high‑cut hips, open back to waist with curved seam mapping.',
    material: 'Liquid satin base with dense lace core and brushed brass ringlets.',
    materialFallback: 'Satin base with lace core and brass ringlets.',
    micro: 'DESERT: sandstone shows damp granular texture; lace core casts tight micro‑shadows; brass ringlets show soft spec bands; firelight adds warm flicker.',
    microFallback: 'Damp sandstone grain, tight lace shadows, brass spec, warm flicker visible.',
  },
  {
    name: '554-pool-lace-vancouver-rain',
    scene: 'Vancouver rain‑washed rooftop pool: slate deck, glass rail, cedar planters, misty skyline, rain droplets on surfaces. Cool ambient light with soft lanterns. Private, moody.',
    pose: 'Standing under a covered pergola, one hand on a cedar post and the other resting on her thigh; legs crossed at the ankle; face toward camera.',
    geometry: 'High‑neck choker with vertical plunge to navel, micro‑dot tulle underlay with lace filigree overlays, arc side cutouts, ring‑connected waist anchors, high‑cut hips, open back to waist.',
    material: 'Matte crepe base with micro‑dot tulle and lace filigree overlays.',
    materialFallback: 'Crepe base with tulle and lace overlays.',
    micro: 'RAIN: droplets bead on fabric and cedar; tulle dot lattice is crisp; lace filigree casts fine shadows; slate shows wet spec streaks.',
    microFallback: 'Droplet beads, tulle dot lattice, lace shadows, wet slate streaks visible.',
  },
  {
    name: '555-pool-lace-monterey-cypress',
    scene: 'Monterey coastal spa pool: wind‑bent cypress silhouettes, stone coping, lanterns, ocean haze, soft moonlight. Wet deck glistens with salt spray. Private, quiet.',
    pose: 'Seated on a low stone bench by the pool with legs angled to one side, one hand trailing fingertips in the water and the other resting on her thigh; torso angled to camera.',
    geometry: 'Deep V plunge to navel with wave‑loop lace motif, braided strap bridges at hips, high‑cut legs, open back to waist with clean anchor points.',
    material: 'Gloss nylon base with wave‑loop lace overlay and braided strap bridges.',
    materialFallback: 'Nylon base with lace overlay and braided bridges.',
    micro: 'COAST: salt spray beads sparkle; lace loops show edge thickness; stone shows damp micro‑pits; lantern glow creates soft halos.',
    microFallback: 'Salt beads, lace edge thickness, damp stone pits, lantern halos visible.',
  },
  {
    name: '556-pool-lace-oslo-fjord',
    scene: 'Oslo fjord rooftop pool: dark stone deck, glass balustrade, sauna glow nearby, city lights across water. Steam ribbons in cold air. Private, late night.',
    pose: 'Standing with one hand on the glass rail and the other resting at her collarbone; legs in soft contrapposto; face to camera.',
    geometry: 'Asymmetric one‑shoulder strap with diagonal plunge to navel, chevron lace panels, double waist straps with micro‑clasps, severe side cutouts, high‑cut hips, open back to waist.',
    material: 'Satin‑backed lace with chevron geometry and black chrome micro‑clasps.',
    materialFallback: 'Satin‑backed lace with chevron panels and micro‑clasps.',
    micro: 'FJORD: cold air haze softens highlights; chevron ridges show directional sheen; clasps reflect sauna glow; glass rail shows edge reflections.',
    microFallback: 'Cold haze, chevron sheen, clasp reflections, glass edge highlights visible.',
  },
  {
    name: '557-pool-lace-hongkong-peak',
    scene: 'Hong Kong Peak rooftop pool: skyline bokeh, glass rail, black marble bar, LED strips under coping, misty air. Wet marble shows crisp reflections. Private, high altitude.',
    pose: 'Standing beside the bar with one forearm on the marble and the other hand on her hip; torso three‑quarter to camera, legs crossed at the ankle.',
    geometry: 'Sculpted plunge to navel with rose‑window radial lace centered at sternum, circular halo harness strap, micro‑rings along cutout edges, high‑cut hips, open back to waist.',
    material: 'Lamé‑tinged lace over satin base with crystal ring connectors.',
    materialFallback: 'Lace over satin base with ring connectors.',
    micro: 'SKYLINE: neon spill adds subtle spectral tint; radial lace ribs cast precise micro‑shadows; rings show tiny refractive glints; wet marble shows sharp spec bands.',
    microFallback: 'Spectral tint, radial micro‑shadows, ring glints, marble spec visible.',
  },
  {
    name: '558-pool-lace-lake-como',
    scene: 'Lake Como villa pool: cypress trees, terracotta pots, stone balustrade, warm lanterns, calm lake reflections. Wet stone deck with subtle puddles. Private and elegant.',
    pose: 'Seated on a cushioned bench with one leg crossed over the other, one hand resting on the cushion and the other lightly at her waist; face angled to camera.',
    geometry: 'Cowl‑drape plunge to navel with bar‑slim center gore, lace core panel, side cutouts with ring anchors, high‑cut hips, open back to waist.',
    material: 'Liquid satin base with lace core and brushed brass ringlets.',
    materialFallback: 'Satin base with lace core and brass ringlets.',
    micro: 'VILLA: stone shows damp micro‑pits; lace core casts tight micro‑shadows; brass ringlets show soft spec bands; lanterns add warm bloom.',
    microFallback: 'Damp stone pits, lace shadows, brass spec, warm bloom visible.',
  },
  {
    name: '559-pool-lace-reykjavik-glass',
    scene: 'Reykjavik glass‑roof spa pool: warm steam, black basalt edge, glass ceiling with faint snow, warm interior lights, cool sky glow. Wet deck glistens. Private.',
    pose: 'Elbows resting on the pool edge with torso lifted above waterline, shoulders slightly forward; hands loosely clasped; chin tipped toward camera.',
    geometry: 'High‑neck plunge with oval keyhole to navel, gothic lace with eyelash fringe edges, severe side cutouts, ring‑connected waist anchors, high‑cut hips, open back to waist.',
    material: 'Velvet‑backed lace panels with bonded edges and ring connectors.',
    materialFallback: 'Velvet‑backed lace with ring connectors.',
    micro: 'GLASS ROOF: soft sky glow adds cool rim light; lace fringe casts fine shadows; basalt shows wet micro‑gloss; steam scatters highlights.',
    microFallback: 'Cool rim light, fringe shadows, wet basalt gloss, steam scatter visible.',
  },
  {
    name: '560-pool-lace-london-skygarden',
    scene: 'London sky garden pool: lush greenery, glass ceiling, city lights beyond, warm floor lanterns, polished stone coping. Wet stone reflects plant silhouettes. Private, cinematic.',
    pose: 'Standing near the greenery with one hand on a low stone ledge and the other resting on her thigh; torso angled to camera; relaxed stance.',
    geometry: 'Strapped plunge to navel with lattice cutouts, narrow side bridges, micro‑buckle straps, high‑cut hips, open back to waist with clean strap anchors.',
    material: 'High‑gloss nylon base with precise lattice cutouts and titanium micro‑buckles.',
    materialFallback: 'Nylon base with lattice cutouts and micro‑buckles.',
    micro: 'SKY GARDEN: plant silhouettes reflect on wet stone; lattice edges show crisp bevels; buckles reflect warm lantern points; glass ceiling shows faint reflections.',
    microFallback: 'Plant reflections, crisp bevels, buckle reflections, glass ceiling reflections visible.',
  },
  {
    name: '561-pool-lace-athens-marble',
    scene: 'Athens hillside pool terrace: pale marble coping, olive trees, distant Acropolis glow, warm lanterns, dry summer air. Water surface calm with faint ripples. Private, elegant.',
    pose: 'Seated on the marble edge with one leg crossed at the ankle and the other extended, one hand braced behind for support and the other resting at her waist; face angled to camera.',
    geometry: 'Deep V plunge to navel with art-deco fan lace panels, narrow center gore, side cutouts with ring anchors, high-cut hips, open back to waist.',
    material: 'Satin-backed lace over a matte crepe base with brushed brass ringlets.',
    materialFallback: 'Satin-backed lace over crepe base with brass ringlets.',
    micro: 'MARBLE: crisp stone veining visible in wet reflections; lace fan ribs cast micro-shadows; brass ringlets show soft spec bands; warm lantern glow adds gentle bloom.',
    microFallback: 'Wet marble veining, lace micro-shadows, brass spec bands, lantern bloom visible.',
  },
  {
    name: '562-pool-lace-tokyo-ginza-rooftop',
    scene: 'Tokyo Ginza rooftop pool: dark basalt deck, glass rail, neon skyline bokeh, chrome accents, light mist from cooling towers. Cool ambient light with sharp LED trims. Private, high-tech.',
    pose: 'Standing beside the glass rail, one forearm resting lightly on the top edge and the other hand at her collarbone; legs crossed at the ankle; gaze to camera.',
    geometry: 'High-neck choker with vertical keyhole plunge to navel, lattice waist windows, micro-grommet lace-up spine, high-cut hips, open back to waist.',
    material: 'High-gloss nylon base with fine lace lattice and black-chrome micro-grommets.',
    materialFallback: 'Nylon base with lace lattice and micro-grommets.',
    micro: 'GINZA: neon spill creates subtle spectral tint in highlights; lace lattice edges show clean bevels; grommets glint with crisp points; basalt deck shows wet spec streaks.',
    microFallback: 'Neon tint, lattice bevels, grommet glints, wet basalt streaks visible.',
  },
  {
    name: '563-pool-lace-rio-ledge',
    scene: 'Rio hillside infinity pool: stone coping, palms, distant ocean shimmer, warm sunset haze, soft breeze lifting hair strands. Pool LEDs add cool edge light. Private, cinematic.',
    // This concept was intermittently blocked; keep the same vibe but use a less body-revealing pose.
    pose: 'Waist-deep in the pool at the infinity edge, forearms resting on the coping, shoulders relaxed; chin slightly down, eyes to camera; waterline hides hips/upper legs.',
    geometry: 'High-neck asymmetric one-shoulder with a narrow vertical keyhole stabilized by illusion mesh to the navel line; chevron lace panels; controlled side windows with braided strap bridges; open back to waist.',
    material: 'Gloss nylon base with chevron lace overlay and braided strap bridges.',
    materialFallback: 'Nylon base with lace overlay and braided bridges.',
    micro: 'RIO: sunset haze softens edges; chevron lace ridges catch directional sheen; braided bridges show tight twist texture; stone coping shows damp micro-pits.',
    microFallback: 'Haze, chevron sheen, braided texture, damp stone pits visible.',
  },
  {
    name: '564-pool-lace-barcelona-tiles',
    scene: 'Barcelona modernist courtyard pool: mosaic tile murals, terracotta planters, wrought-iron accents, late afternoon sun casting geometric shadows. Water flickers on tile. Private and warm.',
    pose: 'Kneeling on a low bench by the pool, torso upright with hands resting softly on thighs; head turned toward camera with a calm gaze.',
    geometry: 'Cowl plunge to navel with scalloped eyelash lace edge, crescent side cutouts, micro-ring connectors, high-cut hips, open back to waist.',
    material: 'Liquid satin base with eyelash lace overlay and crystal ring connectors.',
    materialFallback: 'Satin base with lace overlay and ring connectors.',
    micro: 'TILES: mosaic grout lines remain crisp under wet sheen; lace eyelash fringe casts fine shadows; crystal rings add tiny refractive glints; sun shadows form sharp patterns.',
    microFallback: 'Wet tile sheen, fringe shadows, ring glints, sharp sun patterns visible.',
  },
  {
    name: '565-pool-lace-mallorca-terrace',
    scene: 'Mallorca cliffside terrace pool: pale limestone deck, Mediterranean horizon, striped cabana fabric, warm breeze, golden hour light. Private, relaxed luxury.',
    pose: 'Perched on a lounge chaise, one arm overhead and the other resting on the thigh; legs extended with ankles crossed; face to camera.',
    geometry: 'Strapless plunge to navel with veil panel over the center, lattice side cutouts, micro-buckle straps at the back, high-cut hips, open back to waist.',
    material: 'Matte crepe base with sheer veil lace panel and titanium micro-buckles.',
    materialFallback: 'Crepe base with lace veil panel and micro-buckles.',
    micro: 'MALLORCA: veil panel shows soft diffusion; buckle edges reflect warm gold; limestone shows damp granular texture; cabana stripes blur into bokeh.',
    microFallback: 'Veil diffusion, buckle spec, damp limestone grain, cabana bokeh visible.',
  },
  {
    name: '566-pool-lace-prague-riverlight',
    scene: 'Prague riverside spa pool: stone arches, warm lanterns, river reflections, mist over water, distant bridge lights. Night mood, private and moody.',
    pose: 'Standing near a stone column, one hand on the column and the other resting at her hip; weight on back leg; gaze to camera.',
    geometry: 'Keyhole plunge to navel with gothic lace panels, diagonal underbust seam, arc side cutouts, high-cut hips, open back to waist with zipper seam detail.',
    material: 'Matte crepe base with gothic lace panels and graphite zipper hardware.',
    materialFallback: 'Crepe base with lace panels and zipper hardware.',
    micro: 'RIVERLIGHT: mist adds soft bloom around lanterns; lace panels cast tight micro-shadows; zipper teeth read as tiny spec dots; stone arch shows wet patina.',
    microFallback: 'Lantern bloom, lace micro-shadows, zipper spec, wet stone patina visible.',
  },
  {
    name: '567-pool-lace-doha-glow',
    scene: 'Doha skyline pool deck: polished stone, gold trims, glass rail, city lights reflecting in water, warm desert air. Clean modern lines, private.',
    pose: 'Sitting on the pool edge with one leg dangling and the other bent, one hand braced on the coping and the other resting at her collarbone; eyes to camera.',
    geometry: 'Sculpted plunge to navel with rose-window radial lace, circular halo harness strap, micro-ring cutouts, high-cut hips, open back to waist.',
    material: 'Lame-tinged lace over satin base with crystal ring connectors.',
    materialFallback: 'Lace over satin base with ring connectors.',
    micro: 'DOHA: radial lace ribs cast precise micro-shadows; ring connectors show prismatic glints; polished stone reflects thin spec bands; warm skyline glow adds amber tint.',
    microFallback: 'Radial shadows, ring glints, stone spec bands, warm glow visible.',
  },
  {
    name: '568-pool-lace-bora-bora-overwater',
    scene: 'Bora Bora overwater bungalow pool: teak deck, turquoise lagoon, glass edge, gentle trade winds, soft morning sun. Private, serene.',
    pose: 'Leaning on the glass edge with forearms resting, shoulders relaxed; one knee bent slightly; face turned to camera.',
    geometry: 'Deep V plunge to navel with wave-loop lace motif, ring-anchored side windows, braided strap bridges, high-cut hips, open back to waist.',
    material: 'Gloss nylon base with wave-loop lace overlay and brushed brass ringlets.',
    materialFallback: 'Nylon base with lace overlay and brass ringlets.',
    micro: 'LAGOON: lagoon light adds cyan rim; lace loops show edge thickness; brass ringlets reflect warm sun points; teak deck shows damp grain with fine reflections.',
    microFallback: 'Cyan rim, lace edge thickness, brass spec points, damp teak grain visible.',
  },
  {
    name: '569-pool-lace-hanoi-lotus',
    scene: 'Hanoi courtyard pool: lotus planters, carved wood screens, warm lanterns, rain-fresh air, soft reflections on stone. Private, quiet.',
    pose: 'Seated on a low bench, torso angled to camera, one hand resting on the bench and the other at her thigh; relaxed posture.',
    geometry: 'High-neck choker with oval keyhole plunge to navel, cathedral-rib lace panels, side cutouts with ring anchors, high-cut hips, open back to waist.',
    material: 'Matte neoprene-like base with lace ribs and satin piping.',
    materialFallback: 'Matte base with lace ribs and piping.',
    micro: 'LOTUS: lace ribs read as stiffened beams; satin piping shows thin spec bands; wet stone shows micro-puddles; lanterns add soft warm bloom.',
    microFallback: 'Lace rib stiffness, piping spec, wet stone puddles, warm bloom visible.',
  },
  {
    name: '570-pool-lace-neworleans-courtyard',
    scene: 'New Orleans French Quarter courtyard pool: wrought iron balcony, brick walls with ivy, string lights, warm humid night. Water reflects amber bulbs. Private, intimate.',
    pose: 'Standing by a brick wall, one hand on the iron railing and the other resting at her waist; legs in soft contrapposto; gaze to camera.',
    geometry: 'Cowl-drape plunge to navel with bar-slim center gore, lace core panel, arc side cutouts, high-cut hips, open back to waist.',
    material: 'Liquid satin base with lace core and black-chrome ringlets.',
    materialFallback: 'Satin base with lace core and ringlets.',
    micro: 'COURTYARD: brick shows damp texture; lace core casts tight micro-shadows; ringlets glint under string lights; soft humidity adds slight highlight bloom.',
    microFallback: 'Damp brick texture, lace micro-shadows, ringlet glints, bloom visible.',
  },
  {
    name: '571-pool-lace-istanbul-hammam',
    scene: 'Istanbul courtyard hammam pool: carved stone, brass lanterns, shallow steam, patterned tiles, warm ambient glow. Private, ritual calm.',
    pose: 'Kneeling on a stone platform by the water, torso upright, hands resting lightly on thighs; head turned to camera.',
    geometry: 'Asymmetric off-shoulder supported V to lower navel line, split diagonal underbust seam, dual crescent side windows with tensegrity bridge links, sculpted ultra-high-cut hips, open back to low waist with reinforced spine channel.',
    material: 'Satin base with baroque lace overlay, opaque power-mesh under-support, and brushed brass ring connectors.',
    materialFallback: 'Satin base with lace overlay, opaque power-mesh under-support, and brass rings.',
    micro: 'HAMMAM: steam condensation gradient is visible across fabric; seam-channel moisture routing creates darker capillary lines; baroque lace scrolls show edge thickness + anisotropic strain; brass rings show warm spec bands; tile grout lines stay crisp under coherent wet sheen + caustic flicker.',
    microFallback: 'Steam condensation gradient, capillary seam lines, lace anisotropic strain, brass spec bands, coherent wet tile caustics visible.',
  },
  {
    name: '572-pool-lace-queenstown-lake',
    scene: 'Queenstown alpine lake pool: dark stone deck, glass rail, snowy peaks, crisp air, faint moonlight. Warm spa glow contrasts cool sky. Private.',
    pose: 'Standing at the glass rail, one hand lightly on the top edge and the other at her collarbone; legs crossed at the ankle; eyes to camera.',
    geometry: 'One-shoulder torsion strap with diagonal supported V to lower navel line, chevron lace exoskeleton, dual offset waist windows with micro-clasp tension rails, sculpted high-cut hips, open back to low waist.',
    material: 'Satin-backed lace with chevron geometry and black-chrome micro-clasps.',
    materialFallback: 'Satin-backed lace with chevron panels and micro-clasps.',
    micro: 'ALPINE: cold air haze softens edges; chevron ridges show directional sheen; clasps reflect warm spa glow; glass rail shows thin edge reflections.',
    microFallback: 'Cold haze, chevron sheen, clasp reflections, glass edge highlights visible.',
  },
  {
    name: '573-pool-lace-edinburgh-terrace',
    scene: 'Edinburgh terrace pool: dark slate coping, historic skyline silhouette, warm window lights, soft drizzle, moody blue hour. Private and cinematic.',
    pose: 'Seated on the coping with one leg bent and the other extended, one hand resting behind for support and the other at her thigh; gaze to camera.',
    geometry: 'Strapped supported V to lower navel line with lattice exoshell, stacked side apertures with variable-width bridge members, micro-buckle tension rails, ultra-high-cut hips, open back to low waist.',
    material: 'High-gloss nylon base with precise lattice cutouts and titanium micro-buckles.',
    materialFallback: 'Nylon base with lattice cutouts and micro-buckles.',
    micro: 'EDINBURGH: drizzle beads on fabric; lattice edges show crisp bevels; buckles reflect warm window points; slate shows wet spec streaks.',
    microFallback: 'Droplet beads, lattice bevels, buckle reflections, wet slate streaks visible.',
  },
  {
    name: '574-pool-lace-lisbon-azulejo',
    scene: 'Lisbon azulejo courtyard pool: blue-and-white tile walls, citrus trees, warm lanterns, late afternoon sun. Water flickers across tile. Private, bright.',
    pose: 'Standing near the tile wall, one hand resting lightly on the coping and the other on her hip; torso three-quarter to camera.',
    geometry: 'Supported keyhole-V to lower navel line with art-deco fan ribs, asymmetrical side contour windows with ring anchors + opaque power-mesh underlay, sculpted high-cut hips, open back to low waist with clean strap anchors.',
    material: 'Satin-backed lace over matte crepe base with crystal ring connectors.',
    materialFallback: 'Lace over crepe base with ring connectors.',
    micro: 'AZULEJO: tile patterns remain crisp under wet sheen; lace fan ribs cast tight micro-shadows; ring connectors show tiny glints; sun adds warm highlight bloom.',
    microFallback: 'Wet tile sheen, lace micro-shadows, ring glints, warm bloom visible.',
  },
  {
    name: '575-pool-lace-mexico-city-jardin',
    scene: 'Mexico City garden pool: lush greenery, volcanic stone coping, soft string lights, humid air, gentle water ripples. Private, lush.',
    pose: 'Reclined on a daybed, one arm overhead and the other resting on the thigh; legs extended; face to camera.',
    geometry: 'Deep supported V to lower navel line with iris-petal applique over opaque tonal power-mesh, dual side windows with chain-link tension anchors, sculpted high-cut hips, open back to low waist.',
    material: 'Gloss nylon base with applique lace petals over opaque tonal power-mesh and onyx-toned chain hardware.',
    materialFallback: 'Nylon base with applique over opaque tonal power-mesh and chain hardware.',
    micro: 'JARDIN: petal edges show thickness and shadow; power-mesh weave is visible at grazing angles; chain links show tight spec highlights; volcanic stone shows damp micro-pits.',
    microFallback: 'Applique edge thickness, power-mesh weave, chain highlights, damp stone pits visible.',
  },
  {
    name: '576-pool-lace-zurich-lakeview',
    scene: 'Zurich lakeview rooftop pool: pale concrete deck, glass rail, calm lake beyond, cool twilight, soft architectural lighting. Private, clean.',
    pose: 'Standing beside the pool edge, one hand on the rail and the other resting at her waist; relaxed contrapposto; gaze to camera.',
    geometry: 'High-neck choker with vertical plunge to navel, micro-dot tulle underlay with lace filigree overlays, arc side cutouts, high-cut hips, open back to waist.',
    material: 'Matte crepe base with micro-dot tulle and lace filigree overlays.',
    materialFallback: 'Crepe base with tulle and lace overlays.',
    micro: 'LAKEVIEW: cool ambient light lifts soft rim; tulle dot lattice is crisp; lace filigree casts fine shadows; concrete shows wet sheen and faint reflections.',
    microFallback: 'Cool rim, tulle lattice, lace shadows, wet concrete sheen visible.',
  },
  {
    name: '577-pool-lace-copenhagen-harbor',
    scene: 'Copenhagen harbor pool: light wood deck, modern glass rail, harbor lights, cool mist, clean Nordic lines. Private, calm.',
    pose: 'Sitting on a low bench, legs angled to one side, one hand resting on the bench and the other lightly at her collarbone; face to camera.',
    geometry: 'Asymmetric one-shoulder strap with diagonal plunge to navel, chevron lace panels, rib cutouts with micro-clasps, high-cut hips, open back to waist.',
    material: 'Satin-backed lace with chevron geometry and black-chrome micro-clasps.',
    materialFallback: 'Satin-backed lace with chevron panels and micro-clasps.',
    micro: 'HARBOR: cool mist adds soft bloom; chevron ridges show directional sheen; clasps reflect harbor points; wood deck shows damp grain and subtle reflections.',
    microFallback: 'Mist bloom, chevron sheen, clasp reflections, damp wood grain visible.',
  },
  {
    name: '578-pool-lace-scottsdale-saguaro',
    scene: 'Scottsdale desert resort pool: saguaro silhouettes, sandstone coping, fire bowls, warm amber light, cool pool glow. Dry air, private.',
    pose: 'Standing near a fire bowl, one hand on the warm stone and the other resting at her hip; weight on back leg; gaze to camera.',
    geometry: 'Cowl plunge to navel with dense lace core and open perimeter, ring-anchored cutout ribs, high-cut hips, open back to waist with curved seam mapping.',
    material: 'Liquid satin base with dense lace core and brushed brass ringlets.',
    materialFallback: 'Satin base with lace core and brass ringlets.',
    micro: 'DESERT: sandstone shows damp granular texture; lace core casts tight micro-shadows; brass ringlets show soft spec bands; firelight adds warm flicker.',
    microFallback: 'Damp sandstone grain, lace shadows, brass spec, warm flicker visible.',
  },
  {
    name: '579-pool-lace-seville-patio',
    scene: 'Seville patio pool: patterned tiles, orange trees, wrought iron details, warm dusk light, gentle water movement. Private, romantic.',
    pose: 'Kneeling on a tiled step with one hand resting on the step and the other on her thigh; torso angled to camera; calm gaze.',
    geometry: 'Off-shoulder bardot plunge to navel with scalloped lace edge, crescent side cutouts, ring connectors, high-cut hips, open back to waist.',
    material: 'Satin base with scalloped lace overlay and crystal ring connectors.',
    materialFallback: 'Satin base with lace overlay and ring connectors.',
    micro: 'SEVILLE: tile patterns remain crisp under wet sheen; scalloped lace edge casts fine shadows; ring connectors sparkle; warm dusk adds soft bloom.',
    microFallback: 'Wet tile sheen, lace shadows, ring sparkle, soft bloom visible.',
  },
  {
    name: '580-pool-lace-santafe-adobe',
    scene: 'Santa Fe adobe courtyard pool: terracotta walls, timber beams, desert plants, warm lanterns, clear night sky. Water reflects amber tones. Private, grounded.',
    pose: 'Standing beside the pool, one hand resting on the adobe wall and the other at her collarbone; relaxed stance; eyes to camera.',
    geometry: 'Strapless plunge to navel with veil panel over center, lattice side cutouts, micro-buckle straps at the back, high-cut hips, open back to waist.',
    material: 'Matte crepe base with sheer veil lace panel and titanium micro-buckles.',
    materialFallback: 'Crepe base with lace veil panel and micro-buckles.',
    micro: 'ADOBE: wall texture shows soft grain under warm light; veil panel diffuses highlights; buckle edges reflect small lantern points; wet stone shows thin spec bands.',
    microFallback: 'Adobe grain, veil diffusion, buckle spec, wet stone spec bands visible.',
  },
  {
    name: '581-pool-lace-glassline-splitlevel',
    scene: 'Glass-walled split-level pool at night: camera at the waterline with half-above/half-below view, underwater LEDs, warm lantern points, rain-fresh air. Waterline acts as a lens; droplets on glass edge; wet deck mirrors bokeh. Private, high-design.',
    pose: 'Chest-deep at the glass wall, both hands resting on the top edge; shoulders relaxed; head turned to camera; waterline crosses mid-torso with realistic refraction.',
    geometry: 'High-neck choker with vertical keyhole plunge to navel, engineered side windows with ring anchors, high-cut hips, open back to mid-waist.',
    material: 'Gloss nylon base with lace lattice overlay and black-chrome ring connectors.',
    materialFallback: 'Nylon base with lace overlay and ring connectors.',
    micro: 'SPLIT-LEVEL: waterline distorts anatomy and garment edges via refraction; lace filaments bead with micro-droplets; underwater LEDs create moving caustic bands; glass wall shows thin edge reflections and faint streaking.',
    microFallback: 'Waterline refraction, lace droplets, LED caustics, glass reflections visible.',
  },
  {
    name: '582-pool-lace-hongkong-monsoon',
    scene: 'Hong Kong rooftop pool in a warm monsoon downpour: neon skyline reflections, wind-driven rain streaks, puddled deck, misty air, distant thunder glow. Wet stone and metal surfaces show sharp spec cores with roughness halos. Private, cinematic.',
    pose: 'Standing on the wet deck near the pool edge, one hand gripping the glass rail and the other brushing wet hair back; shoulders slightly forward against the rain; gaze to camera.',
    geometry: 'Asymmetric one-shoulder strap with diagonal plunge to navel, reinforced cutout ribs with micro-clasps, high-cut hips, open back to mid-waist.',
    material: 'Satin-backed lace over a matte crepe base with black-chrome micro-clasps.',
    materialFallback: 'Lace over crepe base with micro-clasps.',
    micro: 'MONSOON: raindrops bead on lace and skin; micro-splashes on deck; neon spill adds subtle spectral tint; wet glass rail shows tiny droplets that refract point lights; motion blur appears in some rain streaks.',
    microFallback: 'Rain beads, neon tint, wet rail droplets, wet deck spec visible.',
  },
  {
    name: '583-pool-lace-hokkaido-snowsteam',
    scene: 'Hokkaido snow-and-steam spa pool at blue hour: snowflakes falling into warm water, basalt coping, paper lanterns, dense steam plumes, cold air haze. Condensation collects on surfaces; wet stone glows under warm light. Private, serene.',
    pose: 'Seated on the basalt edge with legs in the water, hands resting on the coping; shoulders wrapped in steam; face angled to camera with calm gaze.',
    geometry: 'Keyhole plunge to navel with cathedral-rib lace panels, narrow center gore, side cutouts with ring anchors, high-cut hips, open back to mid-waist.',
    material: 'Matte neoprene-like base with stiffened lace ribs and brushed brass ringlets.',
    materialFallback: 'Matte base with lace ribs and brass ringlets.',
    micro: 'SNOW+STEAM: steam scatters lantern highlights into soft bloom; snow melts into droplets on hair and straps; lace ribs read as stiff beams with wet sheen; basalt shows wet micro-gloss and patina.',
    microFallback: 'Steam bloom, melting snow droplets, lace rib stiffness, wet basalt gloss visible.',
  },
  {
    name: '584-pool-lace-starfield-fiberoptic',
    scene: 'Fiber-optic "starfield" pool at night: thousands of pin lights embedded in the pool floor, dark water with pin-caustics, wet teak deck, few lantern accents, deep black sky. Private, otherworldly.',
    pose: 'Reclined on a submerged bench with elbows on the coping, torso lifted above waterline; one knee bent; head turned to camera.',
    geometry: 'Deep V plunge to navel with rose-window radial lace core, halo harness strap routing, ring-anchored side windows, high-cut hips, open back to mid-waist.',
    material: 'Gloss nylon base with radial lace overlay and crystal ring connectors.',
    materialFallback: 'Nylon base with lace overlay and ring connectors.',
    micro: 'STARFIELD: pinpoint lights create tiny caustic specks on wet skin and lace; crystal rings throw micro-prismatic glints; teak shows damp grain with sharp pin reflections; water surface ripples break pin lights into short streaks.',
    microFallback: 'Pinpoint caustics, ring glints, damp teak grain, ripple streaks visible.',
  },
  {
    name: '585-pool-lace-projection-mapped-caustics',
    scene: 'Projection-mapped pool art installation at night: geometric light patterns projected onto water and deck, patterns warp with ripples and caustics, mild haze, wet stone reflects animated shapes. Private, high-fashion event energy without crowds.',
    pose: 'Standing in shallow water on a sun shelf, one knee bent with foot planted; arms relaxed slightly away from torso so projected patterns fall across garment and skin; eyes to camera.',
    geometry: 'Strapless plunge to navel stabilized by illusion mesh yoke, lattice side cutouts with micro-buckle anchors, high-cut hips, open back to mid-waist.',
    material: 'Matte crepe swim base with lace overlay, bonded edges, and titanium micro-buckles.',
    materialFallback: 'Crepe base with lace overlay and micro-buckles.',
    micro: 'PROJECTION: projected shapes show correct occlusion and wrap with body curvature; wet surface reflections obey Fresnel; lace microstructure modulates projected light into high-frequency breakup; buckles reflect sharp pattern highlights.',
    microFallback: 'Projected pattern wrap, wet Fresnel reflections, lace breakup, buckle highlights visible.',
  },
  {
    name: '586-pool-lace-brewster-polarizer-ledge',
    scene: 'Low-angle pool-ledge shot at dusk: strong low sun/spotlight grazing the water surface, reflections controlled by a circular polarizer look (reduced glare reveals tile pattern under the surface). Warm-to-cool gradient light, wet marble coping, calm ripples. Private, technical glamour.',
    pose: 'Leaning forward over the coping with hands on knees, torso angled three-quarter to camera; head turned to camera; water surface occupies foreground with visible tile detail beneath.',
    geometry: 'High-neck plunge with oval keyhole to navel, chevron lace panels, reinforced side windows with ring anchors, high-cut hips, open back to mid-waist.',
    material: 'Satin-backed lace over a gloss nylon base with black-chrome ring connectors.',
    materialFallback: 'Lace over nylon base with ring connectors.',
    micro: 'POLARIZATION: glare reduction reveals subsurface tile detail and deeper cyan; spec highlights dim in a physically plausible way; lace filaments show anisotropic sheen at grazing angles; marble coping shows wet veining with sharp reflections.',
    microFallback: 'Reduced glare, tile detail, lace sheen, wet marble reflections visible.',
  },
  {
    name: '587-pool-lace-seoul-neon-ladder',
    scene: 'Seoul neon alley rooftop pool: saturated cyan/magenta signage reflected in wet metal ladder rails and water, light mist, glossy black tile coping. Pool LEDs add cool edge light; neon adds spectral spill. Private, urban couture.',
    pose: 'Stepping up the pool ladder with one foot on a rung and one hand gripping the rail; torso rotated toward camera; water streams off the leg and drips from the suit edges; gaze to camera.',
    geometry: 'Diagonal plunge to navel with lattice cutouts, narrow reinforced side bridges, micro-grommet anchors, high-cut hips, open back to mid-waist.',
    material: 'High-gloss nylon base with lace lattice and black-chrome micro-grommets.',
    materialFallback: 'Nylon base with lace lattice and micro-grommets.',
    micro: 'NEON LADDER: wet metal rails show tight spec bands and tiny droplets; neon reflections smear slightly on wet tile; water drip trails form coherent beads and short streaks; lace edge thickness remains crisp under wet adhesion.',
    microFallback: 'Wet rail spec, neon wet reflections, drip trails, lace edges visible.',
  },
  {
    name: '588-pool-lace-cape-windspray',
    scene: 'Cliffside infinity pool in strong coastal wind: blown spray, hair strands lifted, distant ocean shimmer, cool sky glow plus warm lantern accents. Droplets occasionally hit the lens creating soft refractive bokeh. Wet stone coping shows damp micro-pitting. Private, dramatic.',
    pose: 'Standing at the infinity edge with both hands braced on the coping, weight forward into the wind; shoulders engaged; chin slightly down; eyes to camera.',
    geometry: 'Off-shoulder bardot plunge to navel with scalloped lace edge, controlled side windows with strap bridges, high-cut hips, open back to mid-waist.',
    material: 'Liquid satin base with scalloped lace overlay and brushed brass ringlets.',
    materialFallback: 'Satin base with lace overlay and brass ringlets.',
    micro: 'WIND+SPRAY: airborne droplets catch rim light; a few lens droplets create distorted bokeh; lace fringe casts fine shadows even when damp; wet stone shows sharp spec cores with roughness halos.',
    microFallback: 'Spray droplets, lens bokeh droplets, damp lace shadows, wet stone spec visible.',
  },
  {
    name: '589-pool-lace-milan-mirrorwall',
    scene: 'Milan modernist pool with a mirror-polished stainless wall: multiple reflections, slight distortion, wet black tile coping, warm pin lights and cool pool glow. Reflections obey Fresnel and show subtle ghosting. Private, architectural.',
    pose: 'Standing close to the mirror wall, one hand resting flat against the cool metal and the other at her waist; torso three-quarter to camera; gaze to camera; reflections show clean separation.',
    geometry: 'High-neck choker with vertical plunge to navel, micro-dot tulle underlay with lace filigree overlays, arc side cutouts, high-cut hips, open back to mid-waist.',
    material: 'Matte crepe base with micro-dot tulle and lace filigree overlays; black chrome hardware accents.',
    materialFallback: 'Crepe base with tulle and lace overlays.',
    micro: 'MIRRORWALL: polished steel shows tight spec bands and faint double-image ghosting; moire appears subtly in fine lace at distance; wet black tile shows crisp reflections; hardware glints are small and sharp.',
    microFallback: 'Steel reflections, subtle moire, wet tile reflections, sharp hardware glints visible.',
  },
  {
    name: '590-pool-lace-microbubble-volumetric',
    scene: 'Microbubble spa pool at night: aeration jets create a vertical "bubble curtain" that scatters underwater LEDs into a volumetric glow, warm lantern points above, wet stone deck with puddles. Private, luminous.',
    pose: 'Sitting on a submerged ledge near the bubble curtain, one hand trailing through the bubbles and the other resting on the coping; torso angled to camera; relaxed gaze.',
    geometry: 'Deep V plunge to navel with bar-slim center gore, ring-anchored side windows, high-cut hips, open back to mid-waist with clean strap routing.',
    material: 'Gloss nylon base with lace core panel and brushed brass ringlets.',
    materialFallback: 'Nylon base with lace core and brass ringlets.',
    micro: 'MICROBUBBLES: bubbles create soft volumetric shafts and glittering highlights; water surface shows turbulent breakup near jets; lace microstructure remains visible through scattering; wet deck reflects the glowing plume with distorted edges.',
    microFallback: 'Volumetric bubble glow, turbulent surface, lace visibility, wet deck reflections visible.',
  },
  {
    name: '591-pool-lace-underwater-snellswindow',
    scene: 'Underwater camera view in a clear pool at night: looking upward through the surface shows Snell\'s window and total internal reflection outside it; underwater LEDs add cyan gradients; warm lanterns shimmer as refracted streaks. Private, hyper-real.',
    pose: 'Leaning over the coping with forearms on the edge, head angled down toward the underwater camera; shoulders relaxed; eyes to camera through the waterline distortions.',
    geometry: 'High-neck asymmetric one-shoulder with narrow vertical keyhole stabilized by illusion mesh to the navel line; controlled side windows; open back to mid-waist.',
    material: 'Satin-backed lace over gloss nylon with crystal ring connectors.',
    materialFallback: 'Lace over nylon with ring connectors.',
    micro: 'UNDERWATER OPTICS: surface normals distort face and garment edges; total internal reflection shows mirrored deck lights; caustics dance across the suit; micro-bubbles and particulate add depth; ring hardware throws tiny caustic sparkles.',
    microFallback: 'Surface refraction, TIR reflections, caustics, particulate depth visible.',
  },
  {
    name: '592-pool-lace-caustic-gobo-pattern',
    scene: 'Night pool with patterned LED "gobo" lighting: a structured caustic grid projects onto wet deck and body, then breaks and flows with ripples. Polished stone coping, mild haze, crisp shadows. Private, engineered spectacle.',
    pose: 'Standing on the wet deck at poolside, one hand on hip and the other lightly on the coping; torso angled to camera; the patterned light clearly falls across garment panels.',
    geometry: 'Strapped plunge to navel with lattice cutouts, reinforced side bridges, micro-buckle anchors, high-cut hips, open back to mid-waist.',
    material: 'High-gloss nylon base with lace lattice and titanium micro-buckles.',
    materialFallback: 'Nylon base with lace lattice and micro-buckles.',
    micro: 'PATTERNED CAUSTICS: projected grid shows correct occlusion and contact shadows; wet stone reflections distort grid with micro-puddles; lace weave modulates the grid into high-frequency shimmer; buckles reflect crisp pattern highlights.',
    microFallback: 'Structured caustics, wet reflection distortion, lace modulation, buckle highlights visible.',
  },
  {
    name: '593-pool-lace-laminar-waterfall',
    scene: 'Luxury pool with a thin laminar spillway waterfall: sheet of water drops into the pool, transitioning from laminar to turbulent breakup; wet stone shows streaks; lantern points and pool LEDs create spec highlights in the falling sheet. Private, kinetic.',
    pose: 'Standing beside the spillway, one hand lightly intersecting the falling sheet water and the other braced on the coping; torso angled to camera; eyes to camera.',
    geometry: 'Cowl-drape plunge to navel with diagonal seam tessellation, arc side cutouts with ring connectors, high-cut hips, open back to mid-waist.',
    material: 'Liquid satin base with baroque lace overlay and brushed brass ring connectors.',
    materialFallback: 'Satin base with lace overlay and ring connectors.',
    micro: 'LAMINAR SHEET: falling water shows coherent sheet thickness then edge breakup into droplets; highlights stretch along the sheet; wet lace shows darker capillary lines at edges; stone shows wet streaking and micro-pits.',
    microFallback: 'Sheet water breakup, stretched highlights, wet lace edge lines, wet stone streaks visible.',
  },
  {
    name: '594-pool-lace-glassbottom-skybridge',
    scene: 'Glass-bottom skybridge pool at night: transparent floor reveals city lights below; glass rail, chrome accents, cool pool glow, warm pin lights. Reflections and refractions stack through glass and water layers. Private, vertigo luxe.',
    pose: 'Standing in shallow water above the glass floor, one hand on the rail and the other at her collarbone; feet planted; head turned to camera; city lights visible beneath.',
    geometry: 'High-neck choker with oval keyhole plunge to navel, cathedral-arch lace paneling, ring-anchored side windows, high-cut hips, open back to mid-waist.',
    material: 'Gloss nylon base with cathedral lace overlay and black-chrome ring connectors.',
    materialFallback: 'Nylon base with lace overlay and ring connectors.',
    micro: 'GLASS STACK: layered refraction through water+glass shifts the city lights; glass edges show thin highlights; wet surfaces show double reflections; lace microstructure remains crisp against complex light fields.',
    microFallback: 'Layered refraction, glass edge highlights, wet double reflections, crisp lace visible.',
  },
  {
    name: '595-pool-lace-cenote-sunshafts',
    scene: 'Limestone cenote pool: skylight opening above casts sharp sunbeam shafts through humid air and particulate; water depth gradients from emerald to deep blue; wet rock textures and mineral streaks. Quiet, private, primal luxury.',
    pose: 'Standing in shallow water near a rock ledge, one hand touching the limestone wall and the other resting at her waist; torso angled to camera; gaze steady.',
    geometry: 'Diagonal plunge to navel with iris-petal applique over tulle, reinforced side windows with chain-link anchors, high-cut hips, open back to mid-waist.',
    material: 'Matte crepe base with applique lace petals over tulle and onyx-toned chain hardware.',
    materialFallback: 'Crepe base with applique over tulle and chain hardware.',
    micro: 'CENOTE: volumetric sunshafts show depth falloff; particulate sparkles in beams; wet limestone has granular sheen and mineral streaks; tulle grid resolves at grazing angles; chain links flash tight highlights.',
    microFallback: 'Sunshafts, particulate sparkle, wet limestone texture, tulle grid visible.',
  },
  {
    name: '596-pool-lace-norway-aurora',
    scene: 'Norwegian fjord-side heated pool under aurora: green/purple ribbons reflect on wet stone and water; steam rises into cold air; dark mountains silhouette; warm lantern points. Private, unreal-but-real.',
    pose: 'Waist-deep in the pool with forearms on the coping, shoulders relaxed; chin slightly down; eyes to camera; aurora reflection streaks on the water surface.',
    geometry: 'Off-shoulder plunge to navel with baroque arabesque lace overlay, crescent side cutouts with ring connectors, high-cut hips, open back to mid-waist.',
    material: 'Satin-backed lace over gloss nylon with crystal ring connectors.',
    materialFallback: 'Lace over nylon with ring connectors.',
    micro: 'AURORA: colored sky glow casts soft spectral gradients on wet surfaces; steam scatters color into gentle bloom; lace filaments bead with condensation; crystal rings add tiny refractive glints.',
    microFallback: 'Aurora color gradients, steam bloom, condensation beads, ring glints visible.',
  },
  {
    name: '597-pool-lace-crystal-prism-flares',
    scene: 'Art-deco pool with a crystal sconce wall: faceted crystals create prismatic dispersion and small rainbow flares; wet marble coping, cool pool LEDs, warm tungsten points. Private, jewel-box.',
    pose: 'Seated on the marble edge, one hand braced behind and the other resting at her thigh; torso angled to camera; crystal light sources visible in background bokeh.',
    geometry: 'Deep V plunge to navel with rose-window radial lace core, micro-ring cutouts, high-cut hips, open back to mid-waist.',
    material: 'Liquid satin base with radial lace overlay and crystal ring connectors.',
    materialFallback: 'Satin base with lace overlay and ring connectors.',
    micro: 'PRISM: crystals throw tiny spectral flares and caustic streaks; wet marble veining stays crisp in reflections; lace micro-shadows remain visible; ring hardware refracts pin highlights into short colored streaks.',
    microFallback: 'Prismatic flares, wet marble reflections, lace shadows, colored ring streaks visible.',
  },
  {
    name: '598-pool-lace-obsidian-blackwater',
    scene: 'Obsidian black-tile pool at night: ultra-dark water, tight rim lighting, chrome rail accents, sparse warm lanterns, deep shadows. Reflections are sharp but limited; mood is high-contrast and sculptural. Private, severe.',
    pose: 'Standing at the edge with one foot on a wet step and the other on the deck, one hand on the coping and the other at her collarbone; torso three-quarter; gaze to camera.',
    geometry: 'High-neck plunge with narrow vertical keyhole to navel, chevron lace panels, ring-anchored side windows, high-cut hips, open back to mid-waist.',
    material: 'Gloss nylon base with metallic filament lace overlay and black-chrome ring connectors.',
    materialFallback: 'Nylon base with lace overlay and ring connectors.',
    micro: 'BLACKWATER: specular highlights ride the garment curvature; lace filaments show anisotropic glints against near-black; chrome rails show tight bands; wet tile shows micro-puddles with sharp spec cores and faint halos.',
    microFallback: 'Curvature spec, lace glints on dark, chrome bands, wet tile puddle spec visible.',
  },
  {
    name: '599-pool-lace-uyuni-mirrorhorizon',
    scene: 'Salt-flat mirror-horizon pool at dusk (Uyuni-inspired): thin wet deck film creates mirror reflections, huge sky gradient, distant horizon line, calm pool surface with subtle ripples. Warm lantern accents keep it luxury and intimate. Private, expansive.',
    pose: 'Standing on the wet deck with feet apart for balance, arms relaxed at sides; torso facing camera; head turned slightly; reflections of legs and lights appear in the wet film.',
    geometry: 'Cowl-drape plunge to navel with scalloped lace edge, arc side cutouts with ring anchors, high-cut hips, open back to mid-waist.',
    material: 'Satin-backed lace over a matte crepe base with brushed brass ringlets.',
    materialFallback: 'Lace over crepe base with brass ringlets.',
    micro: 'MIRROR HORIZON: thin water film creates crisp reflections with slight surface waviness; lace edges show visible thickness; brass ringlets catch warm pin lights; micro ripples distort reflections coherently.',
    microFallback: 'Wet-film reflections, lace edges, brass pin highlights, ripple distortion visible.',
  },
  {
    name: '600-pool-lace-underwater-glass-sculpture',
    scene: 'Gallery-grade pool with a submerged hand-blown glass sculpture: complex refraction and dispersion from the glass creates intricate caustic ribbons across wet stone and the suit; cool pool LEDs plus warm lantern points. Private, art-forward luxury.',
    pose: 'Standing in shallow water near the sculpture with one hand on the coping and the other lightly extended toward the water surface; torso angled to camera; gaze to camera.',
    geometry: 'Strapped plunge to navel with lattice cutouts, reinforced side bridges with ring anchors, high-cut hips, open back to mid-waist.',
    material: 'Gloss nylon base with lace lattice overlay and crystal ring connectors.',
    materialFallback: 'Nylon base with lace overlay and ring connectors.',
    micro: 'GLASS CAUSTICS: caustic ribbons are coherent with wave motion and glass curvature; dispersion produces subtle colored fringes; lace microstructure catches caustic pinpoints; wet stone shows layered reflections and micro-pitting.',
    microFallback: 'Caustic ribbons, subtle dispersion, lace pinpoints, wet stone micro-pits visible.',
  },
  {
    name: '601-pool-lace-laser-haze-lattice',
    scene: 'Night pool with low-lying haze and a precision laser lattice: beams traverse humid air above the water and form geometric intersections on wet stone. Warm sconces provide low-intensity fill to preserve skin tone realism. Private, engineered spectacle.',
    pose: 'Standing on a wet deck seam line with one foot half-turned and shoulders square to camera; one hand lightly touching the coping rail; eyes to camera.',
    geometry: 'High-neck one-piece with reinforced central keyhole ending above the sternum line, controlled side windows with narrow bridges, full back panel to mid-waist, high-cut hips.',
    material: 'Matte crepe base with corded guipure lace overlay and graphite micro-rings.',
    materialFallback: 'Crepe base with lace overlay and micro-rings.',
    micro: 'LASER VOLUMETRICS: beam segments show particulate-dependent brightness falloff; intersections brighten without overbloom; wet deck returns thin specular lines aligned to beam incidence; lace thread relief modulates line continuity at sub-centimeter scale.',
    microFallback: 'Volumetric beams, intersection brightening, beam-aligned wet reflections, lace relief modulation visible.',
  },
  {
    name: '602-pool-lace-co2-crossflow-ripples',
    scene: 'Concert-grade pool terrace with synchronized CO2 jets firing across the set, creating lateral vapor sheets that sweep over warm pool air. LED strip lighting remains subdued and directional. Private, kinetic event energy.',
    pose: 'Three-quarter stance at pool edge with knees softly flexed as if bracing against airflow; one hand on hip, the other resting on the rail; chin level to camera.',
    geometry: 'Asymmetric one-shoulder one-piece with narrow plunge panel to upper midline, diagonal side cutouts with reinforced mesh, full back panel with tensioned spine seam.',
    material: 'Satin-backed lace over gloss nylon with black-chrome clasp hardware.',
    materialFallback: 'Lace over nylon with clasp hardware.',
    micro: 'CROSSFLOW FORCES: vapor streaks indicate lateral wind vectors; garment edges show mild leeward lift while anchored seams remain stable; condensation beads cluster on windward lace ridges; specular highlights elongate along local flow direction.',
    microFallback: 'Lateral vapor flow, edge lift vs stable seams, windward condensation, flow-aligned highlights visible.',
  },
  {
    name: '603-pool-lace-projection-facet-drift',
    scene: 'Architectural pool court with projection-mapped facets moving across wall planes, water, and wet marble. The mapping is calibrated to structure and drifts slowly with designed parallax. Private, cinematic installation.',
    pose: 'Seated on the pool coping with torso upright and shoulders angled 20 degrees to camera; one hand braced behind, one hand resting on thigh; gaze direct.',
    geometry: 'High-collar one-piece with oval front aperture to upper midline, chevron side insets with narrow connectors, sculpted back with locked seam channels.',
    material: 'Liquid satin base with geometric lace overlay and titanium micro-buckles.',
    materialFallback: 'Satin base with lace overlay and micro-buckles.',
    micro: 'PROJECTION MAPPING: projected edges follow scene geometry and occlude correctly at body contour breaks; wet marble introduces controlled secondary reflections; lace mesh creates high-frequency luminance breakup; buckle faces retain crisp highlight rolloff.',
    microFallback: 'Geometry-locked projection edges, wet secondary reflections, lace luminance breakup, crisp buckle rolloff visible.',
  },
  {
    name: '604-pool-lace-confetti-caustic-rain',
    scene: 'Open-air luxury pool at night with a controlled confetti drop over the water plane. Floating fragments and wet surfaces create transient glints while pool caustics remain visible below. Private, celebratory but physically grounded.',
    pose: 'Standing mid-step on shallow entry ledge, weight over front leg; one arm relaxed by side, the other touching the collar line; head turned slightly back to camera.',
    geometry: 'Structured square-neck one-piece with centered key aperture above sternum, restrained lateral cutouts, full back panel with reinforced waist seam.',
    material: 'Polished nylon base with micro-dot tulle and lace filigree overlay; brushed brass ringlets.',
    materialFallback: 'Nylon base with tulle-lace overlay and brass ringlets.',
    micro: 'PARTICLE INTERACTION: confetti pieces show depth-sorted blur and realistic drag trajectories; wet film reflections flicker with fragment motion; lace catches sparse pin highlights without texture swim; ringlets produce short warm spec spikes.',
    microFallback: 'Depth-sorted confetti blur, flicker reflections, stable lace texture, warm ringlet spikes visible.',
  },
  {
    name: '605-pool-lace-wristband-spectral-orbit',
    scene: 'Festival-style pool venue with synchronized audience wristband lights orbiting the perimeter in timed color waves. Ambient light remains low to preserve contrast and realistic skin rendering. Private, immersive crowd-energy simulation.',
    pose: 'Waist-deep at pool edge with forearms resting on coping; shoulders relaxed; head rotated to camera with a calm expression.',
    geometry: 'High-neck one-piece with narrow vertical center slit to upper midline, side panels in scalloped lace, secure full back with tensioned shoulder anchors.',
    material: 'Matte crepe and satin hybrid with scalloped lace overlay and crystal micro-connectors.',
    materialFallback: 'Crepe-satin hybrid with lace overlay and micro-connectors.',
    micro: 'MULTI-POINT LIGHT FIELD: perimeter emitters produce soft phase-shifted chroma gradients; wet skin and garment show subtle cross-color spec separation; lace filaments retain local contrast under mixed hues; reflections decay with inverse-distance plausibility.',
    microFallback: 'Phase-shift chroma gradients, subtle cross-color spec, lace contrast retention, distance-based reflection decay visible.',
  },
  {
    name: '606-pool-lace-fireline-dual-cct',
    scene: 'High-end pool courtyard with parallel fireline features and cool underwater LEDs, creating a dual-CCT lighting split across the scene. Steam from warm water drifts through both color zones. Private, dramatic contrast.',
    pose: 'Standing on wet stone between fireline and pool edge; torso angled toward cool side while face turns to camera; one hand near waist seam.',
    geometry: 'Boat-neck one-piece with shallow angular front cut panel, controlled side windows, reinforced back lattice with low-stretch spine channels.',
    material: 'Satin-backed lace with metallic filament accents and black-chrome hardware.',
    materialFallback: 'Satin-backed lace with metallic accents and hardware.',
    micro: 'DUAL-CCT TRANSPORT: warm and cool highlights remain separable across curvature; steam blooms differently by color temperature; metallic threads show warmer anisotropic response on fire side and tighter cool spec on LED side; no channel clipping.',
    microFallback: 'Warm-cool highlight separation, temperature-dependent steam bloom, dual anisotropic thread response visible.',
  },
  {
    name: '607-pool-lace-bubble-drift-refraction',
    scene: 'Infinity pool with bubble curtain emitters near the far edge, sending rising micro-bubble columns through cyan-lit water. Wet deck and glass guardrail capture controlled reflections. Private, fluid mechanics focus.',
    pose: 'One knee on a submerged step and one foot planted on the ledge; torso upright and slightly twisted toward camera; one hand on rail.',
    geometry: 'High-coverage one-piece with curved upper aperture to upper midline, radial lace side panels, secure back yoke with reinforced seam anchors.',
    material: 'Gloss nylon base with radial lace overlay and titanium ring connectors.',
    materialFallback: 'Nylon base with lace overlay and ring connectors.',
    micro: 'BUBBLE OPTICS: bubble columns show size stratification with depth; refracted background lines warp through bubble clusters; wet garment spec remains coherent despite moving caustics; lace shadows maintain edge sharpness on curved surfaces.',
    microFallback: 'Size-stratified bubbles, bubble refraction warp, coherent garment spec, sharp lace-edge shadows visible.',
  },
  {
    name: '608-pool-lace-mirror-kaleidoscope-corridor',
    scene: 'Poolside mirror corridor with angled reflective panels creating controlled recursive reflections and depth illusions. Floor is wet but not flooded, preserving realistic highlight structure. Private, optical architecture.',
    pose: 'Walking slowly along corridor edge with shoulders parallel to mirror plane; one hand gliding near the panel seam; head turned to camera.',
    geometry: 'High-neck one-piece with restrained geometric front aperture, narrow side channels with bridge stitching, full back panel and reinforced shoulder seams.',
    material: 'Matte crepe base with geometric lace overlay and onyx micro-clasps.',
    materialFallback: 'Crepe base with lace overlay and micro-clasps.',
    micro: 'RECURSIVE REFLECTIONS: mirror bounces attenuate per recursion with slight contrast loss; panel seams remain physically aligned; wet floor adds first-order reflection only with mild ripple distortion; lace scale remains stable across reflections.',
    microFallback: 'Attenuated recursive reflections, aligned mirror seams, first-order wet reflections, stable lace scale visible.',
  },
  {
    name: '609-pool-lace-kinetic-fan-vortex',
    scene: 'Modern pool stage with silent kinetic fans generating a controlled vortex pattern in suspended mist over water. Architectural uplights provide stable base illumination. Private, motion-science aesthetic.',
    pose: 'Standing with weight on back leg and front toe angled outward; one hand at collar seam and one arm relaxed; chin slightly down to camera.',
    geometry: 'Asymmetric high-collar one-piece with offset center aperture, curved side panels with reinforced joins, full back with tensioned vertical seam channels.',
    material: 'Satin and matte-crepe composite with wave-loop lace overlay and graphite hardware.',
    materialFallback: 'Satin-crepe composite with lace overlay and hardware.',
    micro: 'VORTEX FIELD: mist forms spiral density bands consistent with fan vectoring; loose garment edges show minimal flutter while seam anchors remain fixed; condensation accumulates at lace relief peaks; specular streaks bend with local airflow direction.',
    microFallback: 'Spiral mist bands, anchored seams vs minor flutter, relief condensation, airflow-bent spec streaks visible.',
  },
  {
    name: '610-pool-lace-rain-curtain-strobe',
    scene: 'Luxury pool pavilion with a perimeter rain curtain and low-frequency strobe accents reflected in wet granite. Rain sheet is controlled and laminar near nozzle with turbulent breakup below. Private, performance-grade atmosphere.',
    pose: 'Near the rain curtain with torso angled away and head turned back to camera; one hand extended toward the water sheet without contact; stable stance on wet stone.',
    geometry: 'Square-neck one-piece with central mesh-backed aperture above midline, subtle side insets, full back panel with reinforced waist seam.',
    material: 'Gloss nylon underlayer with guipure lace overlay and micro-grommet detailing.',
    materialFallback: 'Nylon underlayer with lace overlay and grommet detailing.',
    micro: 'RAIN SHEET PHYSICS: droplet transition from laminar to turbulent is visible; strobe freezes selected droplet clusters while maintaining plausible motion blur tails; wet granite returns sharp spec cores with soft halos; lace darkens where saturation rises.',
    microFallback: 'Laminar-to-turbulent rain, selective strobe freeze, granite spec cores, saturation darkening visible.',
  },
  {
    name: '611-pool-lace-fiberoptic-floor-grid',
    scene: 'High-tech pool deck with embedded fiberoptic floor grid lines under translucent stone, producing precise linear light paths around the waterline. Ambient fill is minimal and neutral. Private, precision-luxury.',
    pose: 'Standing directly over a grid intersection with feet offset for balance; one arm bent lightly at waist, the other relaxed; torso facing camera.',
    geometry: 'High-neck one-piece with narrow center slit above sternum, controlled side mesh windows, structured back yoke with low-stretch seam rails.',
    material: 'Matte crepe base with art-deco fan lace overlay and brushed steel connectors.',
    materialFallback: 'Crepe base with lace overlay and steel connectors.',
    micro: 'LINEAR LIGHT CONSTRAINTS: fiberoptic lines remain straight through dry zones and slightly refracted through thin wet film; lace relief interrupts line continuity at micro scale; connector edges show clean Fresnel-like rim response; no blooming washout.',
    microFallback: 'Straight vs refracted light lines, micro relief interruptions, clean rim response, no bloom washout.',
  },
  {
    name: '612-pool-lace-hologauze-interference',
    scene: 'Pool atrium with suspended hologauze layers and controlled front projection, creating interference-like shimmer bands over the background while subject lighting remains physically grounded. Private, avant visual lab.',
    pose: 'Seated side-on on the pool coping with torso rotated toward camera; one hand resting behind for support and one at upper arm; gaze steady.',
    geometry: 'High-coverage one-piece with modest curved front aperture, side lace panels with narrow connectors, full back with reinforced shoulder and waist seams.',
    material: 'Satin-backed lace with micro-bead scatter and black-chrome clasp points.',
    materialFallback: 'Satin-backed lace with micro-bead scatter and clasp points.',
    micro: 'INTERFERENCE SHIMMER: background gauze bands shift with viewing angle but subject edges remain stable; micro-beads generate sparse anisotropic sparkles; wet surfaces show controlled secondary reflections without ghosting artifacts.',
    microFallback: 'Angle-shifting gauze bands, sparse bead sparkles, stable subject edges, controlled secondary reflections.',
  },
  {
    name: '613-pool-lace-photon-jet-prisms',
    scene: 'Contemporary pool with narrow water jets crossing through prism towers, splitting light into faint spectral fringes that travel over wet stone and water ripples. Private, optical engineering showcase.',
    pose: 'Standing between two prism towers with one hand near the nearest jet arc and the other resting at hip level; torso three-quarter to camera.',
    geometry: 'Boat-neck one-piece with centered upper aperture and geometric side channels, full back panel with seam reinforcement at shoulder anchors.',
    material: 'Liquid satin base with chevron lace overlay and crystal ring hardware.',
    materialFallback: 'Satin base with lace overlay and ring hardware.',
    micro: 'JET + PRISM OPTICS: water jets maintain coherent parabolic arcs; prism edges generate subtle wavelength-separated fringes; moving caustics slide over lace relief and preserve thread-scale detail; ring hardware produces brief chromatic spark points.',
    microFallback: 'Coherent jet arcs, subtle spectral fringes, moving caustics on lace relief, chromatic spark points visible.',
  },
  {
    name: '614-pool-lace-stage-smoke-bloom',
    scene: 'Poolside performance platform with low-density stage smoke drifting above warm water and backlit by narrow-beam fixtures. Architectural lighting remains soft and realistic. Private, cinematic atmosphere.',
    pose: 'Standing near the platform edge with shoulders relaxed; one hand touching rail, the other at waist seam; head turned slightly toward camera.',
    geometry: 'High-neck one-piece with minimal upper aperture, restrained side insets with reinforced bridges, full back panel with vertical seam stabilization.',
    material: 'Matte crepe base with baroque lace overlay and graphite micro-buckles.',
    materialFallback: 'Crepe base with lace overlay and micro-buckles.',
    micro: 'SMOKE SCATTER: backlights produce forward-scatter bloom cones with realistic decay; garment highlights retain edge definition despite haze; lace thread shadows remain legible at close range; wet floor shows softened but coherent reflections.',
    microFallback: 'Bloom cone decay, defined garment highlights, legible lace shadows, softened coherent reflections.',
  },
  {
    name: '615-pool-lace-ice-fog-thermal-split',
    scene: 'Cold-night pool deck with heated water and perimeter ice-fog emitters creating a thermal split: warm steam near surface, colder fog layers above. Blue-hour sky and low amber practicals. Private, atmospheric precision.',
    pose: 'At pool edge with one knee bent and one leg straight; one hand on coping and the other lightly touching upper arm; torso angled 25 degrees to camera.',
    geometry: 'Square-neck one-piece with mesh-backed center aperture above sternum, subtle side contours, full back panel and reinforced shoulder seams.',
    material: 'Satin-backed lace over matte crepe with titanium clasp details.',
    materialFallback: 'Lace over crepe with clasp details.',
    micro: 'THERMAL LAYERING: warm steam rises in buoyant plumes while cool fog stratifies and drifts laterally; condensation gradient increases from upper to lower garment zones; specular response broadens in saturated regions; seam continuity remains stable.',
    microFallback: 'Steam-vs-fog layering, vertical condensation gradient, saturation-broadened spec, stable seam continuity.',
  },
  {
    name: '616-pool-lace-circular-halo-array',
    scene: 'Circular halo-light array suspended above a private pool, producing concentric illumination bands on water and wet stone. Secondary warm sconces prevent color flattening. Private, geometric light sculpture.',
    pose: 'Centered beneath the halo array, standing upright with one arm relaxed and one hand lightly at collar seam; chin level and eyes to camera.',
    geometry: 'High-collar one-piece with narrow center aperture to upper midline, controlled side windows with mesh support, full back panel with aligned seam channels.',
    material: 'Gloss nylon base with cathedral-arch lace overlay and steel ring connectors.',
    materialFallback: 'Nylon base with lace overlay and ring connectors.',
    micro: 'CONCENTRIC LIGHTING: halo bands map coherently across curved body surfaces; water returns circular reflection distortions with ripple phase shifts; lace motifs modulate luminance locally without aliasing; connectors flash punctual highlights.',
    microFallback: 'Concentric band mapping, circular ripple reflections, stable lace luminance modulation, punctual connector highlights.',
  },
  {
    name: '617-pool-lace-metal-sparkler-microburst',
    scene: 'Poolside celebration with controlled cold-spark fountain effects (non-flame), reflecting in wet black stone and water edge. Ambient lighting is low and neutral for contrast. Private, high-energy finale aesthetic.',
    pose: 'Standing in profile-three-quarter with shoulders rotated toward camera; one hand near waist, one arm relaxed; stable stance on wet deck.',
    geometry: 'Asymmetric high-neck one-piece with compact front aperture, narrow side channels with reinforced bridges, full back yoke and structured seam spine.',
    material: 'Matte crepe and satin composite with metallic filament lace and onyx clasp hardware.',
    materialFallback: 'Crepe-satin composite with metallic lace and clasp hardware.',
    micro: 'COLD-SPARK PHYSICS: spark trajectories arc upward then decay under gravity; reflections appear as elongated streaklets on wet stone; metallic lace threads catch intermittent point highlights; no overexposed clipping blooms.',
    microFallback: 'Spark arc decay, streaklet reflections, intermittent metallic thread highlights, controlled clipping.',
  },
  {
    name: '618-pool-lace-helix-laser-waterwall',
    scene: 'Luxury pool with a thin waterwall and rotating helix laser pattern projected across it, creating spiraling light bands that refract into the pool. Warm perimeter lamps maintain natural color rendering. Private, advanced light art.',
    pose: 'Standing adjacent to the waterwall with torso angled to camera; one hand near the wall edge and one at thigh; head slightly tilted toward lens.',
    geometry: 'Boat-neck one-piece with restrained upper aperture, side lace channels with mesh backing, full back panel with reinforced waist seam.',
    material: 'Satin-backed lace over gloss nylon with crystal micro-rings.',
    materialFallback: 'Lace over nylon with micro-rings.',
    micro: 'HELIX PROJECTION: rotating bands maintain consistent angular velocity on waterwall; refracted helix fragments travel across pool floor caustics; wet garment shows moving highlight tracks without texture drift; ring crystals add brief refractive pinflashes.',
    microFallback: 'Consistent rotating helix bands, refracted fragments, moving highlight tracks, refractive pinflashes visible.',
  },
  {
    name: '619-pool-lace-spectral-shadow-theater',
    scene: 'Private pool theater setup with multi-source narrow RGB emitters casting layered colored shadows across wet architectural planes. Neutral key light keeps primary skin tone plausible. Private, controlled chromatic experiment.',
    pose: 'On the pool edge with one leg extended and one bent; torso upright and slightly turned to camera; one hand braced behind and one near collar seam.',
    geometry: 'High-neck one-piece with slim center aperture above midline, subtle side cut channels, full back panel with low-stretch vertical seam structure.',
    material: 'Matte crepe base with rose-window lace overlay and graphite ring connectors.',
    materialFallback: 'Crepe base with lace overlay and ring connectors.',
    micro: 'MULTI-SHADOW CHROMA: separate colored penumbras remain spatially coherent; wet stone carries low-contrast shadow echoes; lace relief preserves fine shadow segmentation; connectors produce neutral spec points without color contamination.',
    microFallback: 'Coherent colored penumbras, wet shadow echoes, fine lace shadow segmentation, neutral connector spec points.',
  },
  {
    name: '620-pool-lace-dawn-recovery-afterglow',
    scene: 'Post-event dawn pool with fading practicals, pale sky gradients, residual haze, and wet surfaces transitioning from night contrast to soft daylight. Private, calm high-end comedown.',
    pose: 'Standing quietly at pool edge with shoulders relaxed and arms naturally at sides; torso facing camera; slight head turn and soft eye contact.',
    geometry: 'High-coverage one-piece with gentle curved upper aperture, restrained side mesh insets, full back panel with reinforced shoulder and waist seams.',
    material: 'Satin-backed lace over matte crepe with brushed brass micro-clasps.',
    materialFallback: 'Lace over crepe with brass micro-clasps.',
    micro: 'DAWN TRANSITION: mixed-light balance shifts from tungsten remnants to cool skylight; wet surfaces show lower-contrast broader highlights; lace thread detail remains visible under softer key; haze density decreases with depth and time-of-day realism.',
    microFallback: 'Night-to-dawn light shift, broader wet highlights, visible lace thread detail, decreasing haze density.',
  },
];

const s = parseInt(process.argv[3] || '0');
const e = parseInt(process.argv[4] || String(concepts.length));
const results = [];
const abAuditRecords = [];

if (process.env.DRY_RUN === '1') {
  console.log(`DRY_RUN=1: printing prompt wordcounts only (no API calls).`);
  for (let i = s; i < Math.min(e, concepts.length); i++) {
    const expression = expressions[i % expressions.length];
    const variation = buildVariation();
    if (FRONTIER_MODE) {
      const profiles = getFrontierProfiles();
      console.log(`[${i + 1}/${concepts.length}] ${concepts[i].name}`);
      console.log(`  Mode  : frontier${DUAL_STRATEGY_MODE ? ' + multi-strategy A/B/C' : ''}`);
      for (const profile of profiles) {
        if (DUAL_STRATEGY_MODE) {
          const seedLessons = [
            'Fuse strongest identity lock with strongest optics while preserving compliance.',
            'Keep seam/load-path physics explicit and avoid geometry drift.',
          ];
          const aPassA = buildPromptPassAFrontier(concepts[i], expression, variation, profile, 'A', seedLessons);
          const aPassB = buildPromptPassBFrontier(concepts[i], expression, variation, profile, 'A', seedLessons);
          const bPassA = buildPromptPassAFrontier(concepts[i], expression, variation, profile, 'B', seedLessons);
          const bPassB = buildPromptPassBFrontier(concepts[i], expression, variation, profile, 'B', seedLessons);
          const cPassA = buildPromptPassAFrontier(concepts[i], expression, variation, profile, 'C', seedLessons);
          const cPassB = buildPromptPassBFrontier(concepts[i], expression, variation, profile, 'C', seedLessons);
          console.log(`  S-A PassA ${profile.padEnd(9)} ${wordCount(aPassA)} words`);
          console.log(`  S-A PassB ${profile.padEnd(9)} ${wordCount(aPassB)} words`);
          console.log(`  S-B PassA ${profile.padEnd(9)} ${wordCount(bPassA)} words`);
          console.log(`  S-B PassB ${profile.padEnd(9)} ${wordCount(bPassB)} words`);
          console.log(`  S-C PassA ${profile.padEnd(9)} ${wordCount(cPassA)} words`);
          console.log(`  S-C PassB ${profile.padEnd(9)} ${wordCount(cPassB)} words`);
        } else {
          const promptAFrontier = buildPromptPassAFrontier(concepts[i], expression, variation, profile, 'A');
          const promptBFrontier = buildPromptPassBFrontier(concepts[i], expression, variation, profile, 'A');
          console.log(`  PassA:${profile.padEnd(9)} ${wordCount(promptAFrontier)} words`);
          console.log(`  PassB:${profile.padEnd(9)} ${wordCount(promptBFrontier)} words`);
        }
      }
      continue;
    }
    const physicsMax = isPhysicsMaxConcept(concepts[i]);
    const promptA = (FORCE_ULTRA_PASS_A || physicsMax) ? buildPromptPassAUltra(concepts[i], expression, variation) : buildPromptPassA(concepts[i], expression, variation);
    const promptB = physicsMax ? buildPromptPassBPhysicsMax(concepts[i], expression, variation) : buildPromptPassB(concepts[i], expression, variation);
    const promptU = buildPromptPassAUltra(concepts[i], expression, variation);
    console.log(`[${i + 1}/${concepts.length}] ${concepts[i].name}`);
    console.log(`  Mode  : ${(FORCE_ULTRA_PASS_A || physicsMax) ? 'ultra-primary' : 'standard'}`);
    console.log(`  Pass A: ${wordCount(promptA)} words`);
    console.log(`  Pass B: ${wordCount(promptB)} words`);
    console.log(`  Ultra : ${wordCount(promptU)} words`);
  }
  process.exit(0);
}

if (!INPUT_IMAGE) {
  console.error('Missing input reference image path. Pass it as argv[2], or set REQUIRE_EXPLICIT_INPUT_IMAGE=0 to allow default fallback.');
  process.exit(1);
}
await fs.access(INPUT_IMAGE).catch(() => {
  console.error(`Input reference image not found or unreadable: ${INPUT_IMAGE}`);
  process.exit(1);
});
const boldMatrixPath = await writeBoldEditorialExperimentMatrix({
  conceptList: concepts,
  inputImagePath: INPUT_IMAGE,
}).catch(err => {
  console.log(`Bold matrix export skipped: ${err.message}`);
  return null;
});
if (boldMatrixPath) {
  console.log(`Bold experiment matrix: ${boldMatrixPath}`);
}

if (PHASED_BATCH_MODE) {
  if (!(FRONTIER_MODE && DUAL_STRATEGY_MODE) || process.env.PASS_A_ONLY === '1') {
    console.error('PHASED_BATCH_MODE requires FRONTIER_MODE=1, DUAL_STRATEGY_MODE=1, and PASS_A_ONLY not set.');
    process.exit(1);
  }

  const phasedResults = await runPhasedDualStrategyBatches({
    startIndex: s,
    endIndex: e,
    inputImage: INPUT_IMAGE,
  });

  console.log(`\n${'='.repeat(60)}`);
  console.log('V29 APEX PHASED RESULTS');
  console.log(`${'='.repeat(60)}`);
  const ok = phasedResults.filter(r => r.ok);
  console.log(`Success: ${ok.length}/${phasedResults.length}`);
  phasedResults.forEach(r => {
    const winnerInfo = r.winner ? ` winner=${r.winner}` : '';
    console.log(`  ${r.ok ? 'OK' : '!!'} ${r.name}${winnerInfo}${r.err ? ': ' + r.err : ''}`);
  });

  const failed = phasedResults.length - ok.length;
  process.exit(failed > 0 ? 1 : 0);
}

const existingFiles = await fs.readdir(OUTPUT_DIR).catch(() => []);
const existingNums = new Set(
  existingFiles
    .filter(f => f.endsWith('.png'))
    .map(f => parseInt(f.split('-')[0], 10))
    .filter(n => !Number.isNaN(n))
);

console.log(`\n=== V29 APEX - Two-pass, multi-turn refinement ===`);
console.log(`Range: ${s + 1}-${e} | Input: ${path.basename(INPUT_IMAGE)}`);
console.log(`Output: ${OUTPUT_DIR}`);
console.log(
  `Render: force4k=${FORCE_4K_IMAGE_SIZE ? 'on' : 'off'} ` +
  `size=${FORCE_4K_IMAGE_SIZE ? '4K' : DEFAULT_IMAGE_SIZE} ` +
  `enforce_rendered_4k=${ENFORCE_RENDERED_4K ? 'on' : 'off'} ` +
  `target=${RENDER_TARGET_WIDTH}x${RENDER_TARGET_HEIGHT} ` +
  `target_mode=${RENDER_DIMENSION_STRICT_EXACT ? 'exact' : 'minimum'} ` +
  `native_4k_enforce=${ENFORCE_NATIVE_4K_DIMS ? 'on' : 'off'} ` +
  `native_expected=${NATIVE_4K_EXPECTED_WIDTH}x${NATIVE_4K_EXPECTED_HEIGHT} ` +
  `daring_boost=${DARING_BOOST_LEVEL} ` +
  `physics_breakthrough=${PHYSICS_BREAKTHROUGH_MULTIPLIER.toFixed(1)}x ` +
  `physics_floor=${PHYSICS_SCORE_FLOOR.toFixed(2)} ` +
  `quality_base=${TARGET_QUALITY_GAIN_BASE_PCT.toFixed(1)}% ` +
  `quality_uplift=${QUALITY_UPLIFT_MULTIPLIER.toFixed(2)}x ` +
  `quality_target=${TARGET_QUALITY_GAIN_PCT.toFixed(1)}% ` +
  `initial_attempt_boost=${INITIAL_ATTEMPT_HEADROOM_BOOST_PCT.toFixed(1)}% ` +
  `initial_attempt_target=${INITIAL_ATTEMPT_HEADROOM_TARGET_PCT.toFixed(1)}% ` +
  `passA_style=${PASS_A_PRIMARY_PROMPT_STYLE} ` +
  `passB_style=${PASS_B_PRIMARY_PROMPT_STYLE} ` +
  `passB_model=${PASS_B_MODEL} ` +
  `passB_require_passa_audit=${PASS_B_REQUIRE_PASSA_AUDIT ? 'on' : 'off'} ` +
  `passB_passa_audit_hints=${PASS_B_PASSA_AUDIT_HINTS} ` +
  `passB_passa_gain_target=${PASS_B_PASSA_GAIN_TARGET_PCT.toFixed(1)}% ` +
  `passB_passa_gain_retries=${PASS_B_PASSA_GAIN_MAX_RETRIES} ` +
  `passB_passa_gain_min_step=${PASS_B_PASSA_GAIN_MIN_STEP.toFixed(2)} ` +
  `passB_passa_gain_hard_gate=${PASS_B_PASSA_GAIN_HARD_GATE ? 'on' : 'off'} ` +
  `groundbreak=${GROUND_BREAKTHROUGH_ENABLED ? 'on' : 'off'} ` +
  `groundbreak_push=${GROUND_BREAKTHROUGH_PUSH_MULTIPLIER.toFixed(1)}x ` +
  `groundbreak_trigger=${GROUND_BREAKTHROUGH_TRIGGER_SCORE.toFixed(2)} ` +
  `groundbreak_rounds=${GROUND_BREAKTHROUGH_MAX_REFINES} ` +
  `groundbreak_min_gain=${GROUND_BREAKTHROUGH_MIN_GAIN.toFixed(2)} ` +
  `phased_batch=${PHASED_BATCH_MODE ? 'on' : 'off'} ` +
  `phased_strict_order=${PHASED_STRICT_ORDER ? 'on' : 'off'} ` +
  `skip_existing=${SKIP_EXISTING_OUTPUTS ? 'on' : 'off'} ` +
  `prompt_stack=${PROMPT_SKILLSTACK_ENABLED ? 'on' : 'off'} ` +
  `prompt_level=${PROMPT_BREAKTHROUGH_LEVEL} ` +
  `bold_mode=${BOLD_EDITORIAL_MODE ? 'on' : 'off'} ` +
  `bold_level=${BOLD_EDITORIAL_INTENSITY} ` +
  `bold_matrix=${BOLD_MATRIX_EXPORT ? 'on' : 'off'} ` +
  `aspect_tol=${RENDER_TARGET_ASPECT_TOLERANCE.toFixed(4)} ` +
  `normalize_output_4k=${NORMALIZE_OUTPUT_TO_TARGET_4K ? 'on' : 'off'} ` +
  `fallback=${ENABLE_IMAGE_SIZE_FALLBACK ? IMAGE_SIZE_FALLBACK : 'disabled'} ` +
  `archive_attempts=${ARCHIVE_IMAGE_ATTEMPTS ? 'on' : 'off'} ` +
  `min_attempt_interval_s=${effectiveMinApiAttemptIntervalSeconds()}`
);
if (ARCHIVE_IMAGE_ATTEMPTS) {
  console.log(`Attempt archive: ${ATTEMPT_RUN_DIR}`);
  console.log(`Attempt manifest: ${ATTEMPTS_MANIFEST_FILE}`);
}
console.log(`Already generated: ${existingNums.size} | Skipping: [${[...existingNums].sort((a,b)=>a-b).join(',')} ]\n`);

for (let i = s; i < Math.min(e, concepts.length); i++) {
  const parsedNum = parseInt(concepts[i].name.split('-')[0], 10);
  const conceptNum = Number.isNaN(parsedNum) ? (i + 1) : parsedNum;
  if (existingNums.has(conceptNum)) {
    if (!SKIP_EXISTING_OUTPUTS) {
      console.log(`REGEN [${conceptNum}/250] ${concepts[i].name} (skip_existing=off)`);
    } else {
    const existingFinalPath = path.join(OUTPUT_DIR, `${concepts[i].name}.png`);
    if (FORCE_4K_IMAGE_SIZE) {
      const existingBuffer = await fs.readFile(existingFinalPath).catch(() => null);
      if (!existingBuffer) {
        console.log(`REGEN [${conceptNum}/250] ${concepts[i].name} (existing file missing/unreadable)`);
      } else {
        const existingPolicy = await validateBufferAgainst4kPolicy(
          existingBuffer,
          mimeTypeFromPath(existingFinalPath) || 'image/png',
          `existing-final:${existingFinalPath}`
        );
        if (!existingPolicy.accepted) {
          console.log(`REGEN [${conceptNum}/250] ${concepts[i].name} (${existingPolicy.reason})`);
        } else {
          console.log(`SKIP [${conceptNum}/250] ${concepts[i].name} (already exists)`);
          results.push({ name: concepts[i].name, path: 'exists', ok: true });
          continue;
        }
      }
    } else {
      console.log(`SKIP [${conceptNum}/250] ${concepts[i].name} (already exists)`);
      results.push({ name: concepts[i].name, path: 'exists', ok: true });
      continue;
    }
    }
  }
  let ok = false;
  let lastErr = null;
  for (let attempt = 1; attempt <= MAX_CONCEPT_ATTEMPTS; attempt++) {
    CURRENT_CONCEPT_ATTEMPT = attempt;
    CURRENT_CONCEPT_MAX_ATTEMPTS = MAX_CONCEPT_ATTEMPTS;
    GLOBAL_RATE_LIMIT_STREAK = 0;
    GLOBAL_NEXT_REQUEST_AT_MS = 0;
    try {
      console.log(`\n--- ATTEMPT ${attempt}/${MAX_CONCEPT_ATTEMPTS} for ${concepts[i].name} ---`);
      if (FRONTIER_MODE && DUAL_STRATEGY_MODE && process.env.PASS_A_ONLY !== '1') {
        const dual = await runDualStrategyConcept(concepts[i], INPUT_IMAGE, i);
        const gate = dual?.qualityGate || {};
        const gatePass = gate?.pass !== false;
        if (STRICT_QUALITY_GATE && !gatePass) {
          const finalMult = Number(gate?.final_from_revised) || 0;
          const minMult = Number(gate?.min_final_multiplier) || MIN_FINAL_MULTIPLIER_GATE;
          const failReasons = Array.isArray(gate?.failure_reasons) && gate.failure_reasons.length
            ? gate.failure_reasons
            : [`final_multiplier ${finalMult.toFixed(2)}x < required ${minMult.toFixed(2)}x`];
          const failText = failReasons.join(' | ');
          if (attempt < MAX_CONCEPT_ATTEMPTS) {
            throw new Error(`QUALITY_GATE_FAIL ${failText}`);
          }
          if (dual?.path) {
            console.log(
              `QUALITY GATE FAIL ${concepts[i].name}: ${failText}; keeping generated output but marking concept failed.`
            );
            results.push({
              name: concepts[i].name,
              path: dual.path,
              ok: false,
              attempt,
              winner: dual.audit?.winner?.approach || 'n/a',
              final_multiplier: finalMult,
              quality_gate_failed: true,
              err: failText,
            });
            if (dual.audit) abAuditRecords.push(dual.audit);
            ok = true;
            break;
          }
          throw new Error(`QUALITY_GATE_FAIL ${failText}`);
        }
        results.push({
          name: concepts[i].name,
          path: dual.path,
          ok: !!dual.path,
          attempt,
          winner: dual.audit?.winner?.approach || 'n/a',
          final_multiplier: Number(gate?.final_from_revised) || null,
        });
        if (dual.audit) abAuditRecords.push(dual.audit);
        ok = true;
        break;
      }
      const passA = await generatePassA(concepts[i], INPUT_IMAGE, i);
      if (process.env.PASS_A_ONLY === '1') {
        const passAImg = await fs.readFile(passA.fp);
        if (isSourceCloneBuffer(passAImg, await fs.readFile(INPUT_IMAGE))) {
          throw new Error('PASS_A_ONLY failed: pass A artifact is source-identical.');
        }
        const passAOnlyIdentityGate = await enforceDeterministicIdentityGate({
          referencePath: INPUT_IMAGE,
          candidateBuffer: passAImg,
          candidateMimeType: mimeTypeFromPath(passA.fp) || 'image/png',
          approachKey: 'legacy',
          profile: 'passA-only',
          stage: 'passA-only-final',
        });
        if (!passAOnlyIdentityGate.accepted) {
          throw new Error('PASS_A_ONLY failed deterministic identity gate.');
        }
        const fp = path.join(OUTPUT_DIR, `${concepts[i].name}.png`);
        await fs.writeFile(fp, passAImg);
        console.log(`PASS_A_ONLY: saved final from pass A -> ${fp}`);
        results.push({ name: concepts[i].name, path: fp, ok: true });
        ok = true;
        break;
      }
      console.log(`Waiting ${RETRY_WAIT_S}s between passes...`);
      await waitWithHeartbeat(RETRY_WAIT_S, 'between passes');
      const passBResult = await generatePassB(concepts[i], passA, INPUT_IMAGE, i);
      const fp = typeof passBResult === 'string' ? passBResult : passBResult?.path;
      results.push({ name: concepts[i].name, path: fp, ok: !!fp, attempt });
      ok = true;
      break;
    } catch (err) {
      lastErr = err;
      console.error(`FAIL attempt ${attempt}/${MAX_CONCEPT_ATTEMPTS}: ${concepts[i].name} - ${err.message}`);
      if (attempt < MAX_CONCEPT_ATTEMPTS) {
        console.log(`Retrying ${concepts[i].name} after ${RETRY_WAIT_S}s...`);
        await waitWithHeartbeat(RETRY_WAIT_S, 'concept retry');
      }
    }
  }
  if (!ok) {
    results.push({ name: concepts[i].name, path: null, ok: false, err: lastErr?.message || 'unknown error' });
  }
  if (i < Math.min(e, concepts.length) - 1) {
    console.log(`Waiting ${RETRY_WAIT_S}s...`);
    await waitWithHeartbeat(RETRY_WAIT_S, 'between concepts');
  }
}

console.log(`\n${'='.repeat(60)}`);
console.log('V29 APEX RESULTS');
console.log(`${'='.repeat(60)}`);
const ok = results.filter(r => r.ok);
console.log(`Success: ${ok.length}/${results.length}`);
results.forEach(r => {
  const winnerInfo = r.winner ? ` winner=${r.winner}` : '';
  console.log(`  ${r.ok ? 'OK' : '!!'} ${r.name}${winnerInfo}${r.err ? ': ' + r.err : ''}`);
});
if (abAuditRecords.length > 0) {
  const allLines = (await fs.readFile(AB_AUDIT_FILE, 'utf8'))
    .split('\n')
    .map(s => s.trim())
    .filter(Boolean);
  const allRecords = allLines.map(line => {
    try {
      return JSON.parse(line);
    } catch {
      return null;
    }
  }).filter(Boolean);
  const summary = normalizeAuditSummary(allRecords);
  await fs.writeFile(AB_SUMMARY_FILE, `${JSON.stringify(summary, null, 2)}\n`);
  console.log('\nA/B/C AUDIT SUMMARY');
  console.log(`  Concepts audited: ${summary.concepts}`);
  console.log(`  Wins: A=${summary.wins.A || 0} | B=${summary.wins.B || 0} | C=${summary.wins.C || 0}`);
  console.log(
    `  Avg overall: A=${(summary.avg_overall.A || 0).toFixed(2)} | B=${(summary.avg_overall.B || 0).toFixed(2)} | C=${(summary.avg_overall.C || 0).toFixed(2)}`
  );
  console.log(
    `  C headroom gain vs best(A/B): avg=${(summary.c_gain_percent_vs_best_ab?.avg || 0).toFixed(1)}% target=${summary.c_gain_percent_vs_best_ab?.target ?? TARGET_QUALITY_GAIN_PCT}% hits=${summary.c_gain_percent_vs_best_ab?.target_hit_count || 0}`
  );
  if (Array.isArray(summary.top_lessons) && summary.top_lessons.length > 0) {
    console.log('  Top lessons:');
    summary.top_lessons.slice(0, 6).forEach((item, idx2) => {
      const lesson = item?.lesson || item?.hint || 'n/a';
      const count = Number(item?.count) || 0;
      console.log(`    ${idx2 + 1}. (${count}x) ${lesson}`);
    });
  }
  console.log(`  Audit JSONL: ${AB_AUDIT_FILE}`);
  console.log(`  Audit Summary: ${AB_SUMMARY_FILE}`);

  const learningRecords = await loadLearningAuditRecords();
  if (learningRecords.length > 0) {
    const learningPlan = normalizeLearningPlan(learningRecords);
    await fs.writeFile(LEARNING_PLAN_FILE, `${JSON.stringify(learningPlan, null, 2)}\n`);
    console.log('  Learning Plan:');
    console.log(`    Rounds: ${learningPlan.rounds}`);
    console.log(`    Avg delta A=${(learningPlan.avg_deltas.A || 0).toFixed(2)} | B=${(learningPlan.avg_deltas.B || 0).toFixed(2)} | C_vs_best_ab=${(learningPlan.avg_deltas.C_vs_best_ab || 0).toFixed(2)}`);
    if (Array.isArray(learningPlan.next_round_objectives) && learningPlan.next_round_objectives.length > 0) {
      console.log('    Next objectives:');
      learningPlan.next_round_objectives.slice(0, 4).forEach((item, idx2) => {
        console.log(`      ${idx2 + 1}. ${item}`);
      });
    }
    console.log(`    Learning Audit JSONL: ${LEARNING_AUDIT_FILE}`);
    console.log(`    Learning Plan JSON: ${LEARNING_PLAN_FILE}`);
  }
}
console.log(`\nOutput: ${OUTPUT_DIR}`);
