const { readdirSync } = require("fs");
const bench = require("micro-bmark");

const { run, mark } = bench; // or bench.mark

run(async () => {
	const suites = readdirSync(__dirname)
		.filter((name) => name !== "index.js")
		.filter((name) => name !== "helpers.js")
		.sort();

	for (const suite of suites) {
		for (const [label, callback] of Object.entries(require(`./${suite}`))) {
			await mark(label, callback);
		}
	}

	bench.logMem();
	bench.getTime();
});
