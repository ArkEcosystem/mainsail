import type { TransactionBuilder } from "@mainsail/crypto-transaction";
import clone from "lodash.clone";

import crypto from "../../core/bin/config/devnet/core/crypto.json";
import { describe } from "@mainsail/test-runner";
import { Factories } from "../../test-factories/source/index.js";
import { blockData } from "../test/fixtures/block";
import { sealBlock } from "./block";
import { assertBlockData } from "../test/helpers/asserts.js";

describe<{}>("Block", ({ it, assert }) => {
	it("#sealBlock - should seal block", async () => {
		const transactionFactory = await Factories.factory<TransactionBuilder>("Transfer", crypto);

		const transactionBuilder1 = await transactionFactory.withStates("sign").make();
		const transactionBuilder2 = await transactionFactory.withOptions({ nonce: 1 }).withStates("sign").make();

		const transaction1 = await transactionBuilder1.build();
		const transaction2 = await transactionBuilder2.build();

		const indexedTransaction1 = clone(transaction1);
		indexedTransaction1.data.transactionIndex = 1;
		const indexedTransaction2 = clone(transaction2);
		indexedTransaction2.data.transactionIndex = 1;

		const block = sealBlock({
			data: blockData,
			serialized: "serialized_content",
			transactions: [transaction1, transaction2],
		});

		assert.true(Object.isSealed(block));
		assertBlockData(assert, block, blockData);
		assert.equal(block.serialized, "serialized_content");
		assert.equal(block.transactions, [indexedTransaction1, indexedTransaction2]);
	});
});
