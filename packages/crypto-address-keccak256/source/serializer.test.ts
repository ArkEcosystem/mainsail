import { Identifiers } from "@mainsail/constants";
import { Configuration } from "@mainsail/crypto-config";
import { ServiceProvider as ECDSA } from "@mainsail/crypto-key-pair-ecdsa";
import { ServiceProvider as CoreValidation } from "@mainsail/validation";
import { ByteBuffer } from "@mainsail/utils";
import { Buffer } from "buffer";

import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";
import { AddressFactory } from "./address.factory";
import { AddressSerializer } from "./serializer";

describe<{
	app: Application;
	serializer: AddressSerializer;
	factory: AddressFactory;
}>("AddressSerializer", ({ it, assert, beforeEach }) => {
	beforeEach(async (context) => {
		context.app = new Application();

		context.app.bind(Identifiers.Cryptography.Configuration).to(Configuration).inSingletonScope();

		await context.app.resolve(CoreValidation).register();
		await context.app.resolve<ECDSA>(ECDSA).register();

		context.serializer = context.app.resolve(AddressSerializer);
		context.factory = context.app.resolve(AddressFactory);
	});

	it("should serialize and deserialize address", async ({ factory, serializer }) => {
		const address = "0xC7C50f33278bDe272ffe23865fF9fBd0155a5175"
		const buffer = await factory.toBuffer(address);

		const byteBuffer = ByteBuffer.fromBuffer(Buffer.alloc(100));

		serializer.serialize(byteBuffer, buffer);
		byteBuffer.reset();

		const readBuffer = serializer.deserialize(byteBuffer);

		assert.equal(await factory.fromBuffer(readBuffer), address);
	});
});
