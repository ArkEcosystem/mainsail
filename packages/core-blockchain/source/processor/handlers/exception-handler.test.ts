import { Container } from "@arkecosystem/core-container";
import { Contracts, Identifiers } from "@arkecosystem/core-contracts";

import { describe } from "../../../../core-test-framework";
import { BlockProcessorResult } from "../contracts";
import { AcceptBlockHandler } from "./accept-block-handler";
import { ExceptionHandler } from "./exception-handler";

describe<{
	container: Container;
	blockchain: any;
	application: any;
	logger: any;
	databaseService: any;
}>("ExceptionHandler", ({ assert, beforeEach, it, spy, stub }) => {
	beforeEach((context) => {
		context.container = new Container();

		context.logger = {
			debug: () => {},
			info: () => {},
			warning: () => {},
		};
		context.blockchain = {
			getLastBlock: () => {},
			resetLastDownloadedBlock: () => {},
		};
		context.databaseService = {
			getBlock: () => {},
		};
		context.application = {
			resolve: () => {},
		};

		context.container.bind(Identifiers.Application).toConstantValue(context.application);
		context.container.bind(Identifiers.BlockchainService).toConstantValue(context.blockchain);
		context.container.bind(Identifiers.LogService).toConstantValue(context.logger);
		context.container.bind(Identifiers.Database.Service).toConstantValue(context.databaseService);
	});

	const block = { data: { height: 4445, id: "123" } };

	it("should return Rejected and resetLastDownloadedBlock if block is already forged", async (context) => {
		const exceptionHandler = context.container.resolve<ExceptionHandler>(ExceptionHandler);

		stub(context.databaseService, "getBlock").returnValue(block);
		const resetLastDownloadedBlockSpy = spy(context.blockchain, "resetLastDownloadedBlock");

		const result = await exceptionHandler.execute(block as Contracts.Crypto.IBlock);

		assert.equal(result, BlockProcessorResult.Rejected);
		resetLastDownloadedBlockSpy.calledOnce();
	});

	it("should return Rejected and resetLastDownloadedBlock if block height it not sequential", async (context) => {
		const exceptionHandler = context.container.resolve<ExceptionHandler>(ExceptionHandler);

		stub(context.blockchain, "getLastBlock").returnValue({ data: { height: 3333, id: "122" } });
		const resetLastDownloadedBlockSpy = spy(context.blockchain, "resetLastDownloadedBlock");

		const result = await exceptionHandler.execute(block as Contracts.Crypto.IBlock);

		assert.equal(result, BlockProcessorResult.Rejected);
		resetLastDownloadedBlockSpy.calledOnce();
	});

	it("should call AcceptHandler if block is not forged yet and height is sequential", async (context) => {
		const exceptionHandler = context.container.resolve<ExceptionHandler>(ExceptionHandler);

		stub(context.blockchain, "getLastBlock").returnValue({ data: { height: 4444, id: "122" } });
		const resolveStub = stub(context.application, "resolve").returnValue({
			execute: () => BlockProcessorResult.Accepted,
		});

		const result = await exceptionHandler.execute(block as Contracts.Crypto.IBlock);

		assert.equal(result, BlockProcessorResult.Accepted);
		resolveStub.calledOnce();
		resolveStub.calledWith(AcceptBlockHandler);
	});
});
