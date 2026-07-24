import { describe } from "@mainsail/test-runner";

import { createExtensions } from "./create-extensions";

const makeError = (properties: Record<string, unknown>): Error => Object.assign(new Error("query failed"), properties);

describe<{
	queries: string[];
}>("createExtensions", ({ it, beforeEach, assert }) => {
	beforeEach((context) => {
		context.queries = [];
	});

	const makeDataSource = (queries: string[], failWith?: (sql: string) => Error | undefined) =>
		({
			query: async (sql: string) => {
				queries.push(sql);

				const error = failWith?.(sql);
				if (error) {
					throw error;
				}
			},
		}) as any;

	it("should create all default extensions", async ({ queries }) => {
		await createExtensions(makeDataSource(queries));

		assert.equal(queries, ["CREATE EXTENSION IF NOT EXISTS citext;", "CREATE EXTENSION IF NOT EXISTS pg_trgm;"]);
	});

	it("should create custom extensions", async ({ queries }) => {
		await createExtensions(makeDataSource(queries), ["uuid-ossp"]);

		assert.equal(queries, ["CREATE EXTENSION IF NOT EXISTS uuid-ossp;"]);
	});

	it("should ignore a unique violation from a concurrent creation and continue", async ({ queries }) => {
		await createExtensions(
			makeDataSource(queries, (sql) => (sql.includes("citext") ? makeError({ code: "23505" }) : undefined)),
		);

		assert.equal(queries, ["CREATE EXTENSION IF NOT EXISTS citext;", "CREATE EXTENSION IF NOT EXISTS pg_trgm;"]);
	});

	it("should ignore a duplicate object error", async ({ queries }) => {
		await createExtensions(makeDataSource(queries, () => makeError({ code: "42710" })));

		assert.equal(queries, ["CREATE EXTENSION IF NOT EXISTS citext;", "CREATE EXTENSION IF NOT EXISTS pg_trgm;"]);
	});

	it("should read the code from the wrapped driver error", async ({ queries }) => {
		await createExtensions(makeDataSource(queries, () => makeError({ driverError: { code: "23505" } })));

		assert.equal(queries, ["CREATE EXTENSION IF NOT EXISTS citext;", "CREATE EXTENSION IF NOT EXISTS pg_trgm;"]);
	});

	it("should rethrow any other error", async ({ queries }) => {
		await assert.rejects(
			() => createExtensions(makeDataSource(queries, () => makeError({ code: "42501" }))),
			"query failed",
		);

		assert.equal(queries, ["CREATE EXTENSION IF NOT EXISTS citext;"]);
	});

	it("should rethrow an error without a code", async ({ queries }) => {
		await assert.rejects(() => createExtensions(makeDataSource(queries, () => new Error("connection lost"))));

		assert.equal(queries, ["CREATE EXTENSION IF NOT EXISTS citext;"]);
	});
});
