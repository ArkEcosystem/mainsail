import { Container } from "@arkecosystem/core-kernel";
import { Interfaces } from "@arkecosystem/crypto";
import { describe } from "../../../../core-test-framework";

import { BlockProcessorResult } from "../contracts";
import { AcceptBlockHandler } from "./accept-block-handler";
import { ExceptionHandler } from "./exception-handler";

describe<{
	container: Container.Container;
	blockchain: any;
	application: any;
	logger: any;
	databaseInterceptor: any;
}>("ExceptionHandler", ({ assert, beforeEach, it, spy, stub }) => {
	beforeEach((context) => {
		context.container = new Container.Container();

		context.logger = {
			warning: () => undefined,
			debug: () => undefined,
			info: () => undefined,
		};
		context.blockchain = {
			resetLastDownloadedBlock: () => undefined,
			getLastBlock: () => undefined,
		};
		context.databaseInterceptor = {
			getBlock: () => undefined,
		};
		context.application = {
			resolve: () => undefined,
		};

		context.container.bind(Container.Identifiers.Application).toConstantValue(context.application);
		context.container.bind(Container.Identifiers.BlockchainService).toConstantValue(context.blockchain);
		context.container.bind(Container.Identifiers.LogService).toConstantValue(context.logger);
		context.container.bind(Container.Identifiers.DatabaseInterceptor).toConstantValue(context.databaseInterceptor);
	});

	const block = { data: { id: "123", height: 4445 } };

	it("should return Rejected and resetLastDownloadedBlock if block is already forged", async (context) => {
		const exceptionHandler = context.container.resolve<ExceptionHandler>(ExceptionHandler);

		stub(context.databaseInterceptor, "getBlock").returnValue(block);
		const resetLastDownloadedBlockSpy = spy(context.blockchain, "resetLastDownloadedBlock");

		const result = await exceptionHandler.execute(block as Interfaces.IBlock);

		assert.equal(result, BlockProcessorResult.Rejected);
		resetLastDownloadedBlockSpy.calledOnce();
	});

	it("should return Rejected and resetLastDownloadedBlock if block height it not sequential", async (context) => {
		const exceptionHandler = context.container.resolve<ExceptionHandler>(ExceptionHandler);

		stub(context.blockchain, "getLastBlock").returnValue({ data: { id: "122", height: 3333 } });
		const resetLastDownloadedBlockSpy = spy(context.blockchain, "resetLastDownloadedBlock");

		const result = await exceptionHandler.execute(block as Interfaces.IBlock);

		assert.equal(result, BlockProcessorResult.Rejected);
		resetLastDownloadedBlockSpy.calledOnce();
	});

	it("should call AcceptHandler if block is not forged yet and height is sequential", async (context) => {
		const exceptionHandler = context.container.resolve<ExceptionHandler>(ExceptionHandler);

		stub(context.blockchain, "getLastBlock").returnValue({ data: { id: "122", height: 4444 } });
		const resolveStub = stub(context.application, "resolve").returnValue({
			execute: () => BlockProcessorResult.Accepted,
		});

		const result = await exceptionHandler.execute(block as Interfaces.IBlock);

		assert.equal(result, BlockProcessorResult.Accepted);
		resolveStub.calledOnce();
		resolveStub.calledWith(AcceptBlockHandler);
	});
});
