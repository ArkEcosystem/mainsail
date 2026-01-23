import { Identifiers } from "@mainsail/constants";

import { describe } from "@mainsail/test-runner";
import { Application } from "../../application";
import { Schedule } from "./schedule";
import { ServiceProvider } from "./service-provider";

describe<{
	app: Application;
}>("LogServiceProvider", ({ assert, beforeEach, it }) => {
	beforeEach((context) => {
		context.app = new Application();
	});
	it(".register", async (context) => {
		assert.false(context.app.isBound(Identifiers.Services.Schedule.Service));

		await context.app.resolve<ServiceProvider>(ServiceProvider).register();

		assert.true(context.app.isBound(Identifiers.Services.Schedule.Service));
		assert.instance(context.app.get(Identifiers.Services.Schedule.Service), Schedule);
	});
});
