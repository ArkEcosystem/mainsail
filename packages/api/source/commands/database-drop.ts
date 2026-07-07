import { Pg } from "@mainsail/api-database";
import { Commands } from "@mainsail/cli";
import { EnvironmentVariables } from "@mainsail/constants";
import { injectable, postConstruct } from "@mainsail/container";
import { ensureError } from "@mainsail/utils";
import { parse } from "envfile";
import { existsSync, readFileSync } from "fs";
import Joi from "joi";

import { requireEnvironmentVariable, terminateActiveSessions } from "../helpers.js";

@injectable()
export class Command extends Commands.Command {
	public signature = "db:drop";

	public description = "Drop the API database.";

	@postConstruct()
	public configure(): void {
		this.definition.setFlag("force", "Force drop of database without confirmation.", Joi.boolean());
		this.definition.setFlag("init", "Initialize empty database after drop.", Joi.boolean());
	}

	public async execute(): Promise<void> {
		const environmentFile: string = this.app.getCorePath("config", ".env");

		if (!existsSync(environmentFile)) {
			this.components.fatal(`No environment file found at ${environmentFile}.`);
		}

		const environment: object = parse(readFileSync(environmentFile).toString("utf8"));

		const databaseName = requireEnvironmentVariable(
			this.components,
			environment,
			EnvironmentVariables.MAINSAIL_DB_DATABASE,
		);
		const user = requireEnvironmentVariable(
			this.components,
			environment,
			EnvironmentVariables.MAINSAIL_DB_USERNAME,
		);

		const config = {
			database: "postgres",
			host: requireEnvironmentVariable(this.components, environment, EnvironmentVariables.MAINSAIL_DB_HOST),
			password: requireEnvironmentVariable(
				this.components,
				environment,
				EnvironmentVariables.MAINSAIL_DB_PASSWORD,
			),
			port: Number.parseInt(
				requireEnvironmentVariable(this.components, environment, EnvironmentVariables.MAINSAIL_DB_PORT),
			),
			user,
		};

		if (!this.hasFlag("force")) {
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
					skip: () => !this.hasFlag("init"),
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
