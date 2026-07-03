import { describe } from "@mainsail/test-runner";

import { TransactionResource } from "./transaction";

describe<{
	resource: TransactionResource;
}>("TransactionResource", ({ it, assert, beforeEach }) => {
	const data = {
		data: "",
		from: `0x${"1".repeat(40)}`,
		gasLimit: 21_000,
		gasPrice: 5,
		hash: "a".repeat(64),
		network: 30,
		nonce: 3n,
		r: "r".repeat(64),
		s: "s".repeat(64),
		senderPublicKey: "03287bfebba4c7881a0509717e71b34b63f31e40021c321f89ae04f84be6d6ac37",
		to: `0x${"2".repeat(40)}`,
		v: 1,
		value: 100_000n,
	};

	const transaction = {
		...data,
		serialized: Buffer.from("deadbeef", "hex"),
		toData: () => data,
	};

	beforeEach((context) => {
		context.resource = new TransactionResource();
	});

	it("#raw - returns the transaction data", ({ resource }) => {
		assert.equal(resource.raw(transaction as any), data);
	});

	it("#transform - returns json-safe transaction data", async ({ resource }) => {
		const transformed: any = await resource.transform(transaction as any);

		assert.equal(transformed, { ...data, nonce: "3", value: "100000" });
		assert.string(transformed.nonce);
		assert.string(transformed.value);
		assert.false("serialized" in transformed);
		assert.false("toData" in transformed);
	});
});
