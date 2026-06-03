import type { Contracts } from "@mainsail/contracts";

import { Identifiers } from "@mainsail/constants";
import { Application } from "@mainsail/kernel";

import { describe } from "@mainsail/test-runner";
import { Broadcaster } from "./broadcaster";

describe<{
	app: Application;
	broadcaster: Broadcaster;
}>("Broadcaster", ({ it, assert, beforeEach, stub }) => {
	const configuration = { getRequired: () => {} };
	const repository = { getPeers: () => {} };
	const communicator = { postTransactions: () => {} };

	const transactions = [{}] as Contracts.Crypto.Transaction[];

	const makePeers = (count: number) => Array.from({ length: count }, (_, index) => ({ ip: `1.1.1.${index}` }));

	beforeEach((context) => {
		context.app = new Application();

		context.app
			.bind(Identifiers.ServiceProvider.Configuration)
			.toConstantValue(configuration)
			.whenTagged("plugin", "transaction-pool-broadcaster");
		context.app.bind(Identifiers.TransactionPool.Peer.Repository).toConstantValue(repository);
		context.app.bind(Identifiers.TransactionPool.Peer.Communicator).toConstantValue(communicator);

		context.broadcaster = context.app.resolve(Broadcaster);
	});

	it("#broadcastTransactions - should broadcast to at most maxPeersBroadcast peers", async ({ broadcaster }) => {
		stub(configuration, "getRequired").returnValue(3);
		stub(repository, "getPeers").returnValue(makePeers(5));
		const spyPost = stub(communicator, "postTransactions");

		await broadcaster.broadcastTransactions(transactions);

		spyPost.calledTimes(3);
	});

	it("#broadcastTransactions - should broadcast to all peers when fewer than maxPeersBroadcast", async ({
		broadcaster,
	}) => {
		stub(configuration, "getRequired").returnValue(3);
		stub(repository, "getPeers").returnValue(makePeers(2));
		const spyPost = stub(communicator, "postTransactions");

		await broadcaster.broadcastTransactions(transactions);

		spyPost.calledTimes(2);
	});

	it("#broadcastTransactions - should not broadcast when maxPeersBroadcast is 0", async ({ broadcaster }) => {
		stub(configuration, "getRequired").returnValue(0);
		stub(repository, "getPeers").returnValue(makePeers(5));
		const spyPost = stub(communicator, "postTransactions");

		await broadcaster.broadcastTransactions(transactions);

		spyPost.neverCalled();
	});

	it("#broadcastTransactions - should not broadcast when there are no peers", async ({ broadcaster }) => {
		stub(configuration, "getRequired").returnValue(3);
		stub(repository, "getPeers").returnValue([]);
		const spyPost = stub(communicator, "postTransactions");

		await broadcaster.broadcastTransactions(transactions);

		spyPost.neverCalled();
	});

	it("#broadcastTransactions - should forward the transactions to each selected peer", async ({ broadcaster }) => {
		stub(configuration, "getRequired").returnValue(3);
		stub(repository, "getPeers").returnValue(makePeers(1));
		const spyPost = stub(communicator, "postTransactions");

		await broadcaster.broadcastTransactions(transactions);

		spyPost.calledOnce();
		spyPost.calledWith({ ip: "1.1.1.0" }, transactions);
	});
});
