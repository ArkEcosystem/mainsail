import type { TransactionBuilder } from "@mainsail/crypto-transaction";
import { cloneDeep } from "@mainsail/utils";

import crypto from "../../core/bin/config/devnet/core/crypto.json";
import { describe } from "@mainsail/test-runner";
import { Factories } from "../../test-factories/source/index.js";
import { blockData } from "../test/fixtures/block";
import { Block } from "./block";
import { assertBlockData } from "../test/helpers/asserts.js";

describe<{}>("Block", ({ it, assert }) => {
	it("#should create new block", async () => {
		const transactionFactory = await Factories.factory<TransactionBuilder>("Transfer", crypto);

		const transactionBuilder1 = await transactionFactory.withStates("sign").make();
		const transactionBuilder2 = await transactionFactory.withOptions({ nonce: 1 }).withStates("sign").make();

		const transaction1 = await transactionBuilder1.build();
		const transaction2 = await transactionBuilder2.build();

		const indexedTransaction1 = cloneDeep(transaction1).toData();
		const indexedTransaction2 = cloneDeep(transaction2).toData();

		const block = new Block({
			data: blockData,
			serialized: "serialized_content",
			transactions: [transaction1, transaction2],
		});

		assertBlockData(assert, block, blockData);
		assert.equal(block.serialized, "serialized_content");
		assert.equal(
			block.transactions.map((tx) => ({ ...tx.toData() })),
			[indexedTransaction1, indexedTransaction2],
		);

		assert.equal(block.toData(), { ...blockData, transactions: [indexedTransaction1, indexedTransaction2] });
	});
});
