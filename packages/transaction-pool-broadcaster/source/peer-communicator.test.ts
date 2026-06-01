import type { Contracts } from "@mainsail/contracts";

import { Identifiers } from "@mainsail/constants";
import { Application } from "@mainsail/kernel";
import { http } from "@mainsail/utils";

import { describe } from "@mainsail/test-runner";
import { Peer } from "./peer";
import { PeerCommunicator } from "./peer-communicator";

describe<{
	app: Application;
	peerCommunicator: PeerCommunicator;
	peer: Peer;
}>("PeerCommunicator", ({ it, assert, beforeEach, stub }) => {
	const ip = "167.184.53.78";
	const port = 4007;

	const logger = { debug: () => {} };
	const repository = { forgetPeer: () => {} };
	const configuration = { getRequired: () => {} };

	const transactions = [
		{ serialized: Buffer.from("deadbeef", "hex") },
		{ serialized: Buffer.from("c0ffee", "hex") },
	] as Contracts.Crypto.Transaction[];

	beforeEach((context) => {
		context.app = new Application();

		context.app.bind(Identifiers.Services.Log.Service).toConstantValue(logger);
		context.app.bind(Identifiers.TransactionPool.Peer.Repository).toConstantValue(repository);
		context.app
			.bind(Identifiers.ServiceProvider.Configuration)
			.toConstantValue(configuration)
			.whenTagged("plugin", "transaction-pool-broadcaster");

		context.peerCommunicator = context.app.resolve(PeerCommunicator);
		context.peer = context.app.resolve(Peer).init(ip, port);
	});

	it("#postTransactions - should post serialized transactions to the peer", async ({ peerCommunicator, peer }) => {
		const spyPost = stub(http, "post").resolvedValue({ statusCode: 200 });

		await peerCommunicator.postTransactions(peer, transactions);

		spyPost.calledOnce();
		spyPost.calledWith(`http://${ip}:${port}/api/transactions`, {
			body: { transactions: ["deadbeef", "c0ffee"] },
		});
	});

	it("#postTransactions - should reset errorCount and set lastPinged on success", async ({
		peerCommunicator,
		peer,
	}) => {
		stub(http, "post").resolvedValue({ statusCode: 200 });

		peer.errorCount = 3;

		await peerCommunicator.postTransactions(peer, transactions);

		assert.equal(peer.errorCount, 0);
		assert.defined(peer.lastPinged);
	});

	it("#postTransactions - should increment errorCount and log on failure without forgetting below threshold", async ({
		peerCommunicator,
		peer,
	}) => {
		stub(http, "post").callsFake(() => {
			throw new Error("boom");
		});
		stub(configuration, "getRequired").returnValue(5);
		const spyDebug = stub(logger, "debug");
		const spyForget = stub(repository, "forgetPeer");

		await peerCommunicator.postTransactions(peer, transactions);

		assert.equal(peer.errorCount, 1);
		assert.undefined(peer.lastPinged);
		spyDebug.calledOnce();
		spyForget.neverCalled();
	});

	it("#postTransactions - should forget the peer once maxSequentialErrors is reached", async ({
		peerCommunicator,
		peer,
	}) => {
		stub(http, "post").callsFake(() => {
			throw new Error("boom");
		});
		stub(configuration, "getRequired").returnValue(2);
		const spyForget = stub(repository, "forgetPeer");

		await peerCommunicator.postTransactions(peer, transactions);
		spyForget.neverCalled();

		await peerCommunicator.postTransactions(peer, transactions);

		assert.equal(peer.errorCount, 2);
		spyForget.calledOnce();
		spyForget.calledWith(ip);
	});

	it("#postTransactions - should reset errorCount after a successful retry", async ({ peerCommunicator, peer }) => {
		const spyPost = stub(http, "post");
		stub(configuration, "getRequired").returnValue(5);

		spyPost.callsFakeNth(0, () => {
			throw new Error("boom");
		});
		spyPost.resolvedValueNth(1, { statusCode: 200 });

		await peerCommunicator.postTransactions(peer, transactions);
		assert.equal(peer.errorCount, 1);

		await peerCommunicator.postTransactions(peer, transactions);
		assert.equal(peer.errorCount, 0);
	});
});
