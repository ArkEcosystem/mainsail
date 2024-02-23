const depcheck = require("depcheck");
const { resolve, join } = require("path");
const { lstatSync, readdirSync } = require("fs");

// Dependency categorization:
// USAGE in code -> Type:
// - Source -> Used in source code, but not in tests
// - Test -> not used in source code, but only in tests
// - Both -> Used in both source code and tests
// * NOTE: We are using testOnly flag, because Source & Both can be treated the same and should be registered in dependencies

// INVALID CASES:
// Unused -> Not used in source code or tests -> (should be removed from dependencies && devDependencies)

// Unused -> Unused in the source code & registered in dependencies -> (should be removed from dependencies)
// UnusedDev -> Unused in tests & registered in devDependencies -> (should be removed from devDependencies)

// Missing: -> Used in source code (& tests -> Both Type || Source Type) , but not registered in dependencies or devDependencies -> (should be added to dependencies)
// MissingDev: -> Used in tests (Test Type), but not registered in devDependencies -> (should be added to devDependencies)

// MissingException: Registered as exception, but not registered in dependencies
// MissingDevException: Registered as exception, but not registered in devDependencies

// VALID CASES:
// Used -> Used in source code & tests and registered in dependencies
// UsedDev -> Used in tests and registered in devDependencies
// Exceptions: Not used in code (Unused type), but required for build or other purposes

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
	// Should we filter out source only
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

testDevDependencies = (packageJson, dependencies, usedDependencies) => {
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
