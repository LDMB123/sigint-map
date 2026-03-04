#!/usr/bin/env node
import path from 'node:path';
import process from 'node:process';
import { readFile, stat } from 'node:fs/promises';

const ROOT = process.cwd();
const MANIFEST_PATH = path.join(ROOT, 'docs', 'testing', 'release-evidence', 'manifest.json');
const SCHEMA_PATH = path.join(ROOT, 'docs', 'testing', 'release-evidence', 'manifest.schema.json');

const EXPECTED_TARGETS = {
  release_track: 'RC4',
  device_target: 'iPad mini 6',
  os_target: 'iPadOS 26.2',
  browser_target: 'Safari 26.2',
};

const REQUIRED_RUN_IDS = ['rc3_run_01', 'rc4_run_02'];
const REQUIRED_KPI_WAIVER_ID = 'phase5-db-reduction-rc4';

function usageAndExit() {
  console.error('Usage: node scripts/check-release-evidence.mjs [--soft]');
  process.exit(1);
}

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function getJsonPointerValue(root, pointer) {
  if (pointer === '#') {
    return root;
  }
  if (!pointer.startsWith('#/')) {
    throw new Error(`unsupported $ref pointer: ${pointer}`);
  }
  const tokens = pointer
    .slice(2)
    .split('/')
    .map((part) => part.replace(/~1/g, '/').replace(/~0/g, '~'));
  let current = root;
  for (const token of tokens) {
    if (!isObject(current) && !Array.isArray(current)) {
      return undefined;
    }
    current = current[token];
  }
  return current;
}

function typeMatches(expectedType, value) {
  switch (expectedType) {
    case 'string':
      return typeof value === 'string';
    case 'integer':
      return Number.isInteger(value);
    case 'number':
      return typeof value === 'number' && Number.isFinite(value);
    case 'boolean':
      return typeof value === 'boolean';
    case 'array':
      return Array.isArray(value);
    case 'object':
      return isObject(value);
    case 'null':
      return value === null;
    default:
      return true;
  }
}

function validateSchemaNode(schemaRoot, schemaNode, value, instancePath, errors) {
  if (!isObject(schemaNode)) {
    return;
  }

  if (typeof schemaNode.$ref === 'string') {
    const resolved = getJsonPointerValue(schemaRoot, schemaNode.$ref);
    if (!resolved) {
      errors.push(`${instancePath}: unresolved schema ref ${schemaNode.$ref}`);
      return;
    }
    validateSchemaNode(schemaRoot, resolved, value, instancePath, errors);
    return;
  }

  if (Array.isArray(schemaNode.allOf)) {
    for (const branch of schemaNode.allOf) {
      validateSchemaNode(schemaRoot, branch, value, instancePath, errors);
    }
  }

  if (value === undefined) {
    return;
  }

  if (schemaNode.const !== undefined && schemaNode.const !== value) {
    errors.push(`${instancePath}: expected constant ${JSON.stringify(schemaNode.const)} got ${JSON.stringify(value)}`);
  }

  if (Array.isArray(schemaNode.enum) && !schemaNode.enum.includes(value)) {
    errors.push(`${instancePath}: expected one of ${JSON.stringify(schemaNode.enum)} got ${JSON.stringify(value)}`);
  }

  if (schemaNode.type !== undefined) {
    const allowedTypes = Array.isArray(schemaNode.type) ? schemaNode.type : [schemaNode.type];
    if (!allowedTypes.some((allowedType) => typeMatches(allowedType, value))) {
      errors.push(`${instancePath}: expected type ${allowedTypes.join('|')} got ${Array.isArray(value) ? 'array' : typeof value}`);
      return;
    }
  }

  if (typeof value === 'string') {
    if (typeof schemaNode.minLength === 'number' && value.length < schemaNode.minLength) {
      errors.push(`${instancePath}: string length must be >= ${schemaNode.minLength}`);
    }
    if (typeof schemaNode.maxLength === 'number' && value.length > schemaNode.maxLength) {
      errors.push(`${instancePath}: string length must be <= ${schemaNode.maxLength}`);
    }
    if (typeof schemaNode.pattern === 'string') {
      const regex = new RegExp(schemaNode.pattern);
      if (!regex.test(value)) {
        errors.push(`${instancePath}: value ${JSON.stringify(value)} does not match pattern ${schemaNode.pattern}`);
      }
    }
  }

  if (typeof value === 'number') {
    if (typeof schemaNode.minimum === 'number' && value < schemaNode.minimum) {
      errors.push(`${instancePath}: number must be >= ${schemaNode.minimum}`);
    }
    if (typeof schemaNode.maximum === 'number' && value > schemaNode.maximum) {
      errors.push(`${instancePath}: number must be <= ${schemaNode.maximum}`);
    }
  }

  if (Array.isArray(value)) {
    if (typeof schemaNode.minItems === 'number' && value.length < schemaNode.minItems) {
      errors.push(`${instancePath}: array length must be >= ${schemaNode.minItems}`);
    }
    if (typeof schemaNode.maxItems === 'number' && value.length > schemaNode.maxItems) {
      errors.push(`${instancePath}: array length must be <= ${schemaNode.maxItems}`);
    }
    if (schemaNode.items !== undefined) {
      for (let index = 0; index < value.length; index += 1) {
        validateSchemaNode(schemaRoot, schemaNode.items, value[index], `${instancePath}[${index}]`, errors);
      }
    }
  }

  if (isObject(value)) {
    const properties = isObject(schemaNode.properties) ? schemaNode.properties : {};
    const required = Array.isArray(schemaNode.required) ? schemaNode.required : [];
    const additionalProperties = schemaNode.additionalProperties;

    for (const key of required) {
      if (!Object.prototype.hasOwnProperty.call(value, key)) {
        errors.push(`${instancePath}: missing required property ${key}`);
      }
    }

    for (const [key, propertyValue] of Object.entries(value)) {
      const childPath = instancePath === '$' ? `$.${key}` : `${instancePath}.${key}`;
      if (Object.prototype.hasOwnProperty.call(properties, key)) {
        validateSchemaNode(schemaRoot, properties[key], propertyValue, childPath, errors);
        continue;
      }

      if (additionalProperties === false) {
        errors.push(`${instancePath}: unknown property ${key}`);
      }
    }
  }
}

function isIsoDateString(value) {
  if (typeof value !== 'string') {
    return false;
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.valueOf())) {
    return false;
  }
  const [year, month, day] = value.split('-').map((part) => Number(part));
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() + 1 === month &&
    parsed.getUTCDate() === day
  );
}

function todayIsoDateUtc() {
  const now = new Date();
  return `${now.getUTCFullYear().toString().padStart(4, '0')}-${(now.getUTCMonth() + 1)
    .toString()
    .padStart(2, '0')}-${now.getUTCDate().toString().padStart(2, '0')}`;
}

async function fileExists(filePath) {
  try {
    const fileStat = await stat(filePath);
    return fileStat.isFile();
  } catch {
    return false;
  }
}

function collectEvidencePaths(manifest) {
  const evidencePaths = [];
  if (Array.isArray(manifest.physical_runs)) {
    for (const run of manifest.physical_runs) {
      evidencePaths.push({
        path: run.report_path,
        context: `physical_runs[${run.id ?? 'unknown'}].report_path`,
      });
    }
  }
  if (isObject(manifest.kpi_status)) {
    evidencePaths.push({
      path: manifest.kpi_status.source_report_path,
      context: 'kpi_status.source_report_path',
    });
  }
  if (Array.isArray(manifest.waivers)) {
    for (const waiver of manifest.waivers) {
      evidencePaths.push({
        path: waiver.doc_path,
        context: `waivers[${waiver.id ?? 'unknown'}].doc_path`,
      });
    }
  }
  return evidencePaths;
}

function ensureExpectedTargets(manifest, failures) {
  for (const [key, expectedValue] of Object.entries(EXPECTED_TARGETS)) {
    const actualValue = manifest[key];
    if (actualValue !== expectedValue) {
      failures.push(`${key} mismatch: expected "${expectedValue}", got "${actualValue}"`);
    }
  }
}

function ensureRunIds(manifest, failures) {
  if (!Array.isArray(manifest.physical_runs)) {
    return;
  }
  const runIds = manifest.physical_runs.map((run) => run.id);
  const uniqueRunIds = new Set(runIds);
  if (uniqueRunIds.size !== runIds.length) {
    failures.push('physical_runs must not contain duplicate run IDs');
  }
  for (const requiredRunId of REQUIRED_RUN_IDS) {
    if (!uniqueRunIds.has(requiredRunId)) {
      failures.push(`physical_runs is missing required run id "${requiredRunId}"`);
    }
  }
  for (const runId of uniqueRunIds) {
    if (!REQUIRED_RUN_IDS.includes(runId)) {
      failures.push(`physical_runs contains unsupported run id "${runId}"`);
    }
  }
}

function ensureStrictRunOutcomes(manifest, failures) {
  if (!Array.isArray(manifest.physical_runs)) {
    return;
  }
  for (const run of manifest.physical_runs) {
    if (run.status !== 'PASS') {
      failures.push(`strict mode: run "${run.id}" status must be PASS (actual "${run.status}")`);
    }
    if (run.p0_open !== 0) {
      failures.push(`strict mode: run "${run.id}" p0_open must be 0 (actual ${run.p0_open})`);
    }
    if (run.p1_open !== 0) {
      failures.push(`strict mode: run "${run.id}" p1_open must be 0 (actual ${run.p1_open})`);
    }
  }
}

function ensureWaiverForKpiFailure(manifest, failures) {
  if (!isObject(manifest.kpi_status) || manifest.kpi_status.db_reduction_status !== 'FAIL') {
    return;
  }

  if (!Array.isArray(manifest.waivers)) {
    failures.push(
      `kpi_status.db_reduction_status=FAIL requires waiver ${REQUIRED_KPI_WAIVER_ID}, but waivers is missing`,
    );
    return;
  }

  const waiver = manifest.waivers.find((item) => item.id === REQUIRED_KPI_WAIVER_ID);
  if (!waiver) {
    failures.push(
      `kpi_status.db_reduction_status=FAIL requires waiver id "${REQUIRED_KPI_WAIVER_ID}"`,
    );
    return;
  }

  if (waiver.status !== 'APPROVED') {
    failures.push(
      `waiver "${REQUIRED_KPI_WAIVER_ID}" must be APPROVED when db_reduction_status=FAIL (actual "${waiver.status}")`,
    );
  }

  if (typeof waiver.justification !== 'string' || waiver.justification.trim().length === 0) {
    failures.push(`waiver "${REQUIRED_KPI_WAIVER_ID}" must include a non-empty justification`);
  }

  if (
    typeof waiver.followup_milestone !== 'string' ||
    waiver.followup_milestone.trim().length === 0
  ) {
    failures.push(`waiver "${REQUIRED_KPI_WAIVER_ID}" must include a non-empty followup_milestone`);
  }

  if (!isIsoDateString(waiver.expires_on)) {
    failures.push(`waiver "${REQUIRED_KPI_WAIVER_ID}" expires_on must be a valid YYYY-MM-DD date`);
  } else if (waiver.expires_on < todayIsoDateUtc()) {
    failures.push(
      `waiver "${REQUIRED_KPI_WAIVER_ID}" is expired (expires_on=${waiver.expires_on}, today=${todayIsoDateUtc()})`,
    );
  }
}

async function ensureEvidencePathsExist(manifest, failures) {
  const evidencePaths = collectEvidencePaths(manifest);
  for (const entry of evidencePaths) {
    if (typeof entry.path !== 'string' || entry.path.trim().length === 0) {
      failures.push(`${entry.context} must be a non-empty path string`);
      continue;
    }

    if (path.isAbsolute(entry.path)) {
      failures.push(`${entry.context} must be repository-relative, got absolute path "${entry.path}"`);
      continue;
    }

    const resolved = path.resolve(ROOT, entry.path);
    const exists = await fileExists(resolved);
    if (!exists) {
      failures.push(`${entry.context} missing file: ${entry.path}`);
    }
  }
}

async function main() {
  const args = process.argv.slice(2);
  const hasSoftFlag = args.includes('--soft');
  const unknownArgs = args.filter((arg) => arg !== '--soft');
  if (unknownArgs.length > 0) {
    usageAndExit();
  }

  const mode = hasSoftFlag ? 'soft' : 'strict';
  const failures = [];

  const [schemaRaw, manifestRaw] = await Promise.all([
    readFile(SCHEMA_PATH, 'utf8'),
    readFile(MANIFEST_PATH, 'utf8'),
  ]);

  let schema;
  let manifest;
  try {
    schema = JSON.parse(schemaRaw);
  } catch (error) {
    console.error(`[release-evidence] FAIL schema parse error: ${error.message}`);
    process.exit(1);
  }
  try {
    manifest = JSON.parse(manifestRaw);
  } catch (error) {
    console.error(`[release-evidence] FAIL manifest parse error: ${error.message}`);
    process.exit(1);
  }

  const schemaErrors = [];
  validateSchemaNode(schema, schema, manifest, '$', schemaErrors);
  for (const schemaError of schemaErrors) {
    failures.push(`schema: ${schemaError}`);
  }

  ensureExpectedTargets(manifest, failures);
  ensureRunIds(manifest, failures);
  ensureWaiverForKpiFailure(manifest, failures);
  await ensureEvidencePathsExist(manifest, failures);

  if (!hasSoftFlag) {
    ensureStrictRunOutcomes(manifest, failures);
  }

  if (failures.length > 0) {
    console.error(`[release-evidence] FAIL (${mode})`);
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exit(1);
  }

  console.log(`[release-evidence] PASS (${mode})`);
}

main().catch((error) => {
  console.error(`[release-evidence] FAIL unexpected error: ${error.message}`);
  process.exit(1);
});
