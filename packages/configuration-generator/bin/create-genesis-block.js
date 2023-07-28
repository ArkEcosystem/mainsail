const envPaths = require("env-paths");
const { join } = require("path");
const { makeApplication } = require("../distribution/application-factory");
const { Identifiers } = require("../distribution/identifiers");

async function run() {
	const paths = envPaths("ark-test", { suffix: "core" });
	const configCore = join(paths.config, "testnet");
	console.log(paths, configCore);

	const flags = {
		address: "bech32m",
		bech32mPrefix: "ark",
	};

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
		address: {
			...(flags.bech32mPrefix ? { bech32m: flags.bech32mPrefix } : {}),
			...(flags.base58Prefix ? { base58: flags.base58Prefix } : {}),
		},
	});
}

run();
