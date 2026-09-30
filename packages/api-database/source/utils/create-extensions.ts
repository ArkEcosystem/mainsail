import type { DataSource } from "typeorm";

// Postgres implements `CREATE EXTENSION IF NOT EXISTS` as a non-atomic check-then-insert,
// so two processes bootstrapping the same database (e.g. a node with api-sync and the
// standalone API server) can both pass the check and the loser fails with a duplicate-key
// violation on `pg_extension_name_index`. The extension is installed either way, so those
// two error codes are safe to swallow.
const CONCURRENT_CREATION_CODES = new Set([
	"23505", // unique_violation
	"42710", // duplicate_object
]);

export const createExtensions = async (dataSource: DataSource, extensions = ["citext", "pg_trgm"]): Promise<void> => {
	for (const extension of extensions) {
		try {
			await dataSource.query(`CREATE EXTENSION IF NOT EXISTS ${extension};`);
		} catch (error) {
			const { code, driverError } = error as { code?: string; driverError?: { code?: string } };

			if (!CONCURRENT_CREATION_CODES.has(code ?? driverError?.code ?? "")) {
				throw error;
			}
		}
	}
};
