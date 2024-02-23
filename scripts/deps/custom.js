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
		return this.paths.every((path) => path.endsWith(".test.ts") || !path.includes("/source/"));
	}
}

testDependencies = (packageJson, dependencies) => {
	const testDependencies = dependencies.filter((dep) => !dep.testOnly).map((dep) => dep.name);

	const combined = new Set([...testDependencies, ...packageJson.dependencies]);

	const missing = [];
	const unused = [];
	const used = [];

	for (const dep of combined.values()) {
		if (testDependencies.includes(dep) && packageJson.dependencies.includes(dep)) {
			used.push(dep);
			continue;
		}

		if (testDependencies.includes(dep)) {
			missing.push(dep);
		} else {
			unused.push(dep);
		}
	}

	return { missing, unused };
};

testDevDependencies = (packageJson, dependencies) => {
	const testDependencies = dependencies.filter((dep) => dep.testOnly).map((dep) => dep.name);

	const combined = new Set([...testDependencies, ...packageJson.devDependencies]);

	const missing = [];
	const unused = [];

	for (const dep of combined.values()) {
		if (testDependencies.includes(dep) && packageJson.devDependencies.includes(dep)) {
			continue;
		}

		if (testDependencies.includes(dep)) {
			missing.push(dep);
		} else {
			unused.push(dep);
		}
	}

	return { missing, unused };
};

const main = async () => {
	const source = resolve(__dirname, "../../packages");

	// const pkgs = readdirSync(source)
	// 	.filter((name) => lstatSync(`${source}/${name}`).isDirectory())
	// 	.sort();
	const pkgs = ["api"];

	for (const pkg of pkgs) {
		const packageJson = require(join(source, pkg, "package.json"));

		const package = new Package(packageJson);

		// console.log("Checking: ", package);

		await depcheck(
			join(source, pkg),
			{
				// ignorePatterns: ["*.test.ts"],
				ignoreDirs: ["node_modules", "distribution"],
				ignoreMatches: ["@types/*"],
			},
			(result) => {
				// const missing = Object.keys(result.missing);
				// packageJson;
				// console.log("Missing: ", result.missing);
				// console.log("Dependencies: ", result.dependencies);
				// console.log("DevDependencies: ", result.devDependencies);
				// console.log("Using: ", result.using);
				// if (missing.length > 0) {
				// 	console.log(`[FAIL] ${package_}`);
				// 	for (const dep of missing) {
				// 		console.log(`lerna add ${dep} --scope=@mainsail/${package_}`);
				// 	}
				// } else {
				// 	console.log(`[PASS] ${package_}`);
				// }

				const dependencies = Object.keys(result.using).map((name) => new Dependency(name, result.using[name]));

				// console.log(
				// 	"Dependencies: ",
				// 	dependencies.filter((dep) => dep.testOnly),
				// );

				const { missing, unused, used } = testDependencies(package, dependencies);

				console.log("Used: ", used);
				console.log("Missing: ", missing);
				console.log("Unused: ", unused);

				// const { missing: devMissing, unused: devUnused } = testDevDependencies(package, dependencies);

				// console.log(
				// 	"DevMissing: ",
				// 	devMissing.map((dep) => dep.name),
				// );
				// console.log(
				// 	"DevUnused: ",
				// 	devUnused.map((dep) => dep.name),
				// );
			},
		);
	}
};

main();
