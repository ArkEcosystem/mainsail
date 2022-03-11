import { describe } from "@arkecosystem/core-test-framework";
import { NetworkManager } from "./network";
import * as networks from "../networks";

describe("Network Manager", ({ it, assert }) => {
	it("should be instantiated", () => {
		assert.defined(NetworkManager);
	});

	it("should find mainnet by name", () => {
		const actual = NetworkManager.findByName("mainnet");

		assert.equal(actual, networks.mainnet);
	});

	it("should get all networks", () => {
		assert.equal(NetworkManager.all(), networks);
	});
});
