import { describe, Sandbox } from "../../../test-framework";
import { prepareSandbox, ApiContext } from "../../test/helpers/prepare-sandbox";
import { request } from "../../test/helpers/request";

import peers from "../../test/fixtures/peers.json";

describe<{
	sandbox: Sandbox;
}>("Peers", ({ it, afterAll, assert, afterEach, beforeAll, beforeEach, nock }) => {
	let apiContext: ApiContext;

	let options = {};

	beforeAll(async (context) => {
		nock.enableNetConnect();
		apiContext = await prepareSandbox(context);
	});

	afterAll((context) => {
		nock.disableNetConnect();
		apiContext.dispose();
	});

	beforeEach(async (context) => {
		await apiContext.reset();
	});

	afterEach(async (context) => {
		await apiContext.reset();
	});

	it("/peers", async () => {
		let { statusCode, data } = await request("/peers", options);
		assert.equal(statusCode, 200);
		assert.empty(data.data);

		await apiContext.peerRepository.save(peers);

		({ statusCode, data } = await request("/peers", options));
		assert.equal(data.data, peers);
	});

	it("/peers/{ip}", async () => {
		await apiContext.peerRepository.save(peers);

		const peer = peers[peers.length - 1];

		const { statusCode, data } = await request(`/peers/${peer.ip}`, options);
		assert.equal(statusCode, 200);
		assert.equal(data.data, peer);
	});
});
