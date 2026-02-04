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
		const signature = "a7e75af9dd4d868a41ad2f5a5b021d653e31084261724fb40ae2f1b1c31c778d3b9464502d599cf6720723ec5c68b59d";

		const byteBuffer = ByteBuffer.fromBuffer(Buffer.alloc(200));

		serializer.serialize(byteBuffer, signature);
		byteBuffer.reset();

		const readBuffer = serializer.deserialize(byteBuffer);

		assert.equal(readBuffer.toString("hex"), signature);
	});
});
