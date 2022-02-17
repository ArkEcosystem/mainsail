import "jest-extended";

import { Application } from "@packages/core-kernel/source/application";
import { Container, Identifiers } from "@packages/core-kernel/source/ioc";
import { ServiceProvider, Triggers } from "@packages/core-kernel/source/services/triggers";

let app: Application;

beforeEach(() => (app = new Application(new Container())));

describe("TriggersServiceProvider", () => {
	it(".register", async () => {
		expect(app.isBound(Identifiers.TriggerService)).toBeFalse();

		await app.resolve<ServiceProvider>(ServiceProvider).register();

		expect(app.isBound(Identifiers.TriggerService)).toBeTrue();
		expect(app.get(Identifiers.TriggerService)).toBeInstanceOf(Triggers);
	});
});
