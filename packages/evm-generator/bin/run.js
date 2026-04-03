import envPaths from "env-paths";
import path from "path";
import { makeApplication } from "../distribution/application-factory.js";
import { Identifiers } from "../distribution/identifiers.js";

async function run() {
	const paths = envPaths("mainsail", { suffix: "" });
	const configCore = path.join(paths.config, "core");

	const app = await makeApplication(configCore, {});
	const generator = app.get(Identifiers.Generator);

	await generator.generate({});
}

run();
