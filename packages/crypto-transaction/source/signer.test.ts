import type { Contracts } from "@mainsail/contracts";
import { Identifiers } from "@mainsail/constants";
import { BigNumber } from "@mainsail/utils";

import { TransactionBuilder } from "../source/builders.js";
import { describe, Sandbox } from "@mainsail/test-framework";
import { prepareSandbox } from "../test/helpers/prepare-sandbox";

describe<{
	sandbox: Sandbox;
	signer: Contracts.Crypto.TransactionSigner;
	keyPair: Contracts.Crypto.KeyPair;
	transaction: Contracts.Crypto.Transaction;
}>("Signer", ({ it, beforeEach, assert }) => {
	beforeEach(async (context) => {
		await prepareSandbox(context);

		context.signer = context.sandbox.app.get<Contracts.Crypto.TransactionSigner>(
			Identifiers.Cryptography.Transaction.Signer,
		);

		context.keyPair = await context.sandbox.app
			.getTagged<Contracts.Crypto.KeyPairFactory>(
				Identifiers.Cryptography.Identity.KeyPair.Factory,
				"type",
				"wallet",
			)
			.fromMnemonic("secret");

		const builder = context.sandbox.app.resolve(TransactionBuilder);
		context.transaction = await (
			await builder
				.gasPrice(5 * 1e9)
				.recipientAddress("0xAe44ad925374b90B5f2A285461A70D6ba655EE28")
				.value(BigNumber.make(1).toFixed())
				.nonce("0")
				.signWithKeyPair(context.keyPair)
		).build();
	});

	it("should sign signature", async (context) => {
		const signature = await context.signer.sign(context.transaction.data, context.keyPair);

		assert.equal(signature, {
			r: "295ffb1befa5259bba46d532affa13f52f1e50f9418a2579982b121b4ef3553a",
			s: "1fe13d077cbcd6f2293d41c66eb5e5dee4e2bf3b8f8eb3e0556304befbbb69bb",
			v: 1,
		});
	});

	it("should sign legacy signature", async (context) => {
		const signature = await context.signer.legacySecondSign(context.transaction.data, context.keyPair);

		assert.equal(
			signature,
			"295ffb1befa5259bba46d532affa13f52f1e50f9418a2579982b121b4ef3553a1fe13d077cbcd6f2293d41c66eb5e5dee4e2bf3b8f8eb3e0556304befbbb69bb01",
		);
	});
});
