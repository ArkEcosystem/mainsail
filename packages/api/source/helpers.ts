import { Pg } from "@mainsail/api-database";

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
