import envPaths from "env-paths";
import path from "path";
import { makeApplication } from "../distribution/application-factory.js";
import { Identifiers } from "../distribution/identifiers.js";

process.env.MAINSAIL_DB_HOST = "localhost";
process.env.MAINSAIL_DB_PORT = "5432";
process.env.MAINSAIL_DB_DATABASE = "test_db";
process.env.MAINSAIL_DB_USERNAME = "test_db";
process.env.MAINSAIL_DB_PASSWORD = "password";

async function run() {
	const paths = envPaths("mainsail", { suffix: "" });
	const configCore = path.join(paths.config, "core");

	const app = await makeApplication(configCore, {});
	const generator = app.get(Identifiers.Snapshot.Generator);

	await generator.generate({});
}

run();
