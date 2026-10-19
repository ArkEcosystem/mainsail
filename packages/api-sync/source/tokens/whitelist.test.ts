import { Identifiers as ApiDatabaseIdentifiers, Models } from "@mainsail/api-database";
import { Identifiers } from "@mainsail/constants";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";
import { http } from "@mainsail/utils";

import { TokenWhitelist } from "./whitelist.js";

const REMOTE_URL = "https://tokens.example.org/whitelist.json";

const TOKEN_ADDRESS = "0x1111111111111111111111111111111111111111";
const VALID_TIMESTAMP = "2026-02-11T14:25:00.000Z";

const response = (data: unknown) => ({
	data,
	headers: [],
	method: "GET",
	statusCode: 200,
	statusMessage: "OK",
});

type Ctx = {
	app: Application;
	whitelist: TokenWhitelist;
	entityManager: { clear: any; save: any };
	dataSource: { transaction: any };
	logger: Record<string, any>;
	addressFactory: { validate: any };
	remoteUrl: string;
};

describe<Ctx>("TokenWhitelist", ({ it, beforeEach, afterEach, assert, spy, stub }) => {
	beforeEach((context) => {
		context.remoteUrl = REMOTE_URL;
		context.entityManager = { clear: async () => {}, save: async () => {} };
		context.dataSource = {
			transaction: async (callback: any) => callback(context.entityManager),
		};
		context.logger = { debug: () => {}, debugExtra: () => {}, error: () => {}, info: () => {} };
		context.addressFactory = { validate: async () => true };

		context.app = new Application();
		context.app
			.bind(Identifiers.ServiceProvider.Configuration)
			.toConstantValue({
				getRequired: (key: string) => (key === "tokenWhitelistRemoteUrl" ? context.remoteUrl : 3_600_000),
			})
			.whenTagged("plugin", "api-sync");
		context.app.bind(ApiDatabaseIdentifiers.DataSource).toConstantValue(context.dataSource);
		context.app.bind(Identifiers.ApiSync.Logger).toConstantValue(context.logger);
		context.app.bind(Identifiers.Cryptography.Identity.Address.Factory).toConstantValue(context.addressFactory);

		context.whitelist = context.app.resolve(TokenWhitelist);
	});

	afterEach(async ({ whitelist }) => {
		await whitelist.dispose();
	});

	const tick = async (): Promise<void> =>
		new Promise((resolve) => {
			setImmediate(resolve);
		});

	// bootstrap() fires the sync loop without awaiting it; wait for its observable effect.
	const waitFor = async (predicate: () => boolean): Promise<void> => {
		for (let attempt = 0; attempt < 100 && !predicate(); attempt++) {
			await tick();
		}

		assert.true(predicate());

		// Let the loop reach its `finally` and schedule the follow-up timer, so the
		// dispose() in afterEach reliably clears it and the process can exit.
		await tick();
		await tick();
	};

	it("replaces the stored whitelist with the fetched one", async ({ whitelist, entityManager, logger }) => {
		const get = stub(http, "get").resolvedValue(
			response([{ address: TOKEN_ADDRESS, comment: "  a comment  ", createdAt: VALID_TIMESTAMP }]),
		);

		const info = spy(logger, "info");
		const clear = spy(entityManager, "clear");
		const save = spy(entityManager, "save");

		await whitelist.bootstrap();
		await waitFor(() => save.toFunction().callCount > 0);

		info.calledWith(`Starting TokenWhitelist using remote: ${REMOTE_URL}`);
		get.calledWith(REMOTE_URL, { maxContentLength: 16 * 1024, timeout: 2500 });
		clear.calledWith(Models.TokenWhitelist);
		save.calledOnce();
		assert.equal(save.getCallArgs(0), [
			Models.TokenWhitelist,
			[{ address: TOKEN_ADDRESS, comment: "a comment", createdAt: VALID_TIMESTAMP }],
			{ chunk: 1000 },
		]);
	});

	it("parses a whitelist served as a raw string", async ({ whitelist, entityManager }) => {
		stub(http, "get").resolvedValue(
			response(JSON.stringify([{ address: TOKEN_ADDRESS, createdAt: VALID_TIMESTAMP }])),
		);

		const save = spy(entityManager, "save");

		await whitelist.bootstrap();
		await waitFor(() => save.toFunction().callCount > 0);

		assert.equal(save.getCallArgs(0)[1], [{ address: TOKEN_ADDRESS, createdAt: VALID_TIMESTAMP }]);
	});

	it("drops tokens with a malformed address", async ({ whitelist, entityManager, addressFactory, logger }) => {
		stub(http, "get").resolvedValue(
			response([
				{ address: "not-an-address", createdAt: VALID_TIMESTAMP },
				{ address: TOKEN_ADDRESS, createdAt: VALID_TIMESTAMP },
			]),
		);

		addressFactory.validate = async (address: string) => address === TOKEN_ADDRESS;
		const debugExtra = spy(logger, "debugExtra");
		const save = spy(entityManager, "save");

		await whitelist.bootstrap();
		await waitFor(() => save.toFunction().callCount > 0);

		assert.equal(save.getCallArgs(0)[1], [{ address: TOKEN_ADDRESS, createdAt: VALID_TIMESTAMP }]);
		debugExtra.calledOnce();
	});

	it("drops tokens with a malformed timestamp", async ({ whitelist, entityManager, logger }) => {
		stub(http, "get").resolvedValue(
			response([
				{ address: TOKEN_ADDRESS, createdAt: "yesterday" },
				{ address: TOKEN_ADDRESS, createdAt: "2026-02-11T14:25:00Z" }, // missing milliseconds
				{ address: TOKEN_ADDRESS, createdAt: VALID_TIMESTAMP },
			]),
		);

		const debugExtra = spy(logger, "debugExtra");
		const save = spy(entityManager, "save");

		await whitelist.bootstrap();
		await waitFor(() => save.toFunction().callCount > 0);

		assert.equal(save.getCallArgs(0)[1], [{ address: TOKEN_ADDRESS, createdAt: VALID_TIMESTAMP }]);
		debugExtra.calledTimes(2);
	});

	it("drops tokens whose validation throws", async ({ whitelist, entityManager, addressFactory, logger }) => {
		stub(http, "get").resolvedValue(
			response([
				{ address: "0xboom", createdAt: VALID_TIMESTAMP },
				{ address: TOKEN_ADDRESS, createdAt: VALID_TIMESTAMP },
			]),
		);

		addressFactory.validate = async (address: string) => {
			if (address === "0xboom") {
				throw new Error("validator crashed");
			}
			return true;
		};
		const debugExtra = spy(logger, "debugExtra");
		const save = spy(entityManager, "save");

		await whitelist.bootstrap();
		await waitFor(() => save.toFunction().callCount > 0);

		assert.equal(save.getCallArgs(0)[1], [{ address: TOKEN_ADDRESS, createdAt: VALID_TIMESTAMP }]);
		debugExtra.calledOnce();
	});

	it("does nothing without a configured remote", async (context) => {
		context.remoteUrl = "";

		const get = stub(http, "get").resolvedValue(response([]));
		const transaction = spy(context.dataSource, "transaction");
		const error = spy(context.logger, "error");

		await context.whitelist.bootstrap();
		// Allow the fire-and-forget run to settle and schedule its follow-up timer.
		await tick();
		await tick();

		get.neverCalled();
		transaction.neverCalled();
		error.neverCalled();
	});

	it("logs fetch failures without updating the whitelist", async ({ whitelist, dataSource, logger }) => {
		stub(http, "get").rejectedValue(new Error("connection refused"));

		const transaction = spy(dataSource, "transaction");
		const error = spy(logger, "error");

		await whitelist.bootstrap();
		await waitFor(() => error.toFunction().callCount > 0);

		assert.true(error.getCallArgs(0)[0].startsWith("fetchWhitelist failed"));
		assert.true(error.getCallArgs(0)[0].includes("connection refused"));
		transaction.neverCalled();
	});

	it("logs sync failures raised by the database transaction", async ({ whitelist, dataSource, logger }) => {
		stub(http, "get").resolvedValue(response([{ address: TOKEN_ADDRESS, createdAt: VALID_TIMESTAMP }]));

		dataSource.transaction = async () => {
			throw new Error("database offline");
		};
		const error = spy(logger, "error");

		await whitelist.bootstrap();
		await waitFor(() => error.toFunction().callCount > 0);

		assert.true(error.getCallArgs(0)[0].startsWith("#syncWhitelist failed"));
	});

	it("dispose: can be called before bootstrap", async ({ whitelist }) => {
		await assert.resolves(() => whitelist.dispose());
	});
});
