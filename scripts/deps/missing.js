const depcheck = require("depcheck");
const { resolve } = require("path");
const { lstatSync, readdirSync } = require("fs");

const main = async () => {
	const source = resolve(__dirname, "../../packages");

	const pkgs = readdirSync(source)
		.filter((name) => lstatSync(`${source}/${name}`).isDirectory())
		.sort();

	for (const package_ of pkgs) {
		await depcheck(
			`${source}/${package_}`,
			{
				ignoreDirs: ["__tests__", "benchmark", "distribution", "docker", "scripts"],
				ignoreMatches: ["@types/*"],
			},
			(unused) => {
				const missing = Object.keys(unused.missing);

				if (missing.length > 0) {
					console.log(`[FAIL] ${package_}`);

					for (const dep of missing) {
						console.log(`lerna add ${dep} --scope=@mainsail/${package_}`);
					}
				} else {
					console.log(`[PASS] ${package_}`);
				}
			},
		);
	}
};

main();
