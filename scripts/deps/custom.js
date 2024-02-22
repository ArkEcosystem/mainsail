const depcheck = require("depcheck");
const { resolve, join } = require("path");
const { lstatSync, readdirSync } = require("fs");

class Package {
	constructor(packageJson) {
		this.name = packageJson.name;
		this.dependencies = Object.keys(packageJson.dependencies);
		this.devDependencies = Object.keys(packageJson.devDependencies).filter((x) => !x.startsWith("@types/"));
	}
}

class Dependency {
	constructor(name, paths) {
		this.name = name;
		this.paths = paths;
		this.testOnly = this.isTestOnly();
	}

	isTestOnly() {
		return this.paths.every((path) => path.endsWith(".test.ts"));
	}
}

const main = async () => {
	const source = resolve(__dirname, "../../packages");

	// const pkgs = readdirSync(source)
	// 	.filter((name) => lstatSync(`${source}/${name}`).isDirectory())
	// 	.sort();
	const pkgs = ["api"];

	for (const pkg of pkgs) {
		const packageJson = require(join(source, pkg, "package.json"));

		const package = new Package(packageJson);

		console.log("Checking: ", package);

		await depcheck(
			join(source, pkg),
			{
				// ignorePatterns: ["*.test.ts"],
				ignoreDirs: ["node_modules", "benchmark", "distribution", "test"],
				ignoreMatches: ["@types/*"],
			},
			(unused) => {
				// const missing = Object.keys(unused.missing);packageJson
				// console.log("Missing: ", unused.missing);
				// console.log("Dependencies: ", unused.dependencies);
				// console.log("DevDependencies: ", unused.devDependencies);
				// console.log("Using: ", unused.using);
				// if (missing.length > 0) {
				// 	console.log(`[FAIL] ${package_}`);
				// 	for (const dep of missing) {
				// 		console.log(`lerna add ${dep} --scope=@mainsail/${package_}`);
				// 	}
				// } else {
				// 	console.log(`[PASS] ${package_}`);
				// }

				const dependencies = Object.keys(unused.using).map((name) => new Dependency(name, unused.using[name]));

				console.log(
					"Dependencies: ",
					dependencies.filter((dep) => dep.testOnly),
				);
			},
		);
	}
};

main();
