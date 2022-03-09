import { Container } from "@arkecosystem/core-kernel";
import { Worker } from "./worker";
import { Identities, Managers, Transactions } from "@arkecosystem/crypto";
import { describe } from "@arkecosystem/core-test-framework";

describe<{
	container: Container.Container;
	createWorkerSubprocess: any;
}>("Worker", ({ it, assert, beforeAll, beforeEach, spyFn, stubFn }) => {
	beforeAll((context) => {
		context.createWorkerSubprocess = stubFn();

		context.container = new Container.Container();
		context.container
			.bind(Container.Identifiers.TransactionPoolWorkerIpcSubprocessFactory)
			.toConstantValue(context.createWorkerSubprocess);
	});

	beforeEach((context) => {
		context.createWorkerSubprocess.reset();
	});

	it("initialize - should instantiate worker subprocess", (context) => {
		context.container.resolve(Worker);

		assert.true(context.createWorkerSubprocess.called);
	});

	it("getQueueSize - should return queue size from subprocess", (context) => {
		const queueSize = 5;

		const ipcSubprocess = {
			getQueueSize: stubFn().returns(queueSize),
		};

		context.createWorkerSubprocess.onFirstCall().returns(ipcSubprocess);
		const worker = context.container.resolve(Worker);

		const result = worker.getQueueSize();
		assert.equal(result, queueSize);
	});

	it("getTransactionFromData - should send 'getTransactionFromData' request to subprocess", async (context) => {
		Managers.configManager.getMilestone().aip11 = true;

		const transaction = Transactions.BuilderFactory.transfer()
			.version(2)
			.amount("100")
			.recipientId(Identities.Address.fromPassphrase("recipient's secret"))
			.nonce("1")
			.sign("sender's secret")
			.build();

		const ipcSubprocess = {
			sendAction: spyFn(),
			sendRequest: stubFn()
				.onFirstCall()
				.resolves({
					id: transaction.id,
					serialized: transaction.serialized.toString("hex"),
					isVerified: true,
				}),
		};

		context.createWorkerSubprocess.onFirstCall().returns(ipcSubprocess);

		const worker = context.container.resolve(Worker);

		const result = await worker.getTransactionFromData(transaction.data);

		assert.true(ipcSubprocess.sendAction.calledWith("setConfig", Managers.configManager.all()));
		assert.true(ipcSubprocess.sendAction.calledWith("setHeight", Managers.configManager.getHeight()));
		assert.true(ipcSubprocess.sendRequest.calledWith("getTransactionFromData", transaction.data));

		assert.equal(result, transaction);
	});
});
