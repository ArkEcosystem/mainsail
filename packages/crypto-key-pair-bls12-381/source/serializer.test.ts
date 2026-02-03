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
		const publicKey = "95af988701a6fb60e09da41d2ca1a9e0b49e43501bda4255b3ca01073f490c34102b6bbcafde6333185e9980745d72cb";

		const byteBuffer = ByteBuffer.fromBuffer(Buffer.alloc(100));

		serializer.serialize(byteBuffer, publicKey);
		byteBuffer.reset();

		const readBuffer = serializer.deserialize(byteBuffer);

		assert.equal(readBuffer.toString("hex"), publicKey);
	});
});
