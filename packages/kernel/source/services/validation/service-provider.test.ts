import { Container } from "@mainsail/container";
import { Identifiers } from "@mainsail/contracts";

import { describe } from "../../../../test-framework";
import { Application } from "../../application";
import { JoiValidator } from "./drivers/joi";
import { ServiceProvider } from "./service-provider";

describe<{
	app: Application;
}>("ValidationServiceProvider", ({ assert, beforeEach, it }) => {
	beforeEach((context) => {
		context.app = new Application(new Container());
	});

	it(".register", async (context) => {
		assert.false(context.app.isBound(Identifiers.Kernel.Validation.Manager));
		assert.false(context.app.isBound(Identifiers.Kernel.Validation.Service));

		await context.app.resolve<ServiceProvider>(ServiceProvider).register();

		assert.true(context.app.isBound(Identifiers.Kernel.Validation.Manager));
		assert.true(context.app.isBound(Identifiers.Kernel.Validation.Service));
		assert.instance(context.app.get(Identifiers.Kernel.Validation.Service), JoiValidator);
	});
});
