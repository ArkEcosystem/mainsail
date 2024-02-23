const depcheck = require("depcheck");
const { resolve, join } = require("path");

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

const EXCEPTIONS = {
	"@mainsail/api": {
		dependencies: [],
		devDependencies: [],
	},
};

class Package {
	constructor(packageJson, codeDependencies) {
		this.name = packageJson.name;
		this.dependencies = Object.keys(packageJson.dependencies);
		this.devDependencies = Object.keys(packageJson.devDependencies).filter((x) => !x.startsWith("@types/"));
		this.codeDependencies = codeDependencies;

		this.exceptions = this.findExceptions();
		this.devExceptions = this.findExceptions();

		const result = this.getResult();
		this.used = result.used;
		this.unused = result.unused;
		this.missing = result.missing;

		const devResult = this.getDevResult();
		this.devUsed = devResult.used;
		this.devUnused = devResult.unused;
		this.devMissing = devResult.missing;
	}

	findExceptions() {
		const exception = EXCEPTIONS[this.name];
		return exception ? exception.dependencies : [];
	}

	findDevExceptions() {
		const exception = EXCEPTIONS[this.name];
		return exception ? exception.devDependencies : [];
	}

	getResult() {
		const used = [];
		const unused = [];
		const missing = [];

		const codeDepNames = this.codeDependencies.filter((dep) => !dep.testOnly).map((dep) => dep.name);
		const combined = new Set([...codeDepNames, ...this.dependencies]);

		for (const dep of combined.values()) {
			if (codeDepNames.includes(dep) && this.dependencies.includes(dep)) {
				used.push(dep);
				continue;
			}

			if (codeDepNames.includes(dep)) {
				missing.push(dep);
			} else {
				unused.push(dep);
			}
		}

		return {
			used,
			unused,
			missing,
		};
	}

	getDevResult() {
		const used = [];
		const unused = [];
		const missing = [];

		const codeDepNames = this.codeDependencies.filter((dep) => dep.testOnly).map((dep) => dep.name);
		const combined = new Set([...codeDepNames, ...this.devDependencies]);

		for (const dep of combined.values()) {
			if (codeDepNames.includes(dep) && this.devDependencies.includes(dep)) {
				used.push(dep);
				continue;
			}

			if (codeDepNames.includes(dep)) {
				missing.push(dep);
			} else {
				unused.push(dep);
			}
		}

		return {
			used,
			unused,
			missing,
		};
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

const main = async () => {
	const source = resolve(__dirname, "../../packages");

	// const pkgs = readdirSync(source)
	// 	.filter((name) => lstatSync(`${source}/${name}`).isDirectory())
	// 	.sort();
	const pkgs = ["api"];

	for (const pkg of pkgs) {
		const packageJson = require(join(source, pkg, "package.json"));

		await depcheck(
			join(source, pkg),
			{
				ignoreDirs: ["node_modules", "distribution"],
				ignoreMatches: ["@types/*"],
			},
			(result) => {
				const dependencies = Object.keys(result.using).map((name) => new Dependency(name, result.using[name]));
				const package = new Package(packageJson, dependencies);

				console.log("Used: ", package.used);
				console.log("Missing: ", package.missing);
				console.log("Unused: ", package.unused);
				console.log("Exceptions: ", package.exceptions);

				console.log("DevUsed: ", package.devUsed);
				console.log("DevMissing: ", package.devMissing);
				console.log("DevUnused: ", package.devUnused);
				console.log("DevExceptions: ", package.devExceptions);
			},
		);
	}
};

main();
