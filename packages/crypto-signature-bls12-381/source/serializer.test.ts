import { ByteBuffer } from "@mainsail/utils";
import { Buffer } from "buffer";

import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";
import { Serializer } from "./serializer";

describe<{
	app: Application;
	serializer: Serializer;
}>("Serializer", ({ it, assert, beforeEach }) => {
	beforeEach(async (context) => {
		context.app = new Application();

		context.serializer = context.app.resolve(Serializer);
	});

	it("should serialize and deserialize signature", async ({ serializer }) => {
		const signature = "9529fb1b3001aa735a2d3a70ac8568c9e5757c7112d43de6a0463b3d4354b54a706dc3ab9ca49d32f2307059fe93c5b017949f54427e257af38f72cff36b041ce30fb5ebbac636b2f84ced80a16e0150b059771dae40a5baf86f5805baf061b0";

		const byteBuffer = ByteBuffer.fromBuffer(Buffer.alloc(500));

		serializer.serialize(byteBuffer, signature);
		byteBuffer.reset();

		const readBuffer = serializer.deserialize(byteBuffer);

		assert.equal(readBuffer.toString("hex"), signature);
	});
});
