import { ByteBuffer } from "@mainsail/utils";
import { Buffer } from "buffer";

import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";
import { PublicKeySerializer } from "./serializer";

import { wallets } from "../../crypto-wif/test/index.js";

describe<{
	app: Application;
	serializer: PublicKeySerializer;
}>("AddressSerializer", ({ it, assert, beforeEach, each }) => {
	beforeEach(async (context) => {
		context.app = new Application();

		context.serializer = context.app.resolve(PublicKeySerializer);
	});

	each(
		"#serialize - should serialize and deserialize address",
		async ({ context: { serializer }, dataset: wallet }) => {
			const byteBuffer = ByteBuffer.fromBuffer(Buffer.alloc(100));

			serializer.serialize(byteBuffer, wallet.validatorPublicKey);
			byteBuffer.reset();

			const readBuffer = serializer.deserialize(byteBuffer);

			assert.equal(readBuffer.toString("hex"), wallet.validatorPublicKey);
		},
		wallets,
	);
});
