// Copies the generated protobuf artifacts into distribution/.
//
// The static-module `protos.js` is intentionally excluded from the TypeScript program (its
// generated export shape trips declaration emit under `declaration` + `allowJs`), so `tsc` does
// not emit it. This step ships the runtime `protos.js` and its generated `protos.d.ts` alongside
// the compiled output so the codecs can import them at runtime and downstream type resolution works.

import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const packageDir = dirname(dirname(fileURLToPath(import.meta.url))); // scripts/ -> package root
const relDir = join("socket-server", "codecs", "proto");
const srcDir = join(packageDir, "source", relDir);
const outDir = join(packageDir, "distribution", relDir);

mkdirSync(outDir, { recursive: true });

for (const file of ["protos.js", "protos.d.ts"]) {
	copyFileSync(join(srcDir, file), join(outDir, file));
	console.log(`[@mainsail/p2p] copied ${file} -> distribution/${relDir}`);
}
