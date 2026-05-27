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
import { parse } from "envfile";
import { existsSync, readFileSync } from "fs";
import Joi from "joi";
import { ensureError } from "@mainsail/utils";

@injectable()
export class Command extends Commands.Command {
	public signature = "db:reset";

	public description = "Reset the API database.";

	@postConstruct()
	public configure(): void {
		this.definition.setFlag("force", "Force reset of database without confirmation.", Joi.boolean());
	}

	public async execute(): Promise<void> {
		const environmentFile: string = this.app.getCorePath("config", ".env");

		if (!existsSync(environmentFile)) {
			this.components.fatal(`No environment file found at ${environmentFile}.`);
		}

		this.app.rebind(Identifiers.Services.Log.Service).to(Services.Log.NullLogger);

		const environment: object = parse(readFileSync(environmentFile).toString("utf8"));

		const config = {
			applicationName: "mainsail/api",
			database: this.#fromEnv(environment, EnvironmentVariables.MAINSAIL_DB_DATABASE),
			dropSchema: true,
			entityPrefix: "public.",
			host: this.#fromEnv(environment, EnvironmentVariables.MAINSAIL_DB_HOST),
			logger: "simple-console",
			logging: false,
			password: this.#fromEnv(environment, EnvironmentVariables.MAINSAIL_DB_PASSWORD),
			port: Number.parseInt(this.#fromEnv(environment, EnvironmentVariables.MAINSAIL_DB_PORT)),
			type: "postgres",
			username: this.#fromEnv(environment, EnvironmentVariables.MAINSAIL_DB_USERNAME),
		};

		if (!this.hasFlag("force")) {
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

							await client.query(
								`
			SELECT pg_terminate_backend(pid)
			FROM pg_stat_activity
			WHERE datname = $1 AND pid <> pg_backend_pid();
		  `,
								[config.database],
							);
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

	#fromEnv(environment: object, key: string): string {
		if (!environment[key]) {
			this.components.fatal(`The "${key}" doesn't exist.`);
		}

		return environment[key];
	}
}
