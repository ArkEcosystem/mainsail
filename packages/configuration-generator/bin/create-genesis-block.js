import envPaths from "env-paths";
import path from "path";
import { makeApplication } from "../distribution/application-factory.js";
import { Identifiers } from "../distribution/identifiers.js";

async function run() {
	const paths = envPaths("mainsail", { suffix: "" });
	const configCore = path.join(paths.config, "core");
	console.log(paths, configCore);

	const flags = {
		address: "keccak256",
		keccak256: true,
	};

	// const flags = {
	// 	address: "bech32m",
	// 	bech32mPrefix: "ark",
	// };

	// const flags = {
	// 	address: "base58",
	// 	base58Prefix: 30,
	// }

	const app = await makeApplication(configCore, flags);
	const generator = app.get(Identifiers.ConfigurationGenerator);

	await generator.generate({
		network: "testnet",
		symbol: "TѦ",
		token: "ARK",
		distribute: true,
		address: {
			...(flags.bech32mPrefix ? { bech32m: flags.bech32mPrefix } : {}),
			...(flags.base58Prefix ? { base58: flags.base58Prefix } : {}),
			...(flags.keccak256 ? { keccak256: flags.keccak256 } : {}),
		},
	});
}

run();
