import { describe } from "../../../../test-framework/source";
import { request, response } from "../../../test/fixtures/get-status";
import { getStatus } from "./get-status";
import { getStatus as proto } from "./proto/protos";

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
