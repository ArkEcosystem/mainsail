import { Container } from "@mainsail/container";
import { Identifiers } from "@mainsail/contracts";

import { describe } from "../../../../test-framework";
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
		assert.false(context.app.isBound(Identifiers.Kernel.Filesystem.Manager));
		assert.false(context.app.isBound(Identifiers.Kernel.Filesystem.Service));

		await context.app.resolve<ServiceProvider>(ServiceProvider).register();

		assert.true(context.app.isBound(Identifiers.Kernel.Filesystem.Manager));
		assert.true(context.app.isBound(Identifiers.Kernel.Filesystem.Service));
		assert.instance(context.app.get(Identifiers.Kernel.Filesystem.Service), LocalFilesystem);
	});
});
