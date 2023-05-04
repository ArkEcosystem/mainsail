import { Contracts, Identifiers } from "@mainsail/contracts";
import { describe, Sandbox } from "../../core-test-framework";

import { TransactionBroadcaster } from "./transaction-broadcaster";

describe<{
	sandbox: Sandbox;
	transactionBroadcaster: TransactionBroadcaster;
}>("TransactionBroadcaster", ({ it, assert, beforeEach, stub }) => {
	const logger = { debug: () => {}, warning: () => {} };
	const configuration = { getRequired: () => {} };
	const repository = { getPeers: () => {} };
	const communicator = { postTransactions: () => {} };
	const serializer = { serialize: () => {} };

	beforeEach((context) => {
		context.sandbox = new Sandbox();

		context.sandbox.app.bind(Identifiers.LogService).toConstantValue(logger);
		context.sandbox.app.bind(Identifiers.PluginConfiguration).toConstantValue(configuration);
		context.sandbox.app.bind(Identifiers.PeerRepository).toConstantValue(repository);
		context.sandbox.app.bind(Identifiers.PeerCommunicator).toConstantValue(communicator);
		context.sandbox.app.bind(Identifiers.Cryptography.Transaction.Serializer).toConstantValue(serializer);

		context.transactionBroadcaster = context.sandbox.app.resolve(TransactionBroadcaster);
	});

	it("#broadcastTransactions - should warn when attempting to broadcast empty array", async ({
		transactionBroadcaster,
	}) => {
		const spyLoggerWarning = stub(logger, "warning");
		const spyCommunicatorPostTransactions = stub(communicator, "postTransactions");

		await transactionBroadcaster.broadcastTransactions([]);

		spyLoggerWarning.calledOnce();
		spyLoggerWarning.calledWith("Broadcasting 0 transactions");
		spyCommunicatorPostTransactions.neverCalled();
	});

	it("#broadcastTransactions - should broadcast transaction to peers", async ({ transactionBroadcaster }) => {
		const peers = [{}, {}, {}];
		const transactions = [{}];

		const spyLoggerWarning = stub(logger, "warning");
		const spyLoggerDebug = stub(logger, "debug");
		const spyCommunicatorPostTransactions = stub(communicator, "postTransactions");
		const spyConfigurationGetRequired = stub(configuration, "getRequired").returnValue(3);
		const spyRepositoryGetPeers = stub(repository, "getPeers").returnValue(peers);
		const spySerialzierSerialzie = stub(serializer, "serialize").returnValue(Buffer.from(""));

		await transactionBroadcaster.broadcastTransactions(transactions as Contracts.Crypto.ITransaction[]);

		spyLoggerWarning.neverCalled();
		spyLoggerDebug.calledWith("Broadcasting 1 transaction to 3 peers");
		spyRepositoryGetPeers.calledOnce();
		spySerialzierSerialzie.calledOnce();
		spyConfigurationGetRequired.calledWith("maxPeersBroadcast");
		spyCommunicatorPostTransactions.calledTimes(3);
	});
});
