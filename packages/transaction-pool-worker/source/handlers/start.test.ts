import { Identifiers } from "@mainsail/constants";
import { Application } from "@mainsail/kernel";

import { describe } from "@mainsail/test-runner";
import { StartHandler } from "./start";

describe<{
	app: Application;
	store: any;
	transactionPoolService: any;
	httpServer: any;
	httpsServer: any;
	enabled: { http: boolean; https: boolean };
}>("StartHandler", ({ beforeEach, it, spy }) => {
	beforeEach((context) => {
		context.store = { setBlockNumber: () => {} };
		context.transactionPoolService = { reAddTransactions: async () => {} };
		context.httpServer = { boot: async () => {} };
		context.httpsServer = { boot: async () => {} };
		context.enabled = { http: false, https: false };

		const configuration = {
			getRequired: (key: string) =>
				key === "server.http.enabled" ? context.enabled.http : context.enabled.https,
		};

		// Application binds itself as Application.Instance, so the handler resolves the servers
		// off the same container the test binds them into.
		context.app = new Application();
		context.app.bind(Identifiers.State.Store).toConstantValue(context.store);
		context.app.bind(Identifiers.TransactionPool.Service).toConstantValue(context.transactionPoolService);
		context.app.bind(Identifiers.TransactionPool.API.HTTP).toConstantValue(context.httpServer);
		context.app.bind(Identifiers.TransactionPool.API.HTTPS).toConstantValue(context.httpsServer);
		context.app
			.bind(Identifiers.ServiceProvider.Configuration)
			.toConstantValue(configuration)
			.whenTagged("plugin", "api-transaction-pool");
	});

	const resolve = (context) => context.app.resolve(StartHandler);

	it("sets the block number and re-adds the transactions", async (context) => {
		const setBlockNumber = spy(context.store, "setBlockNumber");
		const reAdd = spy(context.transactionPoolService, "reAddTransactions");

		await resolve(context).handle(42);

		setBlockNumber.calledOnce();
		setBlockNumber.calledWith(42);
		reAdd.calledOnce();
	});

	it("does not boot any server when neither http nor https is enabled", async (context) => {
		const http = spy(context.httpServer, "boot");
		const https = spy(context.httpsServer, "boot");

		await resolve(context).handle(42);

		http.neverCalled();
		https.neverCalled();
	});

	it("boots only the http server when http is enabled", async (context) => {
		context.enabled.http = true;
		const http = spy(context.httpServer, "boot");
		const https = spy(context.httpsServer, "boot");

		await resolve(context).handle(42);

		http.calledOnce();
		https.neverCalled();
	});

	it("boots only the https server when https is enabled", async (context) => {
		context.enabled.https = true;
		const http = spy(context.httpServer, "boot");
		const https = spy(context.httpsServer, "boot");

		await resolve(context).handle(42);

		http.neverCalled();
		https.calledOnce();
	});

	it("boots both servers when http and https are enabled", async (context) => {
		context.enabled.http = true;
		context.enabled.https = true;
		const http = spy(context.httpServer, "boot");
		const https = spy(context.httpsServer, "boot");

		await resolve(context).handle(42);

		http.calledOnce();
		https.calledOnce();
	});
});
