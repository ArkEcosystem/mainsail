import { Identifiers } from "@mainsail/constants";
import { Application } from "@mainsail/kernel";

import { describe } from "@mainsail/test-runner";
import { StartHandler } from "./start";

describe<{
	app: Application;
	handler: StartHandler;
	store: any;
	httpServer: any;
	httpsServer: any;
	enabled: { http: boolean; https: boolean };
}>("StartHandler", ({ beforeEach, it, spy }) => {
	beforeEach((context) => {
		context.store = { setBlockNumber: () => {} };
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
		context.app.bind(Identifiers.Evm.API.HTTP).toConstantValue(context.httpServer);
		context.app.bind(Identifiers.Evm.API.HTTPS).toConstantValue(context.httpsServer);
		context.app
			.bind(Identifiers.ServiceProvider.Configuration)
			.toConstantValue(configuration)
			.whenTagged("plugin", "api-evm");

		context.handler = context.app.resolve(StartHandler);
	});

	it("sets the block number", async ({ handler, store }) => {
		const setBlockNumber = spy(store, "setBlockNumber");

		await handler.handle(42);

		setBlockNumber.calledOnce();
		setBlockNumber.calledWith(42);
	});

	it("does not boot any server when neither http nor https is enabled", async ({
		handler,
		httpServer,
		httpsServer,
	}) => {
		const http = spy(httpServer, "boot");
		const https = spy(httpsServer, "boot");

		await handler.handle(42);

		http.neverCalled();
		https.neverCalled();
	});

	it("boots only the http server when http is enabled", async ({ handler, enabled, httpServer, httpsServer }) => {
		enabled.http = true;
		const http = spy(httpServer, "boot");
		const https = spy(httpsServer, "boot");

		await handler.handle(42);

		http.calledOnce();
		https.neverCalled();
	});

	it("boots only the https server when https is enabled", async ({ handler, enabled, httpServer, httpsServer }) => {
		enabled.https = true;
		const http = spy(httpServer, "boot");
		const https = spy(httpsServer, "boot");

		await handler.handle(42);

		http.neverCalled();
		https.calledOnce();
	});

	it("boots both servers when http and https are enabled", async ({ handler, enabled, httpServer, httpsServer }) => {
		enabled.http = true;
		enabled.https = true;
		const http = spy(httpServer, "boot");
		const https = spy(httpsServer, "boot");

		await handler.handle(42);

		http.calledOnce();
		https.calledOnce();
	});
});
