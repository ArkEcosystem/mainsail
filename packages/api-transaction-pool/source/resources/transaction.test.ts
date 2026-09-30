import { describe } from "@mainsail/test-runner";

import { makeTransaction } from "../../test/fixtures/transactions";
import { TransactionResource } from "./transaction";

describe<{
	resource: TransactionResource;
}>("TransactionResource", ({ it, assert, beforeEach }) => {
	const transaction = makeTransaction(1);

	beforeEach((context) => {
		context.resource = new TransactionResource();
	});

	it("#raw - returns the transaction data", ({ resource }) => {
		assert.equal(resource.raw(transaction as any), transaction.toData());
	});

	it("#transform - returns json-safe transaction data", async ({ resource }) => {
		const transformed: any = await resource.transform(transaction as any);

		assert.equal(transformed, { ...transaction.toData(), nonce: "1", value: "100000" });
		assert.string(transformed.nonce);
		assert.string(transformed.value);
		assert.false("serialized" in transformed);
		assert.false("toData" in transformed);
	});
});
