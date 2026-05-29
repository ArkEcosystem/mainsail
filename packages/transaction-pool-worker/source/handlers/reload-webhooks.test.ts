import { Identifiers } from "@mainsail/constants";
import { Application } from "@mainsail/kernel";

import { describe } from "@mainsail/test-runner";
import { ReloadWebhooksHandler } from "./reload-webhooks";

describe<{
	app: Application;
	database: any;
}>("ReloadWebhooksHandler", ({ beforeEach, it, spy }) => {
	beforeEach((context) => {
		context.database = { restore: () => {} };

		context.app = new Application();
		context.app.bind(Identifiers.Webhooks.Database).toConstantValue(context.database);
	});

	it("restores the webhooks database", async (context) => {
		const restore = spy(context.database, "restore");

		await context.app.resolve(ReloadWebhooksHandler).handle();

		restore.calledOnce();
	});
});
