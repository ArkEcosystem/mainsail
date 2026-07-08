import type { Pg } from "@mainsail/api-database";

import { parse } from "envfile";
import { existsSync, readFileSync } from "fs";

export const loadEnvironmentFile = (
	app: { getCorePath(type: string, file: string): string },
	components: { fatal(message: string): void },
): object => {
	const environmentFile: string = app.getCorePath("config", ".env");

	if (!existsSync(environmentFile)) {
		components.fatal(`No environment file found at ${environmentFile}.`);
	}

	return parse(readFileSync(environmentFile).toString("utf8"));
};

export const requireEnvironmentVariable = (
	components: { fatal(message: string): void },
	environment: object,
	key: string,
): string => {
	if (!environment[key]) {
		components.fatal(`The "${key}" doesn't exist.`);
	}

	return environment[key];
};

export const terminateActiveSessions = async (client: Pg.Client, databaseName: string): Promise<void> => {
	await client.query(
		`
    SELECT pg_terminate_backend(pid)
    FROM pg_stat_activity
    WHERE datname = $1 AND pid <> pg_backend_pid();
  `,
		[databaseName],
	);
};
