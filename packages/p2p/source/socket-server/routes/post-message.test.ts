import { Identifiers } from "@mainsail/constants";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";

import { constants } from "../../constants";
import { PostMessageRoute } from "./post-message";

describe<{
	app: Application;
	route: PostMessageRoute;
}>("PostMessageRoute", ({ it, assert, beforeEach }) => {
	const configuration = { getMaxRoundValidators: () => 200 };

	beforeEach((context) => {
		context.app = new Application();

		context.app.bind(Identifiers.ServiceProvider.Configuration).toConstantValue({}).whenTagged("plugin", "p2p");
		context.app.bind(Identifiers.Cryptography.Configuration).toConstantValue(configuration);

		context.route = context.app.resolve(PostMessageRoute);
	});

	it("should cap the payload at the post message limit", ({ route }) => {
		const { maxBytes } = route.getRoutesConfigByPath()["/postMessage"];

		assert.equal(maxBytes, constants.MAX_PAYLOAD_POST_MESSAGE);
	});
});
