import { describe } from "../../../../core-test-framework";

import { Application } from "../../application";
import { Container, Identifiers } from "../../ioc";
import { ServiceProvider } from "./service-provider";
import { JoiValidator } from "./drivers/joi";

describe<{
	app: Application;
}>("ValidationServiceProvider", ({ assert, beforeEach, it }) => {
	beforeEach((context) => {
		context.app = new Application(new Container());
	});

	it(".register", async (context) => {
		assert.false(context.app.isBound(Identifiers.ValidationManager));
		assert.false(context.app.isBound(Identifiers.ValidationService));

		await context.app.resolve<ServiceProvider>(ServiceProvider).register();

		assert.true(context.app.isBound(Identifiers.ValidationManager));
		assert.true(context.app.isBound(Identifiers.ValidationService));
		assert.instance(context.app.get(Identifiers.ValidationService), JoiValidator);
	});
});
