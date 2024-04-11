const depcheck = require("depcheck");
const { resolve, join } = require("path");
const { readdirSync, lstatSync } = require("fs");

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
		dependencies: ["@mainsail/logger-pino", "@mainsail/api-database", "@mainsail/api-http"],
		devDependencies: [],
	},
	"@mainsail/configuration-generator": {
		dependencies: [
			"@mainsail/crypto-key-pair-ecdsa",
			"@mainsail/crypto-key-pair-schnorr",
			"@mainsail/crypto-signature-schnorr-secp256k1",
		],
		devDependencies: [],
	},
	"@mainsail/core": {
		dependencies: [
			"@mainsail/api-common",
			"@mainsail/api-database",
			"@mainsail/api-development",
			"@mainsail/api-http",
			"@mainsail/api-sync",
			"@mainsail/api-transaction-pool",
			"@mainsail/bootstrap",
			"@mainsail/consensus",
			"@mainsail/consensus-storage",
			"@mainsail/crypto-address-base58",
			"@mainsail/crypto-address-bech32m",
			"@mainsail/crypto-address-keccak256",
			"@mainsail/crypto-address-ss58",
			"@mainsail/crypto-block",
			"@mainsail/crypto-commit",
			"@mainsail/crypto-config",
			"@mainsail/crypto-consensus-bls12-381",
			"@mainsail/crypto-hash-bcrypto",
			"@mainsail/crypto-hash-noble",
			"@mainsail/crypto-hash-wasm",
			"@mainsail/crypto-key-pair-bls12-381",
			"@mainsail/crypto-key-pair-ecdsa",
			"@mainsail/crypto-key-pair-ed25519",
			"@mainsail/crypto-key-pair-schnorr",
			"@mainsail/crypto-messages",
			"@mainsail/crypto-signature-schnorr",
			"@mainsail/crypto-signature-schnorr-secp256k1",
			"@mainsail/crypto-transaction",
			"@mainsail/crypto-transaction-multi-payment",
			"@mainsail/crypto-transaction-multi-signature-registration",
			"@mainsail/crypto-transaction-transfer",
			"@mainsail/crypto-transaction-username-registration",
			"@mainsail/crypto-transaction-username-resignation",
			"@mainsail/crypto-transaction-validator-registration",
			"@mainsail/crypto-transaction-validator-resignation",
			"@mainsail/crypto-transaction-vote",
			"@mainsail/crypto-validation",
			"@mainsail/crypto-wif",
			"@mainsail/crypto-worker",
			"@mainsail/database",
			"@mainsail/fees",
			"@mainsail/fees-static",
			"@mainsail/logger-pino",
			"@mainsail/networking-dns",
			"@mainsail/networking-ntp",
			"@mainsail/p2p",
			"@mainsail/processor",
			"@mainsail/proposer",
			"@mainsail/serializer",
			"@mainsail/state",
			"@mainsail/transaction-pool",
			"@mainsail/transactions",
			"@mainsail/validation",
			"@mainsail/validator",
			"@mainsail/validator-set-static",
			"@mainsail/validator-set-vote-weighted",
			"@mainsail/webhooks",
			"@mainsail/crypto-transaction-evm-call",
			"@mainsail/evm",
			"@mainsail/evm-development",
			"@mainsail/api-evm",
		],
		devDependencies: [],
	},
};

class Package {
	constructor(packageJson, imports) {
		this.name = packageJson.name;
		this.dependencies = packageJson.dependencies ? Object.keys(packageJson.dependencies) : [];
		this.devDependencies = packageJson.devDependencies
			? Object.keys(packageJson.devDependencies).filter((x) => !x.startsWith("@types/"))
			: [];
		this.imports = imports;

		this.exceptions = this.findExceptions();
		this.devExceptions = this.findDevExceptions();

		const result = this.getResult();
		this.used = result.used;
		this.unused = result.unused;
		this.missing = result.missing;

		const devResult = this.getDevResult();
		this.devUsed = devResult.used;
		this.devUnused = devResult.unused;
		this.devMissing = devResult.missing;
	}

	pass() {
		return (
			this.unused.length === 0 &&
			this.missing.length === 0 &&
			this.devUnused.length === 0 &&
			this.devMissing.length === 0
		);
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

		const importNames = this.imports.filter((dep) => !dep.testOnly).map((dep) => dep.name);
		const combined = new Set([...importNames, ...this.dependencies]);

		for (const dep of combined.values()) {
			if (importNames.includes(dep) && this.dependencies.includes(dep)) {
				used.push(dep);
				continue;
			}

			if (importNames.includes(dep)) {
				missing.push(dep);
			} else if (!this.exceptions.includes(dep)) {
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

		const importNames = this.imports.filter((dep) => dep.testOnly).map((dep) => dep.name);
		const combined = new Set([...importNames, ...this.devDependencies]);

		for (const dep of combined.values()) {
			if (importNames.includes(dep) && this.devDependencies.includes(dep)) {
				used.push(dep);
				continue;
			}

			if (importNames.includes(dep)) {
				missing.push(dep);
			} else if (!this.devExceptions.includes(dep)) {
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

class Import {
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

	const pkgs = readdirSync(source)
		.filter((name) => lstatSync(`${source}/${name}`).isDirectory())
		.sort();

	let pass = true;

	for (const pkg of pkgs) {
		const packageJson = require(join(source, pkg, "package.json"));

		await depcheck(
			join(source, pkg),
			{
				ignoreDirs: ["node_modules", "distribution"],
				ignoreMatches: ["@types/*"],
			},
			(result) => {
				const imports = Object.keys(result.using).map((name) => new Import(name, result.using[name]));
				const package = new Package(packageJson, imports);

				if (!package.pass()) {
					pass = false;
					console.log("Package: ", package.name);

					const { missing, unused, devMissing, devUnused } = package;

					console.log({
						missing,
						unused,
						devMissing,
						devUnused,
					});
				}

				// console.log("Used: ", package.used);
				// console.log("Missing: ", package.missing);
				// console.log("Unused: ", package.unused);
				// console.log("Exceptions: ", package.exceptions);

				// console.log("DevUsed: ", package.devUsed);
				// console.log("DevMissing: ", package.devMissing);
				// console.log("DevUnused: ", package.devUnused);
				// console.log("DevExceptions: ", package.devExceptions);
			},
		);
	}

	if (!pass) {
		process.exit(1);
	}
};

main();
