import { Contracts, Exceptions, Identifiers } from "@arkecosystem/core-contracts";
import { Providers } from "@arkecosystem/core-kernel";
import { describe, Sandbox } from "../../core-test-framework";
import rewiremock from "rewiremock";

import { defaults } from "./defaults";
import { Routes } from "./enums";
import { Peer } from "./peer";
import { PeerCommunicator } from "./peer-communicator";

describe<{
	sandbox: Sandbox;
	peerCommunicator: PeerCommunicator;
}>("PeerCommunicator", ({ it, assert, beforeEach, stub, spy, spyFn, match, each }) => {
	const codec = { request: { serialize: (item) => item }, response: { deserialize: (item) => item } };

	const { PeerCommunicator: PeerCommunicatorProxy } = rewiremock.proxy<{
		PeerCommunicator: Contracts.Types.Class<PeerCommunicator>;
	}>("./peer-communicator", {
		"./socket-server/codecs": {
			Codecs: {
				[Routes.GetBlocks]: codec,
				[Routes.GetCommonBlocks]: codec,
				[Routes.GetPeers]: codec,
				[Routes.GetStatus]: codec,
				[Routes.PostBlock]: codec,
				[Routes.PostTransactions]: codec,
			},
		},
	});

	const logger = { debug: () => {}, error: () => {}, info: () => {}, warning: () => {} };
	const eventDispatcher = { dispatch: () => {}, listen: () => {} };
	const connector = { connect: () => {}, emit: () => {}, forgetError: () => {}, setError: () => {} };
	const cryptoConfig = {};
	const serializer = { serializeWithTransactions: () => {} };
	const transactionFactory = {};
	const validator = { validate: () => {} };

	const version = "0.0.1";
	const headers = { version };

	const jobsQueued = [];
	const queue = { push: (job) => jobsQueued.push(job), resolve: () => {}, resume: () => {} };
	const createQueue = () => queue;

	beforeEach((context) => {
		context.sandbox = new Sandbox();

		context.sandbox.app
			.bind(Identifiers.PluginConfiguration)
			.toConstantValue(new Providers.PluginConfiguration().from("", defaults))
			.whenTargetTagged("plugin", "core-p2p");

		context.sandbox.app.bind(Identifiers.ApplicationVersion).toConstantValue("0.0.1");
		context.sandbox.app.bind(Identifiers.LogService).toConstantValue(logger);
		context.sandbox.app.bind(Identifiers.EventDispatcherService).toConstantValue(eventDispatcher);
		context.sandbox.app.bind(Identifiers.PeerConnector).toConstantValue(connector);
		context.sandbox.app.bind(Identifiers.QueueFactory).toConstantValue(createQueue);
		context.sandbox.app.bind(Identifiers.Cryptography.Configuration).toConstantValue(cryptoConfig);
		context.sandbox.app.bind(Identifiers.Cryptography.Block.Serializer).toConstantValue(serializer);
		context.sandbox.app.bind(Identifiers.Cryptography.Transaction.Factory).toConstantValue(transactionFactory);
		context.sandbox.app.bind(Identifiers.Cryptography.Validator).toConstantValue(validator);

		context.peerCommunicator = context.sandbox.app.resolve(PeerCommunicatorProxy);

		process.env.CORE_P2P_PEER_VERIFIER_DEBUG_EXTRA = "true";
	});

	it("#postBlock - should use connector to emit p2p.blocks.postBlock", async ({ peerCommunicator }) => {
		stub(serializer, "serializeWithTransactions").resolvedValue(Buffer.from(""));
		stub(validator, "validate").resolvedValue({});
		const spyConnectorEmit = stub(connector, "emit").resolvedValue({ payload: {} });

		const block = { data: {}, transactions: [] };

		const payload = { block };
		const peer = new Peer("187.168.65.65", 4000);

		await peerCommunicator.postBlock(peer, payload.block);

		spyConnectorEmit.calledOnce();
		spyConnectorEmit.calledWith(peer, Routes.PostBlock, { block: match.any, headers }, 10_000);
	});

	it("should use connector to emit p2p.transactions.postTransactions", async ({ peerCommunicator }) => {
		const payload = { transactions: [] };
		const peer = new Peer("187.168.65.65", 4000);

		stub(validator, "validate").resolvedValue({});
		const spyConnectorEmit = stub(connector, "emit").resolvedValue({ payload: {} });

		await peerCommunicator.postTransactions(peer, payload.transactions);

		await jobsQueued.pop().handle(); // manually trigger the call of last job queued

		spyConnectorEmit.calledOnce();
		spyConnectorEmit.calledWith(peer, Routes.PostTransactions, { headers, transactions: match.any }, 10_000);
	});

	it("#ping - should not call connector emit when peer.recentlyPinged() && !force", async ({ peerCommunicator }) => {
		const peer = new Peer("187.168.65.65", 4000);
		stub(peer, "recentlyPinged").returnValue(true);
		const spyConnectorEmit = spy(connector, "emit");

		await peerCommunicator.ping(peer, 1000, false);

		spyConnectorEmit.neverCalled();
	});

	it("#ping - should throw PeerStatusResponseError when ping response is undefined", async ({ peerCommunicator }) => {
		const peer = new Peer("187.168.65.65", 4000);

		const spyConnectorEmit = spy(connector, "emit");

		await assert.rejects(() => peerCommunicator.ping(peer, 1000), Exceptions.PeerStatusResponseError);

		spyConnectorEmit.calledOnce();
		spyConnectorEmit.calledWith(peer, Routes.GetStatus, { headers }, 1000);
	});

	it("#getPeers - should use connector to emit p2p.peer.getPeers", async ({ peerCommunicator }) => {
		const peer = new Peer("187.168.65.65", 4000);

		stub(validator, "validate").resolvedValue({});

		const mockConnectorResponse = { payload: [{ ip: "177.176.1.1", port: 4000 }] };
		const spyConnectorEmit = stub(connector, "emit").resolvedValue(mockConnectorResponse);

		const getPeersResult = await peerCommunicator.getPeers(peer);

		spyConnectorEmit.calledOnce();
		spyConnectorEmit.calledWith(peer, Routes.GetPeers, { headers }, 5000);
		assert.equal(getPeersResult, mockConnectorResponse.payload);
	});

	it("#getPeers - should return undefined when emit fails", async ({ peerCommunicator }) => {
		const peer = new Peer("187.168.65.65", 4000);

		const error = new Error("oops");
		const spyConnectorEmit = stub(connector, "emit").rejectedValue(error);

		const getPeersResult = await peerCommunicator.getPeers(peer);

		spyConnectorEmit.calledOnce();
		spyConnectorEmit.calledWith(peer, Routes.GetPeers, { headers }, 5000);
		assert.undefined(getPeersResult);
	});

	it("#hasCommonBlocks - should use connector to emit p2p.peer.getCommonBlocks", async ({ peerCommunicator }) => {
		const payload = { ids: ["1234567890"] };
		const peer = new Peer("187.168.65.65", 4000);

		stub(validator, "validate").resolvedValue({});
		const mockConnectorResponse = { payload: { common: { height: 123, id: "1234567890" } } };
		const spyConnectorEmit = stub(connector, "emit").resolvedValue(mockConnectorResponse);

		const hasCommonBlocksResult = await peerCommunicator.hasCommonBlocks(peer, payload.ids, 1000);

		spyConnectorEmit.calledOnce();
		spyConnectorEmit.calledWith(peer, Routes.GetCommonBlocks, { ...payload, headers }, 1000);
		assert.equal(hasCommonBlocksResult, mockConnectorResponse.payload.common);
	});

	it("#hasCommonBlocks - should return false when emit p2p.peer.getCommonBlocks does not return common block", async ({
		peerCommunicator,
	}) => {
		const payload = { ids: ["1234567890"] };
		const peer = new Peer("187.168.65.65", 4000);

		stub(validator, "validate").resolvedValue({});
		const mockConnectorResponse = { payload: { common: undefined } };
		const spyConnectorEmit = stub(connector, "emit").resolvedValue(mockConnectorResponse);

		const hasCommonBlocksResult = await peerCommunicator.hasCommonBlocks(peer, payload.ids, 6000);

		spyConnectorEmit.calledOnce();
		spyConnectorEmit.calledWith(peer, Routes.GetCommonBlocks, { ...payload, headers }, 5000);
		assert.false(hasCommonBlocksResult);
	});

	it("#handleSocketError - should dispatch 'Disconnect' event after 3 sequential error", async ({
		peerCommunicator,
	}) => {
		const peer = new Peer("187.168.65.65", 4000);
		const spyEmitterDispatch = spy(eventDispatcher, "dispatch");

		// @ts-ignore
		peerCommunicator.handleSocketError(peer, "dummy_event", new Error());
		// @ts-ignore
		peerCommunicator.handleSocketError(peer, "dummy_event", new Error());

		spyEmitterDispatch.neverCalled();
		// expect(emitter.dispatch).toHaveBeenCalledTimes(0);

		// @ts-ignore
		peerCommunicator.handleSocketError(peer, "dummy_event", new Error());

		spyEmitterDispatch.calledOnce();
		// expect(emitter.dispatch).toHaveBeenCalledTimes(1);
	});
});
