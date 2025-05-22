import envPaths from "env-paths";
import path from "path";
import { Identifiers as AppIdentifiers } from "@mainsail/contracts";
import { makeApplication } from "../distribution/application-factory.js";
import { Identifiers } from "../distribution/identifiers.js";
import { fileURLToPath } from "url";
import { copyFileSync } from "fs";
import { readJSONSync, writeJSONSync } from "fs-extra/esm";

const configurations = [
	//
	// Functional Tests
	// tests/functional/transaction-pool-api/paths/config/
	{
		network: "devnet",
		symbol: "TѦ",
		token: "ARK",
		distribute: true,
		premine: "125000000000000000000000000",
		chainId: 10000,
		validators: 53,
		initialHeight: 0,
		overwriteConfig: true,
		timeouts: {
			blockPrepareTime: 100,
			blockTime: 100,
			stageTimeout: 100,
			stageTimeoutIncrease: 100,
			tolerance: 100,
		},
		postGenerate: (location) => {
			// Functional tests run on single node
			const __dirname = path.dirname(fileURLToPath(import.meta.url));

			for (const file of ["crypto.json", "validators.json", "genesis-wallet.json"]) {
				const source = path.join(location, file);
				const target = path.join(
					__dirname,
					"..",
					"..",
					"..",
					"tests",
					"functional",
					"transaction-pool-api",
					"paths",
					"config",
					file,
				);
				copyFileSync(source, target);
			}
		},
	},

	// E2E Consensus
	// tests/e2e/consensus
	{
		network: "devnet",
		symbol: "TѦ",
		token: "ARK",
		distribute: true,
		premine: "125000000000000000000000000",
		chainId: 10000,
		validators: 5,
		initialHeight: 0,
		overwriteConfig: true,
		timeouts: {
			blockPrepareTime: 500,
			blockTime: 500,
			stageTimeout: 500,
			stageTimeoutIncrease: 500,
			tolerance: 100,
		},
		postGenerate: (location) => {
			// E2E tests run multiple nodes (1 validator per node)
			const __dirname = path.dirname(fileURLToPath(import.meta.url));

			// E2E Clients
			for (const file of ["crypto.json", "validators.json"]) {
				const source = path.join(location, file);
				const target = path.join(
					__dirname,
					"..",
					"..",
					"..",
					"tests",
					"e2e",
					"clients",
					"config",
					"core",
					file,
				);
				copyFileSync(source, target);
			}

			// E2E Consensus

			// Validator Node0 - Node4
			for (let i = 0; i < 5; i++) {
				const validators = readJSONSync(path.join(location, "validators.json"));
				validators.secrets = [validators.secrets[i]];

				const targetPath = path.join(
					__dirname,
					"..",
					"..",
					"..",
					"tests",
					"e2e",
					"consensus",
					"nodes",
					`node${i}`,
					"core",
				);
				writeJSONSync(path.join(targetPath, "validators.json"), validators, {
					spaces: 4,
				});

				copyFileSync(path.join(location, "crypto.json"), path.join(targetPath, "crypto.json"));
			}

			// Api Node
			for (const file of ["crypto.json"]) {
				const source = path.join(location, file);
				const target = path.join(
					__dirname,
					"..",
					"..",
					"..",
					"tests",
					"e2e",
					"consensus",
					"nodes",
					`api-node`,
					"core",
					file,
				);
				copyFileSync(source, target);
			}
		},
	},

	// E2E Snapshot
	// tests/e2e/snapshot
	{
		network: "devnet",
		symbol: "TѦ",
		token: "ARK",
		distribute: true,
		premine: "125000000000000000000000000",
		chainId: 10000,
		initialHeight: 0,
		validators: 5,
		overwriteConfig: true,
		mockFakeValidatorBlsKeys: true,
		timeouts: {
			blockPrepareTime: 500,
			blockTime: 500,
			stageTimeout: 500,
			stageTimeoutIncrease: 500,
			tolerance: 100,
		},
		snapshot: {
			// reuse existing snapshot to build new genesis block
			// also see commit: 718b4cf2f1b49df9b80e6474be06fa97acc80d44
			path: "../../tests/e2e/snapshot/nodes/node0/core/snapshot/f11b12e6d3a7524482deaacf745d5411d476ae39beeb7ce5141bfeee912cd08d.compressed",
		},
		postGenerate: (location) => {
			// E2E tests run multiple nodes (1 validator per node)
			const __dirname = path.dirname(fileURLToPath(import.meta.url));

			// Validator Node0 - Node4 (only needs updated crypto.json)
			for (let i = 0; i < 5; i++) {
				const source = path.join(location, "crypto.json");
				const target = path.join(
					__dirname,
					"..",
					"..",
					"..",
					"tests",
					"e2e",
					"snapshot",
					"nodes",
					`node${i}`,
					"core",
					"crypto.json",
				);
				copyFileSync(source, target);
			}
		},
	},
];

async function run() {
	const paths = envPaths("mainsail", { suffix: "" });
	const configCore = path.join(paths.config, "core");
	console.log(paths, configCore);

	for (const configuration of configurations) {
		await generateConfiguration(configCore, configuration);
	}
}

const generateConfiguration = async (path, configuration) => {
	const app = await makeApplication(path, {});
	const generator = app.get(Identifiers.ConfigurationGenerator);

	await generator.generate(configuration);

	if (configuration.postGenerate) {
		configuration.postGenerate(generator.configurationPath);
	}

	for (const tag of ["evm", "validator", "transaction-pool", "rpc"]) {
		if (app.isBoundTagged(AppIdentifiers.Evm.Instance, "instance", tag)) {
			await app.getTagged(AppIdentifiers.Evm.Instance, "instance", tag).dispose();
		}
	}
};

run();
