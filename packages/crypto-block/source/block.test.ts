import type { TransactionBuilder } from "@mainsail/crypto-transaction";
import clone from "lodash.clone";

import crypto from "../../core/bin/config/devnet/core/crypto.json";
import { describe } from "@mainsail/test-framework";
import { Factories } from "../../test-factories/source/index.js";
import { blockData } from "../test/fixtures/block";
import { sealBlock } from "./block";

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

		const { transactions: _, ...blockHeader } = blockData;

		const block = sealBlock({
			data: blockData,
			serialized: "serialized_content",
			transactions: [transaction1, transaction2],
		});

		assert.true(Object.isSealed(block));
		assert.equal(block.data, blockData);
		assert.equal(block.header, blockHeader);
		assert.defined(block.data.transactions);
		assert.undefined(block.header.transactions);
		assert.equal(block.serialized, "serialized_content");
		assert.equal(block.transactions, [indexedTransaction1, indexedTransaction2]);
	});
});
