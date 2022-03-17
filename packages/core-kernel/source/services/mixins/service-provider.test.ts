import { Container } from "@arkecosystem/core-container";
import { Identifiers } from "@arkecosystem/core-contracts";

import { describe } from "../../../../core-test-framework";
import { Application } from "../../application";
import { MixinService } from "./mixins";
import { ServiceProvider } from "./service-provider";

describe<{
	app: Application;
}>("MixinServiceProvider", ({ assert, beforeEach, it }) => {
	beforeEach((context) => {
		context.app = new Application(new Container());
	});
	it(".register", async (context) => {
		assert.false(context.app.isBound(Identifiers.MixinService));

		await context.app.resolve<ServiceProvider>(ServiceProvider).register();

		assert.true(context.app.isBound(Identifiers.MixinService));
		assert.instance(context.app.get(Identifiers.MixinService), MixinService);
	});
});
