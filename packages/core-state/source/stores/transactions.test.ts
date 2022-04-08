import { Contracts } from "@arkecosystem/core-contracts";
import { BigNumber, ByteBuffer } from "@arkecosystem/utils";

import { describe, Factories } from "../../../core-test-framework";
import { TransactionStore } from "./transactions";

describe<{
	factory: Factories.FactoryBuilder;
}>("TransactionStore", ({ it, assert, beforeEach }) => {
	beforeEach(async (context) => {
		context.factory = new Factories.FactoryBuilder();

		await Factories.Factories.registerTransactionFactory(context.factory);
	});

	it("should push and get a transaction", (context) => {
		const transaction: Contracts.Crypto.ITransaction = {
			data: {
				amount: BigNumber.make("1300000000"),
				fee: BigNumber.make("10000000"),
				id: "1",
				senderPublicKey: "03287bfebba4c7881a0509717e71b34b63f31e40021c321f89ae04f84be6d6ac37",
				timestamp: 62_222_080,
				type: Contracts.Crypto.TransactionType.Transfer,
				typeGroup: Contracts.Crypto.TransactionTypeGroup.Core,
			},
			deserialize: (buf: ByteBuffer): Promise<void> => Promise.resolve(),
			hasVendorField: () => false,
			id: "1",
			key: "theKey",
			serialize: (options?: Contracts.Crypto.ISerializeOptions): Promise<ByteBuffer | undefined> =>
				Promise.resolve(),
			serialized: Buffer.from("1234", "hex"),
			type: Contracts.Crypto.TransactionType.Transfer,
			typeGroup: Contracts.Crypto.TransactionTypeGroup.Core,
		};

		const store = new TransactionStore(100);
		store.push(transaction.data);

		assert.equal(store.count(), 1);
		assert.equal(store.get("1"), transaction.data);
	});
});
