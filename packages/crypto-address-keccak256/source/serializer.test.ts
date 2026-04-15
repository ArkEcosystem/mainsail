import { Identifiers } from "@mainsail/constants";
import { ByteBuffer } from "@mainsail/utils";
import { Buffer } from "buffer";

import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";
import { AddressFactory } from "./address.factory";
import { AddressSerializer } from "./serializer";

import { wallets } from "../../crypto-wif/test/index.js";

describe<{
	app: Application;
	serializer: AddressSerializer;
	factory: AddressFactory;
}>("AddressSerializer", ({ it, assert, beforeEach, each }) => {
	beforeEach(async (context) => {
		context.app = new Application();

		context.app.bind(Identifiers.Cryptography.Identity.KeyPair.Factory).toConstantValue({});
		context.app.bind(Identifiers.Cryptography.Identity.PublicKey.Factory).toConstantValue({});

		context.serializer = context.app.resolve(AddressSerializer);
		context.factory = context.app.resolve(AddressFactory);
	});

	each(
		"#serialize & #deserialize - should serialize and deserialize address",
		async ({ context: { factory, serializer }, dataset: wallet }) => {
			const buffer = await factory.toBuffer(wallet.address);

			const byteBuffer = ByteBuffer.fromBuffer(Buffer.alloc(100));

			serializer.serialize(byteBuffer, buffer);
			byteBuffer.reset();

			const readBuffer = serializer.deserialize(byteBuffer);

			assert.equal(await factory.fromBuffer(readBuffer), wallet.address);
		},
		wallets,
	);
});
