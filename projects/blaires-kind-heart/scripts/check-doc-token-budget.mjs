import { execFileSync } from "node:child_process";

const defaultBudget = 25000;
const envBudget = Number(process.env.DOC_TOKEN_BUDGET || "");
const budget = Number.isFinite(envBudget) && envBudget > 0 ? envBudget : defaultBudget;

function fail(message) {
  console.error(`[doc-token-budget] FAIL: ${message}`);
  process.exit(1);
}

let baseline;
try {
  const stdout = execFileSync("node", ["scripts/token-doc-baseline.mjs", "--json"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  baseline = JSON.parse(stdout);
} catch (error) {
  const msg = error instanceof Error ? error.message : String(error);
  fail(`unable to read token baseline (${msg})`);
}

const activeTokens = baseline?.active?.estimated_tokens;
if (!Number.isFinite(activeTokens)) {
  fail("baseline output missing active.estimated_tokens");
}

console.log(`[doc-token-budget] active_est_tokens=${activeTokens}`);
console.log(`[doc-token-budget] budget=${budget}`);

if (activeTokens > budget) {
  fail(`active docs exceed budget by ${activeTokens - budget} tokens`);
}

console.log("[doc-token-budget] PASS");
