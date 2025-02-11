import { describe } from "@mainsail/test-framework";

import { LocalClient } from "./clients/index.js";
import { Client } from "./types";

describe<{
	localClient: Client;
}>("BlockHeight", ({ beforeEach, afterEach, it, assert, nock }) => {
	beforeEach((context) => {
		nock.enableNetConnect();
		context.localClient = new LocalClient("http://127.0.0.1:4008/api");
	});

	it("should return correct block height", async ({ localClient }) => {
		const height = await localClient.getHeight();

		console.log("Height", height);

		assert.number(height);
	});
});
