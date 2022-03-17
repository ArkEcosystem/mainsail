import { Container } from "@arkecosystem/core-container";
import { Identifiers } from "@arkecosystem/core-contracts";

import { describe } from "../../../../core-test-framework";
import { Application } from "../../application";
import { LocalFilesystem } from "./drivers/local";
import { ServiceProvider } from "./service-provider";

describe<{
	app: Application;
}>("FilesystemServiceProvider", ({ assert, beforeEach, it }) => {
	beforeEach((context) => {
		context.app = new Application(new Container());
	});

	it(".register", async (context) => {
		assert.false(context.app.isBound(Identifiers.FilesystemManager));
		assert.false(context.app.isBound(Identifiers.FilesystemService));

		await context.app.resolve<ServiceProvider>(ServiceProvider).register();

		assert.true(context.app.isBound(Identifiers.FilesystemManager));
		assert.true(context.app.isBound(Identifiers.FilesystemService));
		assert.instance(context.app.get(Identifiers.FilesystemService), LocalFilesystem);
	});
});
