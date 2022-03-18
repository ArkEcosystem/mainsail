import { Contracts, Identifiers } from "@arkecosystem/core-contracts";
import { Validator } from "@arkecosystem/core-validation/source/validator";
import { ByteBuffer } from "@arkecosystem/utils";

import { describe, Sandbox } from "../../../core-test-framework";
import { VoteTransaction } from "./index";

describe<{
	sanbox: Sandbox;
}>("VoteTransactionV1", ({ beforeEach, it, assert }) => {
	const PUBLIC_KEY_SIZE = 33;

	beforeEach((context) => {
		context.sanbox = new Sandbox();

		context.sanbox.app.bind(Identifiers.Cryptography.Identity.AddressFactory).toConstantValue({});
		context.sanbox.app.bind(Identifiers.Cryptography.Configuration).toConstantValue({});
		context.sanbox.app.bind(Identifiers.Cryptography.Size.PublicKey).toConstantValue(PUBLIC_KEY_SIZE);
	});

	it("shoudl serialize and deserialize transaction", async ({ sanbox }) => {
		const datas: Partial<Contracts.Crypto.ITransactionData>[] = [
			{
				asset: {
					votes: ["+" + "aa".repeat(PUBLIC_KEY_SIZE)],
				},
			},
			{
				asset: {
					votes: ["-" + "aa".repeat(PUBLIC_KEY_SIZE)],
				},
			},
			{
				asset: {
					votes: ["-" + "bb".repeat(PUBLIC_KEY_SIZE), "+" + "aa".repeat(PUBLIC_KEY_SIZE)],
				},
			},
		];

		for (const data of datas) {
			const transaction = sanbox.app.resolve(VoteTransaction);
			transaction.data = data as Contracts.Crypto.ITransactionData;

			const serialized = await transaction.serialize();

			assert.instance(serialized, ByteBuffer);

			transaction.data = {} as Contracts.Crypto.ITransactionData;
			serialized.reset();

			await transaction.deserialize(serialized);

			assert.equal(transaction.data, data);
		}
	});

	it.skip("schema - shoudl pass", async ({ sanbox }) => {
		const validator = sanbox.app.resolve(Validator);
		const schema = VoteTransaction.getSchema();

		validator.addSchema(schema);
		const result = await validator.validate("vote", {});

		console.log(result);
		// assert.undefined(result.value);
	});
});
