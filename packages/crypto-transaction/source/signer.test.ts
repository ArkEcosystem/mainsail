import type { Contracts } from "@mainsail/contracts";
import { Identifiers } from "@mainsail/constants";

import { TransactionBuilder } from "../source/builder.js";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";
import { wallet } from "../test/fixtures/index";
import { prepareSandbox } from "../test/helpers/prepare-sandbox";

describe<{
	app: Application;
	signer: Contracts.Crypto.TransactionSigner;
	factory: Contracts.Crypto.TransactionFactory;
	keyPair: Contracts.Crypto.KeyPair;
	transaction: Contracts.Crypto.Transaction;
}>("Signer", ({ it, beforeEach, assert }) => {
	beforeEach(async (context) => {
		await prepareSandbox(context);

		context.signer = context.app.get<Contracts.Crypto.TransactionSigner>(
			Identifiers.Cryptography.Transaction.Signer,
		);
		context.factory = context.app.get<Contracts.Crypto.TransactionFactory>(
			Identifiers.Cryptography.Transaction.Factory,
		);

		context.keyPair = await context.app
			.getTagged<Contracts.Crypto.KeyPairFactory>(
				Identifiers.Cryptography.Identity.KeyPair.Factory,
				"type",
				"wallet",
			)
			.fromMnemonic("secret");

		const builder = context.app.resolve(TransactionBuilder);
		context.transaction = await (
			await builder
				.gasPrice(5 * 1e9)
				.recipientAddress("0xAe44ad925374b90B5f2A285461A70D6ba655EE28")
				.value("1")
				.nonce("0")
				.signWithKeyPair(context.keyPair)
		).build();
	});

	it("should sign signature", async (context) => {
		const signature = await context.signer.sign(context.transaction, context.keyPair);

		assert.equal(signature, {
			r: "295ffb1befa5259bba46d532affa13f52f1e50f9418a2579982b121b4ef3553a",
			s: "1fe13d077cbcd6f2293d41c66eb5e5dee4e2bf3b8f8eb3e0556304befbbb69bb",
			v: 1,
		});
	});

	it("should sign legacy signature", async (context) => {
		const signature = await context.signer.legacySecondSign(context.transaction, context.keyPair);

		assert.equal(
			signature,
			"963e726eb3bc5f68a1bbf1c25c4324a3ff93c7853e70fc4a890665982c05ae877270a93df25d9ffdb1df2f3bd5a8816287bb9a10f85428970ac25f9ce6dacf4f00",
		);
	});

	it("should sign legacy signature that is not a primary signature of the second key", async ({
		factory,
		signer,
		transaction,
	}) => {
		const legacySecondSignature = await signer.legacySecondSign(transaction, {
			compressed: false,
			privateKey: wallet.privateKey,
			publicKey: wallet.publicKey,
		});

		const replayed = await factory.fromData({
			...transaction.toData(),
			r: legacySecondSignature.slice(0, 64),
			s: legacySecondSignature.slice(64, 128),
			v: Number.parseInt(legacySecondSignature.slice(128), 16),
		});

		assert.not.equal(replayed.senderPublicKey, wallet.publicKey);
	});
});
