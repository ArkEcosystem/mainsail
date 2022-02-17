import "jest-extended";

import { Application } from "@packages/core-kernel/source/application";
import { Container, Identifiers } from "@packages/core-kernel/source/ioc";
import { ServiceProvider } from "@packages/core-kernel/source/services/mixins";
import { MixinService } from "@packages/core-kernel/source/services/mixins/mixins";

let app: Application;

beforeEach(() => (app = new Application(new Container())));

describe("MixinServiceProvider", () => {
	it(".register", async () => {
		expect(app.isBound(Identifiers.MixinService)).toBeFalse();

		await app.resolve<ServiceProvider>(ServiceProvider).register();

		expect(app.isBound(Identifiers.MixinService)).toBeTrue();
		expect(app.get(Identifiers.MixinService)).toBeInstanceOf(MixinService);
	});
});
