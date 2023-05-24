import { Contracts, Exceptions, Identifiers } from "@mainsail/contracts";
import { Utils } from "@mainsail/kernel";
import { describe, Sandbox } from "../../../../test-framework";
import rewiremock from "rewiremock";

import { PostBlockController } from "./post-block";

const utilsMock = {
	...Utils,
	isBlockChained: () => {},
};

const { PostBlockController: PostBlockControllerProxy } = rewiremock.proxy<{
	PostBlockController: Contracts.Types.Class<PostBlockController>;
}>("./post-block", {
	"@mainsail/kernel": {
		Utils: utilsMock,
	},
});

describe<{
	sandbox: Sandbox;
	controller: PostBlockController;
}>("PostBlockController", ({ it, assert, beforeEach, stub, spy }) => {
	const logger = { info: () => {} };
	const configuration = { getMilestone: () => ({ block: { maxTransactions: 150 } }) };
	const deserializer = { deserialize: () => { }, deserializeHeader: () => { } };
	const blockchain = {
		getLastDownloadedBlock: () => {},
		getLastHeight: () => {},
		handleIncomingBlock: () => {},
		pingBlock: () => {},
	};
	const slots = {};

	beforeEach((context) => {
		context.sandbox = new Sandbox();

		context.sandbox.app.bind(Identifiers.LogService).toConstantValue(logger);
		context.sandbox.app.bind(Identifiers.Cryptography.Configuration).toConstantValue(configuration);
		context.sandbox.app.bind(Identifiers.Cryptography.Block.Deserializer).toConstantValue(deserializer);
		context.sandbox.app.bind(Identifiers.BlockchainService).toConstantValue(blockchain);
		context.sandbox.app.bind(Identifiers.Cryptography.Time.Slots).toConstantValue(slots);

		context.controller = context.sandbox.app.resolve(PostBlockControllerProxy);
	});

	it("should throw TooManyTransactionsError when numberOfTransactions is too much", async ({ controller }) => {
		stub(deserializer, "deserializeHeader").resolvedValue({ numberOfTransactions: 151 });

		await assert.rejects(
			() => controller.handle({ payload: { block: Buffer.from("") } }, {}),
			Exceptions.TooManyTransactionsError,
		);
	});

	it("should return status true if block is pinged", async ({ controller }) => {
		const blockHeader = { numberOfTransactions: 0 };
		stub(deserializer, "deserializeHeader").resolvedValue(blockHeader);
		stub(deserializer, "deserialize").resolvedValue({ data: blockHeader, transactions: [] });
		stub(blockchain, "pingBlock").returnValue(true);
		stub(blockchain, "getLastHeight").returnValue(100);

		assert.equal(await controller.handle({ payload: { block: Buffer.from("") } }, {}), {
			height: 100,
			status: true,
		});
	});

	it("should return status false if block is not chained", async ({ controller }) => {
		const blockHeader = { numberOfTransactions: 0 };
		stub(deserializer, "deserializeHeader").resolvedValue(blockHeader);
		stub(deserializer, "deserialize").resolvedValue({ data: blockHeader, transactions: [] });

		stub(blockchain, "pingBlock").returnValue(false);
		stub(blockchain, "getLastHeight").returnValue(100);
		stub(utilsMock, "isBlockChained").returnValue(false);

		assert.equal(await controller.handle({ payload: { block: Buffer.from("") } }, {}), {
			height: 100,
			status: false,
		});
	});

	it("should return status true and call handleIncommingBlock", async ({ controller }) => {
		const blockHeader = { height: 101, numberOfTransactions: 0 };

		stub(deserializer, "deserializeHeader").resolvedValue(blockHeader);
		stub(deserializer, "deserialize").resolvedValue({ data: blockHeader, transactions: [] });
		stub(blockchain, "pingBlock").returnValue(false);
		stub(blockchain, "getLastHeight").returnValue(100);
		stub(utilsMock, "isBlockChained").returnValue(true);

		const spyHandleIncommingBlock = spy(blockchain, "handleIncomingBlock");

		assert.equal(
			await controller.handle({ payload: { block: Buffer.from("") }, info: { remoteAddress: "127.0.0.1" } }, {}),
			{
				height: 100,
				status: true,
			},
		);
		spyHandleIncommingBlock.calledOnce();
	});
});
