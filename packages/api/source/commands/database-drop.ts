import { Pg } from "@mainsail/api-database";
import { Commands } from "@mainsail/cli";
import { EnvironmentVariables } from "@mainsail/constants";
import { injectable, postConstruct } from "@mainsail/container";
import { ensureError } from "@mainsail/utils";
import Joi from "joi";

import { loadEnvironmentFile, requireEnvironmentVariable, terminateActiveSessions } from "../helpers.js";

@injectable()
export class Command extends Commands.Command {
	public signature = "db:drop";

	public description = "Drop the API database.";

	@postConstruct()
	public configure(): void {
		this.definition.setFlag(
			"force",
			"Force drop of database without confirmation.",
			Joi.boolean().default(false),
		);
		this.definition.setFlag("init", "Initialize empty database after drop.", Joi.boolean().default(false));
	}

	public async execute(): Promise<void> {
		const environment = loadEnvironmentFile(this.app, this.components);

		const fromEnvironment = (key: string): string => requireEnvironmentVariable(this.components, environment, key);

		const databaseName = fromEnvironment(EnvironmentVariables.MAINSAIL_DB_DATABASE);
		const user = fromEnvironment(EnvironmentVariables.MAINSAIL_DB_USERNAME);

		const config = {
			database: "postgres",
			host: fromEnvironment(EnvironmentVariables.MAINSAIL_DB_HOST),
			password: fromEnvironment(EnvironmentVariables.MAINSAIL_DB_PASSWORD),
			port: Number.parseInt(fromEnvironment(EnvironmentVariables.MAINSAIL_DB_PORT)),
			user,
		};

		if (!this.getFlag<boolean>("force")) {
			if (
				!(await this.components.confirm(
					`⚠️  You are about to DROP the database "${databaseName}". All data will be LOST. Continue?`,
				))
			) {
				this.components.log("Aborting. Database was not dropped.");
				return;
			}
		}

		await this.#performTasks(databaseName, config);
	}

	async #performTasks(databaseName: string, config: Pg.ClientConfig): Promise<void> {
		const client = new Pg.Client(config);

		const { user } = config;

		try {
			await client.connect();

			await this.components.taskList([
				{
					task: async () => {
						await terminateActiveSessions(client, databaseName);
					},
					title: "Terminate active sessions",
				},
				{
					task: async () => {
						await client.query(`DROP DATABASE IF EXISTS "${databaseName}"`);
					},
					title: `Drop database "${databaseName}"`,
				},
				{
					skip: () => !this.getFlag<boolean>("init"),
					task: async () => {
						await client.query(`CREATE DATABASE "${databaseName}" WITH OWNER "${user}"`);
					},
					title: `Create empty database "${databaseName}" with owner "${user}"`,
				},
			]);
		} catch (rawError) {
			const error = ensureError(rawError);
			this.components.fatal(error.message);
		} finally {
			await client.end();
		}
	}
}
