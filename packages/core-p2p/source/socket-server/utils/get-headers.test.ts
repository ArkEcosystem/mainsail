import { Identifiers } from "@arkecosystem/core-contracts";
import { describe } from "../../../../core-test-framework";

import { getHeaders } from "./get-headers";

describe("getHeaders", ({ it, assert }) => {
	let port = 4007;
	const version = "3.0.9";
	const height = 387;
	const stateStore = { isStarted: () => true };
	const blockchain = { getLastHeight: () => height };
	const appGet = {
		[Identifiers.StateStore]: stateStore,
		[Identifiers.BlockchainService]: blockchain,
	};
	const app = {
		get: (key) => appGet[key],
		getTagged: () => ({ get: () => port }),
		version: () => version,
	};

	it("should return accurate { version, port, height }", () => {
		const headers = getHeaders(app as any);

		assert.equal(headers, { height, port, version });
	});

	it("should return { version, port, height: undefined } when state is not 'started'", () => {
		stateStore.isStarted = () => false;
		const headers = getHeaders(app as any);

		assert.equal(headers, { height: undefined, port, version });
	});

	it("should return port as an integer (when it is set in config as a string)", () => {
		port = "4005";

		stateStore.isStarted = () => false;
		const headers = getHeaders(app as any);

		const portNumberAsString = app.getTagged().get();
		assert.string(portNumberAsString);
		assert.equal(portNumberAsString, "4005");
		assert.number(headers.port);
		assert.equal(headers.port, 4005);
	});
});
