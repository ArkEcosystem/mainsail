import { Identifiers } from "@mainsail/constants";
import { Application } from "@mainsail/kernel";

import { describe } from "@mainsail/test-runner";
import { ReloadWebhooksHandler } from "./reload-webhooks";

describe<{
	app: Application;
	handler: ReloadWebhooksHandler;
	database: any;
}>("ReloadWebhooksHandler", ({ beforeEach, it, spy }) => {
	beforeEach((context) => {
		context.database = { restore: () => {} };

		context.app = new Application();
		context.app.bind(Identifiers.Webhooks.Database).toConstantValue(context.database);

		context.handler = context.app.resolve(ReloadWebhooksHandler);
	});

	it("restores the webhooks database", async ({ handler, database }) => {
		const restore = spy(database, "restore");

		await handler.handle();

		restore.calledOnce();
	});
});
