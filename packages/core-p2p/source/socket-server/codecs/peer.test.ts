import { describe } from "@arkecosystem/core-test-framework/source";

import { request, response } from "../../../test/fixtures/get-status";
import { getStatus } from "./peer";
import { peer } from "./proto/protos";

describe("PeerCodec", ({ it, assert }) => {
	it("#getStatus should serde request", () => {
		const buffer = getStatus.request.serialize(new peer.GetStatusRequest(request));
		const result = getStatus.request.deserialize(buffer);

		assert.equal(request, result.toJSON());
	});

	it.only("#getStatus should serde response", () => {
		const buffer = getStatus.response.serialize(response);
		const result = getStatus.response.deserialize(buffer);

		assert.equal(response, result);
	});
});
