const envPaths = require("env-paths");
const { join } = require("path");
const { makeApplication } = require("../distribution/application-factory");
const { Identifiers } = require("../distribution/identifiers");

async function run() {
	const paths = envPaths("ark-test", { suffix: "core" });
	const configCore = join(paths.config, "testnet");
	console.log(paths, configCore);

	const app = await makeApplication(configCore);
	const generator = app.get(Identifiers.ConfigurationGenerator);

	await generator.generate({
		network: "testnet",
		symbol: "TѦ",
		token: "ARK",
	});
}

run();
