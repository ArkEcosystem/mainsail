import { Identifiers } from "@mainsail/constants";
import type { Contracts } from "@mainsail/contracts";

import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";
import { headers } from "../../../test/fixtures/responses/headers";
import { prepareValidatorContext } from "../../../test/helpers/prepare-validator-context";
import { constants } from "../../constants";
import { getApiNodes as replySchema } from "../../reply-schemas/get-api-nodes";
import { getApiNodes as codec } from "../codecs/get-api-nodes";
import { GetApiNodesController } from "./get-api-nodes";

describe<{
	app: Application;
	controller: GetApiNodesController;
	validator: Contracts.Crypto.Validator;
}>("GetApiNodesController", ({ it, assert, beforeEach, stub }) => {
	const apiNodeRepository = { getApiNodes: () => [] };

	const makeApiNode = (
		url: string,
		latency?: number,
		statusCode = 200,
		remoteAddress = "1.2.3.4",
	): Contracts.P2P.ApiNode => ({
		latency,
		remoteAddress,
		statusCode,
		url,
	});

	beforeEach(async (context) => {
		context.app = new Application();
		context.app.bind(Identifiers.P2P.ApiNode.Repository).toConstantValue(apiNodeRepository);

		await prepareValidatorContext(context);
		context.validator = context.app.get<Contracts.Crypto.Validator>(Identifiers.Cryptography.Validator);

		context.controller = context.app.resolve(GetApiNodesController);
	});

	it("should return only the url of healthy, public api nodes sorted by latency", async ({ controller }) => {
		stub(apiNodeRepository, "getApiNodes").returnValue([
			makeApiNode("http://1.2.3.4:4003/", 300),
			makeApiNode("http://2.2.3.4:4003/", 100),
			makeApiNode("http://3.2.3.4:4003/", undefined), // never pinged
			makeApiNode("http://4.2.3.4:4003/", 50, 500), // unhealthy
			makeApiNode("http://5.2.3.4:4003/", 200),
			makeApiNode("http://10.0.0.5:4003/", 10), // configured LAN node, not for peers
			makeApiNode("http://localhost:4003/", 20), // configured loopback node, not for peers
		]);

		const response = await controller.handle({ info: { remoteAddress: "187.55.33.22" }, payload: {} }, {});

		assert.equal(response, {
			apiNodes: [
				{ url: "http://2.2.3.4:4003/" },
				{ url: "http://5.2.3.4:4003/" },
				{ url: "http://1.2.3.4:4003/" },
			],
		});
	});

	it("should not advertise an api node that was verified over a non-public address", async ({ controller }) => {
		stub(apiNodeRepository, "getApiNodes").returnValue([
			makeApiNode("http://mainsail-api:4003/", 10, 200, "172.18.0.5"),
			makeApiNode("http://localtest.me:4003/", 20, 200, "127.0.0.1"),
			makeApiNode("http://[2606:4700::1111]:4003/", 25, 200, "::ffff:10.0.0.5"),
			{ ...makeApiNode("http://unverified.example:4003/", 30), remoteAddress: undefined },
			makeApiNode("https://api.example.com/api", 40, 200, "2606:4700::1111"),
			makeApiNode("http://5.6.7.8:4003/", 50, 200, "5.6.7.8"),
		]);

		const response = await controller.handle({ info: { remoteAddress: "187.55.33.22" }, payload: {} }, {});

		assert.equal(response, {
			apiNodes: [{ url: "https://api.example.com/api" }, { url: "http://5.6.7.8:4003/" }],
		});
	});

	// A single over-long url would make every peer reject the whole reply against its reply schema.
	it("should not advertise an api node whose url is longer than MAX_API_NODE_URL_LENGTH", async ({
		controller,
		validator,
	}) => {
		const prefix = "http://1.2.3.4/";
		const longestUrl = `${prefix}${"a".repeat(constants.MAX_API_NODE_URL_LENGTH - prefix.length)}`;
		const overLongUrl = `${longestUrl}a`;
		const encodedUrl = new URL(
			`${prefix}${"\u4E2D".repeat(constants.MAX_API_NODE_URL_LENGTH - prefix.length)}`,
		).toString();

		stub(apiNodeRepository, "getApiNodes").returnValue([
			makeApiNode(overLongUrl, 10),
			makeApiNode(encodedUrl, 20),
			makeApiNode(longestUrl, 30),
			makeApiNode("http://5.6.7.8:4003/", 40),
		]);

		const response = await controller.handle({ info: { remoteAddress: "187.55.33.22" }, payload: {} }, {});

		assert.equal(response, { apiNodes: [{ url: longestUrl }, { url: "http://5.6.7.8:4003/" }] });
		assert.undefined(validator.validate(replySchema, { ...response, headers }).error);
	});

	it("should return at most MAX_PEERS_GET_API_NODES api nodes", async ({ controller }) => {
		stub(apiNodeRepository, "getApiNodes").returnValue(
			Array.from({ length: constants.MAX_PEERS_GET_API_NODES + 10 }, (_, index) =>
				makeApiNode(`http://1.2.3.4:${4000 + index}/`, index + 1),
			),
		);

		const response = await controller.handle({ info: { remoteAddress: "187.55.33.22" }, payload: {} }, {});

		assert.length(response.apiNodes, constants.MAX_PEERS_GET_API_NODES);
	});

	// The reply schema once drifted from what the controller and proto produce, and a hand-written
	// fixture kept the schema test green. This test pins the three together: controller output
	// (with the headers the HeaderIncludePlugin adds) → codec → reply schema.
	it("should produce a response that survives the codec and satisfies the reply schema", async ({
		controller,
		validator,
	}) => {
		stub(apiNodeRepository, "getApiNodes").returnValue([
			makeApiNode("http://1.2.3.4:4003/", 100),
			makeApiNode("https://api.example.com/api", 200),
			makeApiNode("http://[2606:4700::1111]:4003/", 300),
		]);

		const response = await controller.handle({ info: { remoteAddress: "187.55.33.22" }, payload: {} }, {});
		const wire = { ...response, headers };

		const decoded = codec.response.deserialize(codec.response.serialize(wire));

		assert.equal(decoded, wire);
		assert.undefined(validator.validate(replySchema, decoded).error);
	});

	it("should produce a response that satisfies the reply schema when there are no api nodes", async ({
		controller,
		validator,
	}) => {
		stub(apiNodeRepository, "getApiNodes").returnValue([]);

		const response = await controller.handle({ info: { remoteAddress: "187.55.33.22" }, payload: {} }, {});
		const wire = { ...response, headers };

		const decoded = codec.response.deserialize(codec.response.serialize(wire));

		assert.equal(decoded, wire);
		assert.undefined(validator.validate(replySchema, decoded).error);
	});
});
