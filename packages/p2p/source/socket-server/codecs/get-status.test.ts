import { describe } from "../../../../test-framework/source";
import { request, response } from "../../../test/fixtures/get-status";
import { getStatus } from "./get-status.js";
import type * as types from "./proto/protos.d.ts";
import { getStatus as proto } from "./proto/protos.js";

describe("PeerCodec", ({ it, assert }) => {
	it.only("#getStatus should serde request", () => {
		const buffer = getStatus.request.serialize(new proto.GetStatusRequest(request));
		const result = getStatus.request.deserialize(buffer);

		assert.equal(request, result.toJSON());
	});

	it("#getStatus should serde response", () => {
		const buffer = getStatus.response.serialize(response);
		const result = getStatus.response.deserialize(buffer);

		assert.equal(response, result);
	});
});
