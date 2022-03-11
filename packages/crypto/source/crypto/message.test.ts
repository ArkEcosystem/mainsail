import { describe, Factories, Generators } from "@arkecosystem/core-test-framework";
import { Message } from "./message";
import { configManager } from "../managers";
import { IMessage, NetworkConfig } from "../interfaces";

describe<{
	originalConfig: NetworkConfig;
	config: NetworkConfig;
	identity: any;
	signedMessage: IMessage;
}>("Message", ({ it, assert, beforeAll, afterAll }) => {
	beforeAll((context) => {
		context.originalConfig = configManager.all();

		// todo: completely wrap this into a function to hide the generation and setting of the config?
		context.config = Generators.generateCryptoConfigRaw();

		configManager.setConfig(context.config);

		context.identity = Factories.factory("Identity")
			.withOptions({
				passphrase: "this is a top secret passphrase",
				network: context.config.network,
			})
			.make();

		context.signedMessage = {
			publicKey: context.identity.publicKey,
			signature:
				"3045022100b5ad008d8a2935cd2261c56ef1605b2e35810f47940277d1d8a6a202a08c6de0022021fcbf9ec9db67f8c7019ff2ce07376f8a203ea77f26f2f7d564d5b8f4bde1a7",
			message: "test",
		};
	});

	afterAll((context) => {
		configManager.setConfig(context.originalConfig);
	});

	it("sign - should sign a message", (context) => {
		const message = Message.sign("test", context.identity.passphrase);

		assert.equal(message.publicKey, context.signedMessage.publicKey);
		assert.equal(message.signature, context.signedMessage.signature);
		assert.equal(message.message, context.signedMessage.message);
	});

	it("signWithWif - should sign a message", (context) => {
		const message = Message.signWithWif("test", context.identity.wif);

		assert.equal(message.publicKey, context.signedMessage.publicKey);
		assert.equal(message.signature, context.signedMessage.signature);
		assert.equal(message.message, context.signedMessage.message);
	});

	it("signWithWif - should sign a message and match passphrase", (context) => {
		const signedMessage = Message.sign("test", context.identity.passphrase);
		const signedWifMessage = Message.signWithWif("test", context.identity.wif);

		assert.equal(signedMessage, signedWifMessage);
	});

	it("verify - should verify a signed message", (context) => {
		const signedMessage = Message.sign("test", context.identity.passphrase);
		assert.true(Message.verify(signedMessage));
	});

	it("verify - should verify a signed wif message", (context) => {
		const signedMessage = Message.signWithWif("test", context.identity.wif);
		assert.true(Message.verify(signedMessage));
	});
});
