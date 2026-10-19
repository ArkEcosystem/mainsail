import {
	Contracts as ApiDatabaseContracts,
	Identifiers as ApiDatabaseIdentifiers,
	Pg,
	ServiceProvider,
	TypeOrm,
} from "@mainsail/api-database";
import { Commands } from "@mainsail/cli";
import { EnvironmentVariables, Identifiers } from "@mainsail/constants";
import { injectable, postConstruct } from "@mainsail/container";
import { Providers, Services } from "@mainsail/kernel";
import { ensureError } from "@mainsail/utils";
import Joi from "joi";

import { loadEnvironmentFile, requireEnvironmentVariable, terminateActiveSessions } from "../helpers.js";

@injectable()
export class Command extends Commands.Command {
	public signature = "db:reset";

	public description = "Reset the API database.";

	@postConstruct()
	public configure(): void {
		this.definition.setFlag("force", "Force reset of database without confirmation.", Joi.boolean().default(false));
	}

	public async execute(): Promise<void> {
		const environment = loadEnvironmentFile(this.app, this.components);

		this.app.rebind(Identifiers.Services.Log.Service).to(Services.Log.NullLogger);

		const fromEnvironment = (key: string): string => requireEnvironmentVariable(this.components, environment, key);

		const config = {
			applicationName: "mainsail/api",
			database: fromEnvironment(EnvironmentVariables.MAINSAIL_DB_DATABASE),
			dropSchema: true,
			entityPrefix: "public.",
			host: fromEnvironment(EnvironmentVariables.MAINSAIL_DB_HOST),
			logger: "simple-console",
			logging: false,
			password: fromEnvironment(EnvironmentVariables.MAINSAIL_DB_PASSWORD),
			port: Number.parseInt(fromEnvironment(EnvironmentVariables.MAINSAIL_DB_PORT)),
			type: "postgres",
			username: fromEnvironment(EnvironmentVariables.MAINSAIL_DB_USERNAME),
		};

		if (!this.getFlag<boolean>("force")) {
			if (
				!(await this.components.confirm(
					`⚠️  You are about to RESET the database "${config.database}". All data will be LOST. Continue?`,
				))
			) {
				this.components.log("Aborting. Database was not reset.");
				return;
			}
		}

		await this.#performTasks(config);
	}

	async #performTasks(config: Record<string, unknown>): Promise<void> {
		const database = this.app.resolve(ServiceProvider);
		database.setConfig({
			getRequired: (property: string) =>
				({
					database: config,
					enabled: true,
				})[property],
		} as Providers.PluginConfiguration);

		try {
			await this.components.taskList([
				{
					task: async () => {
						const client = new Pg.Client({ ...config, user: config.username as string });
						try {
							await client.connect();

							await terminateActiveSessions(client, config.database as string);
						} finally {
							await client.end();
						}
					},
					title: "Terminating active sessions...",
				},
				{
					task: async () => {
						await database.register();
					},
					title: `Initializing new session...`,
				},
				{
					task: async () => {
						const dataSource = this.app.get<TypeOrm.DataSource>(ApiDatabaseIdentifiers.DataSource);
						await dataSource.synchronize(true);
					},
					title: `Resynchronizing "${config.database}"...`,
				},
				{
					task: async () => {
						const migrations = this.app.get<ApiDatabaseContracts.Migrations>(
							ApiDatabaseIdentifiers.Migrations,
						);
						await migrations.runMigrations();
					},
					title: `Running migrations...`,
				},
			]);
		} catch (rawError) {
			const error = ensureError(rawError);
			this.components.fatal(error.message);
		} finally {
			await database.dispose();
		}
	}
}
