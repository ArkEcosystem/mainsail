import { Container } from "inversify";
import { describe } from "../../../core-test-framework";

import { decorateInjectable } from "./decorator";

class ThirdPartyClass {}

describe<{
	container: Container;
}>("decorateInjectable", ({ assert, beforeEach, it }) => {
	beforeEach((context) => {
		context.container = new Container();
	});

	it("should throw error when resolving class without injectable decoration", async (context) => {
		await assert.rejects(() => {
			context.container.resolve(ThirdPartyClass);
		}, "Missing required @injectable annotation in: ThirdPartyClass.");
	});

	it("should resolve after decorating class", async (context) => {
		decorateInjectable(ThirdPartyClass);

		await assert.resolves(() => context.container.resolve(ThirdPartyClass));
		assert.instance(context.container.resolve(ThirdPartyClass), ThirdPartyClass);
	});

	it("should allow multiple calls for same class", (context) => {
		decorateInjectable(ThirdPartyClass);
		decorateInjectable(ThirdPartyClass);

		assert.instance(context.container.resolve(ThirdPartyClass), ThirdPartyClass);
	});
});
