import { describe } from "../../../../core-test-framework";

import { Application } from "../../application";
import { Container, Identifiers } from "../../ioc";
import { ServiceProvider } from "./service-provider";
import { LocalFilesystem } from "./drivers/local";

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
