// Release gate REGISTRY-01: at least ten real, admitted records that pass the admission checks.
// Usage: npm run registry:gate   (exits non-zero when the gate fails)
import businesses from "../src/data/reference-registry/businesses.json";
import claims from "../src/data/reference-registry/claims.json";
import manifest from "../src/data/reference-registry/manifest.json";
import sources from "../src/data/reference-registry/sources.json";
import { integrityIssues, REQUIRED_ADMITTED, releaseGate } from "../src/lib/registry/eligibility";
import { RegistryFiles } from "../src/lib/registry/schema";

const files = RegistryFiles.parse({ businesses, sources, claims });
const integrity = integrityIssues(files);
const gate = releaseGate(files);

console.log(`Registry ${manifest.version}`);
console.log(`  admitted & passing : ${gate.admitted.length} / ${REQUIRED_ADMITTED} required`);
console.log(`  awaiting review    : ${gate.pending.length}${gate.pending.length ? ` (${gate.pending.join(", ")})` : ""}`);
for (const r of gate.rejected) console.log(`  REJECTED ${r.id}: ${r.reasons.join("; ")}`);
for (const i of integrity) console.log(`  INTEGRITY ${i.ref}: ${i.message}`);
if (manifest.admittedCount !== gate.admitted.length) {
  console.log(`  manifest.admittedCount is ${manifest.admittedCount}; should be ${gate.admitted.length}`);
}

const pass = gate.passes && integrity.length === 0 && manifest.admittedCount === gate.admitted.length;
console.log(pass ? "\nREGISTRY GATE: PASS" : "\nREGISTRY GATE: FAIL");
process.exit(pass ? 0 : 1);
