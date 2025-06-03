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
		network: "devnet",
		symbol: "TѦ",
		token: "ARK",
		distribute: true,
		premine: "125000000000000000000000000",
		chainId: 10000,
		initialHeight: 0,
		// snapshot: {
		// 	path: "../../f07a7068c50e2e5591beaa572070933008744425d727c792d328d1d5e2fac306.compressed",
		// },
	});

	for (const tag of ["evm", "validator", "transaction-pool", "rpc"]) {
		if (app.isBoundTagged(AppIdentifiers.Evm.Instance, "instance", tag)) {
			await app.getTagged(AppIdentifiers.Evm.Instance, "instance", tag).dispose();
		}
	}
}

run();
