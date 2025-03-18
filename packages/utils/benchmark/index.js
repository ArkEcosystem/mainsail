import { readdirSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";

import bench from "micro-bmark";

const path = fileURLToPath(join(import.meta.url, "../"));

const run = async () => {
	const suites = readdirSync(path)
		.filter((name) => name !== "index.js")
		.sort();

	for (const suite of suites) {
		console.log(`\n${suite}`);

		for (const [label, callback] of Object.entries(await import(join(path, suite)))) {
			await bench(label, callback);
		}
	}

	// bench.logMem();
	// bench.getTime();
};

await run();
