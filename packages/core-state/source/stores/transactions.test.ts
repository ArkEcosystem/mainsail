import { Contracts } from "@arkecosystem/core-contracts";
import { BigNumber, ByteBuffer } from "@arkecosystem/utils";
import { describe, Factories } from "../../../core-test-framework";

import { TransactionStore } from "./transactions";

describe<{
	factory: Factories.FactoryBuilder;
}>("TransactionStore", ({ it, assert, beforeEach }) => {
	beforeEach((context) => {
		context.factory = new Factories.FactoryBuilder();

		Factories.Factories.registerTransactionFactory(context.factory);
	});

	it("should push and get a transaction", (context) => {
		const transaction: Contracts.Crypto.ITransaction = {
			id: "1",
			typeGroup: Contracts.Crypto.TransactionTypeGroup.Core,
			type: Contracts.Crypto.TransactionType.Transfer,
			key: "theKey",
			data: {
				id: "1",
				typeGroup: Contracts.Crypto.TransactionTypeGroup.Core,
				type: Contracts.Crypto.TransactionType.Transfer,
				timestamp: 62222080,
				senderPublicKey: "03287bfebba4c7881a0509717e71b34b63f31e40021c321f89ae04f84be6d6ac37",
				fee: BigNumber.make("10000000"),
				amount: BigNumber.make("1300000000"),
			},
			serialized: Buffer.from("1234", "hex"),
			serialize: (options?: Contracts.Crypto.ISerializeOptions): Promise<ByteBuffer | undefined> =>
				Promise.resolve(undefined),
			deserialize: (buf: ByteBuffer): Promise<void> => Promise.resolve(undefined),
			hasVendorField: () => false,
		};

		const store = new TransactionStore(100);
		store.push(transaction.data);

		assert.equal(store.count(), 1);
		assert.equal(store.get("1"), transaction.data);
	});
});
