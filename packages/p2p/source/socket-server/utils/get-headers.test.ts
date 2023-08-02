import { Identifiers } from "@mainsail/contracts";

import { describe } from "../../../../test-framework";
import { getHeaders } from "./get-headers";

describe("getHeaders", ({ it, assert }) => {
	let port = 4007;
	const version = "3.0.9";
	const height = 387;
	const stateStore = { getLastHeight: () => height, isStarted: () => true };
	const appGet = {
		[Identifiers.StateStore]: stateStore,
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
