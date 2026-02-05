import { ByteBuffer } from "@mainsail/utils";
import { Buffer } from "buffer";

import { Selectors } from "@mainsail/container";
import { Identifiers } from "@mainsail/constants";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";
import { Serializer } from "./serializer";

describe<{
	app: Application;
	serializer: Serializer;
}>("Serializer", ({ it, assert, beforeEach }) => {
	beforeEach(async (context) => {
		context.app = new Application();

		context.app
			.bind(Identifiers.Cryptography.Signature.Size)
			.toConstantValue(32 + /* r */ 32 + /* s */ +1 /* v */)
			.when(Selectors.anyAncestorOrTargetTagged("type", "wallet"));

		context.serializer = context.app.resolve(Serializer);
	});

	it("should serialize and deserialize signature", async ({ serializer }) => {
		const signature =
			"3044022066f1c6d9fe13834f6e348aae40426060339ed8cba7d9b2f105c8220be095877c02201368fffd8294f1e22086703d33511fc8bb25231d6e9dc64d6449035003184bdd";

		const byteBuffer = ByteBuffer.fromBuffer(Buffer.alloc(500));

		serializer.serialize(byteBuffer, signature);
		byteBuffer.reset();

		const readBuffer = serializer.deserialize(byteBuffer);

		assert.equal(readBuffer.toString("hex"), signature);
	});
});
