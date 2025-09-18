// eslint-disable-next-line unicorn/prevent-abbreviations
import { Commands } from "@mainsail/cli";
import { injectable, postConstruct } from "@mainsail/container";
import { Pg } from "@mainsail/api-database";
import { parse } from "envfile";
import { existsSync, readFileSync } from "fs";
import Joi from "joi";

// Recreate database
// source ~/.config/mainsail/api/.env
// sudo -i -u postgres psql -c "DROP DATABASE $MAINSAIL_DB_DATABASE;"
// sudo -i -u postgres psql -c "CREATE DATABASE $MAINSAIL_DB_DATABASE WITH OWNER $MAINSAIL_DB_USERNAME;"

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

		const databaseName = this.#fromEnv(environment, "MAINSAIL_DB_DATABASE");
		const user = this.#fromEnv(environment, "MAINSAIL_DB_USERNAME");

		const config = {
			user,
			database: "postgres",
			host: this.#fromEnv(environment, "MAINSAIL_DB_HOST"),
			password: this.#fromEnv(environment, "MAINSAIL_DB_PASSWORD"),
			port: parseInt(this.#fromEnv(environment, "MAINSAIL_DB_PORT")),
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
						await client.query(
							`
    SELECT pg_terminate_backend(pid)
    FROM pg_stat_activity
    WHERE datname = $1 AND pid <> pg_backend_pid();
  `,
							[databaseName],
						);
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
					task: async () => {
						await client.query(`CREATE DATABASE "${databaseName}" WITH OWNER "${user}"`);
					},
					title: `Create empty database "${databaseName}" with owner "${user}"`,
					skip: () => !this.hasFlag("init"),
				},
			]);
		} catch (ex) {
			this.components.fatal(ex.message);
		} finally {
			await client.end();
		}
	}

	#fromEnv(environment: object, key: string): string {
		if (!environment[key]) {
			this.components.fatal(`The "${key}" doesn't exist.`);
		}

		return environment[key];
	}
}
