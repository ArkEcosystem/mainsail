import type { Contracts } from "@mainsail/contracts";

import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";

import { ApiNodeRepository } from "./api-node-repository";
import { constants } from "./constants";

describe<{
	repository: ApiNodeRepository;
}>("ApiNodeRepository", ({ it, assert, beforeEach }) => {
	const makeApiNode = (
		url: string,
		latency?: number,
		statusCode = 200,
		remoteAddress: string | undefined = "1.2.3.4",
	): Contracts.P2PApiNodes.ApiNode => ({ latency, remoteAddress, statusCode, url });

	const setApiNodes = (repository: ApiNodeRepository, apiNodes: Contracts.P2PApiNodes.ApiNode[]): void => {
		for (const apiNode of apiNodes) {
			repository.setApiNode(apiNode);
		}
	};

	beforeEach((context) => {
		context.repository = new Application().resolve(ApiNodeRepository);
	});

	it("should keep accepted and pending api nodes by url", ({ repository }) => {
		const apiNode = makeApiNode("http://1.2.3.4:4003/");

		repository.setPendingApiNode(apiNode);
		assert.true(repository.hasPendingApiNode(apiNode));
		assert.false(repository.hasApiNode(apiNode));

		repository.forgetPendingApiNode(apiNode);
		repository.setApiNode(apiNode);
		assert.false(repository.hasPendingApiNode(apiNode));
		assert.true(repository.hasApiNode({ url: "http://1.2.3.4:4003/" }));
		assert.equal(repository.getApiNodes(), [apiNode]);

		repository.forgetApiNode(apiNode);
		assert.equal(repository.getApiNodes(), []);
	});

	it("#getPublicApiNodes - should return only the url of healthy, public api nodes sorted by latency", ({
		repository,
	}) => {
		setApiNodes(repository, [
			makeApiNode("http://1.2.3.4:4003/", 300),
			makeApiNode("http://2.2.3.4:4003/", 100),
			makeApiNode("http://3.2.3.4:4003/", undefined), // never pinged
			makeApiNode("http://4.2.3.4:4003/", 50, 500), // unhealthy
			makeApiNode("http://5.2.3.4:4003/", 200),
			makeApiNode("http://10.0.0.5:4003/", 10), // configured LAN node, not for peers
			makeApiNode("http://localhost:4003/", 20), // configured loopback node, not for peers
		]);

		assert.equal(repository.getPublicApiNodes(), [
			{ url: "http://2.2.3.4:4003/" },
			{ url: "http://5.2.3.4:4003/" },
			{ url: "http://1.2.3.4:4003/" },
		]);
	});

	it("#getPublicApiNodes - should leave out an api node that was verified over a non-public address", ({
		repository,
	}) => {
		setApiNodes(repository, [
			makeApiNode("http://mainsail-api:4003/", 10, 200, "172.18.0.5"),
			makeApiNode("http://localtest.me:4003/", 20, 200, "127.0.0.1"),
			makeApiNode("http://[2606:4700::1111]:4003/", 25, 200, "::ffff:10.0.0.5"),
			{ ...makeApiNode("http://unverified.example:4003/", 30), remoteAddress: undefined },
			makeApiNode("https://api.example.com/api", 40, 200, "2606:4700::1111"),
			makeApiNode("http://5.6.7.8:4003/", 50, 200, "5.6.7.8"),
		]);

		assert.equal(repository.getPublicApiNodes(), [
			{ url: "https://api.example.com/api" },
			{ url: "http://5.6.7.8:4003/" },
		]);
	});

	it("#getPublicApiNodes - should leave out an api node whose url is longer than MAX_API_NODE_URL_LENGTH", ({
		repository,
	}) => {
		const prefix = "http://1.2.3.4/";
		const longestUrl = `${prefix}${"a".repeat(constants.MAX_API_NODE_URL_LENGTH - prefix.length)}`;

		setApiNodes(repository, [
			makeApiNode(`${longestUrl}a`, 10),
			makeApiNode(longestUrl, 30),
			makeApiNode("http://5.6.7.8:4003/", 40),
		]);

		assert.equal(repository.getPublicApiNodes(), [{ url: longestUrl }, { url: "http://5.6.7.8:4003/" }]);
	});

	it("#getPublicApiNodes - should return at most MAX_API_NODES_PER_PEER api nodes", ({ repository }) => {
		setApiNodes(
			repository,
			Array.from({ length: constants.MAX_API_NODES_PER_PEER + 10 }, (_, index) =>
				makeApiNode(`http://1.2.3.4:${4000 + index}/`, index + 1),
			),
		);

		assert.length(repository.getPublicApiNodes(), constants.MAX_API_NODES_PER_PEER);
	});
});
