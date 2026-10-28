import envPaths from "env-paths";
import path from "path";
import { Identifiers as AppIdentifiers } from "@mainsail/constants";
import { makeApplication } from "../distribution/application-factory.js";
import { Identifiers } from "../distribution/identifiers.js";

async function run() {
	const paths = envPaths("mainsail", { suffix: "" });
	const configCore = path.join(paths.config, "core");
	console.log(paths, configCore);

	// The EVM is built once with the chain id from this config; it must match the one
	// passed to generate(), otherwise the BLS proof-of-possession is rejected on-chain.
	const chainId = 11812;
	const app = await makeApplication(configCore, { chainId });
	const generator = app.get(Identifiers.ConfigurationGenerator);

	// Same shape as the generated validators.json: { "secrets": ["<mnemonic>", ...] }
	const validatorMnemonics = [
  	]
	await generator.generate({
		network: "devnet",
		symbol: "TѦ",
		token: "ARK",
		premine: "125000000000000000000000000",
		chainId,
		initialBlockNumber: 0,
		snapshot: {
			path: "./85d2e8564b7a7489cd3256216949275d9ed9b3aa58547213315a4b9e82173f5c.compressed",
		},
		validatorMnemonics,
		validators: validatorMnemonics.length,
	});

	for (const tag of ["evm", "validator", "transaction-pool", "rpc"]) {
		if (app.isBoundTagged(AppIdentifiers.Evm.Instance, "instance", tag)) {
			await app.getTagged(AppIdentifiers.Evm.Instance, "instance", tag).dispose();
		}
	}
}

run();
