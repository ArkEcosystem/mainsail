import envPaths from "env-paths";
import path from "path";
import { Identifiers as AppIdentifiers } from "@mainsail/contracts";
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
		premine: "125000000000000000000000000",
		chainId: 10000,
		validators: 5,
		initialHeight: 0,
		mockFakeValidatorBlsKeys: true,
		snapshot: {
			path: "../../snapshot-9ad6cc2a48daa4dfb1eeb267b7785b19345bbab865051d420ad121fd966266e4.json",
		},
	});

	for (const tag of ["evm", "validator", "transaction-pool", "rpc"]) {
		if (app.isBoundTagged(AppIdentifiers.Evm.Instance, "instance", tag)) {
			await app.getTagged(AppIdentifiers.Evm.Instance, "instance", tag).dispose();
		}
	}
}

run();
