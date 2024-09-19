import envPaths from "env-paths";
import path from "path";
import { makeApplication } from "../distribution/application-factory.js";
import { Identifiers } from "../distribution/identifiers.js";

async function run() {
	const paths = envPaths("mainsail", { suffix: "" });
	const configCore = path.join(paths.config, "core");
	console.log(paths, configCore);

	const app = await makeApplication(configCore, {});
	const generator = app.get(Identifiers.ConfigurationGenerator);

	await generator.generate({
		network: "testnet",
		symbol: "TѦ",
		token: "ARK",
		distribute: true,
	});
}

run();
