import { Identifiers } from "@mainsail/constants";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";

import { GetMessagesRoute } from "./get-messages";

describe<{
	app: Application;
	route: GetMessagesRoute;
}>("GetMessagesRoute", ({ it, assert, beforeEach }) => {
	const configuration = { getMaxRoundValidators: () => 200 };

	beforeEach((context) => {
		context.app = new Application();

		context.app.bind(Identifiers.ServiceProvider.Configuration).toConstantValue({}).whenTagged("plugin", "p2p");
		context.app.bind(Identifiers.Cryptography.Configuration).toConstantValue(configuration);

		context.route = context.app.resolve(GetMessagesRoute);
	});

	it("should use a flat payload limit", ({ route }) => {
		const { maxBytes } = route.getRoutesConfigByPath()["/getMessages"];

		assert.equal(maxBytes, 1024);
	});
});
