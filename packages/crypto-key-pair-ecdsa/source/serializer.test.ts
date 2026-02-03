import { Identifiers } from "@mainsail/constants";
import { Configuration } from "@mainsail/crypto-config";
import { ByteBuffer } from "@mainsail/utils";
import { Buffer } from "buffer";

import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";
import { PublicKeySerializer } from "./serializer";

describe<{
	app: Application;
	serializer: PublicKeySerializer;
}>("AddressSerializer", ({ it, assert, beforeEach }) => {
	beforeEach(async (context) => {
		context.app = new Application();

		context.app.bind(Identifiers.Cryptography.Configuration).to(Configuration).inSingletonScope();


		context.serializer = context.app.resolve(PublicKeySerializer);
	});

	it("should serialize and deserialize address", async ({ serializer }) => {
		const publicKey = "03e84093c072af70004a38dd95e34def119d2348d5261228175d032e5f2070e19f";

		const byteBuffer = ByteBuffer.fromBuffer(Buffer.alloc(100));

		serializer.serialize(byteBuffer, publicKey);
		byteBuffer.reset();

		const readBuffer = serializer.deserialize(byteBuffer);

		assert.equal(readBuffer.toString("hex"), publicKey);
	});
});
