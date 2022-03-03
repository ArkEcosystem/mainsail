import { Container } from "@arkecosystem/core-container";
import { Blocks, Utils } from "@arkecosystem/crypto";

import { describe } from "../../core-test-framework";
import block1760000 from "../test/fixtures/block1760000";
import { ModelConverter } from "./model-converter";

describe<{
	container: Container.Container;
}>("ModelConverter", ({ assert, beforeEach, it }) => {
	beforeEach((context) => {
		context.container = new Container();
	});

	it("getTransactionData should convert transaction to model and back to data", (context) => {
		const modelConverter = context.container.resolve(ModelConverter);
		const transaction = Blocks.BlockFactory.fromData(block1760000).transactions[0];
		const models = modelConverter.getTransactionModels([transaction]);
		models[0].nonce = Utils.BigNumber.make("1"); // set_row_nonce trigger
		const data = modelConverter.getTransactionData(models);

		assert.equal(data, [
			{
				...transaction.data,
				nonce: Utils.BigNumber.make("1"),
			},
		]);
	});

	it("getBlockData should convert block to model and back to data", (context) => {
		const modelConverter = context.container.resolve(ModelConverter);
		const block = Blocks.BlockFactory.fromData(block1760000);
		const models = modelConverter.getBlockModels([block]);
		const data = modelConverter.getBlockData(models);

		assert.equal(
			data.map((item) => ({ ...item })),
			[block.data],
		);
	});
});
