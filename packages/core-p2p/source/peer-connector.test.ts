import { Contracts, Identifiers } from "@mainsail/contracts";
import { describe, Sandbox } from "../../core-test-framework";
import rewiremock from "rewiremock";

import { Peer } from "./peer";
import { PeerConnector } from "./peer-connector";

let onDelay = (timeout: number) => {};

describe<{
	sandbox: Sandbox;
	peerConnector: PeerConnector;
}>("PeerConnector", ({ it, assert, beforeEach, stub, spy, spyFn }) => {
	class ClientMock {
		static onConstructor = (...arguments_) => {};

		constructor(...arguments_) {
			ClientMock.onConstructor(...arguments_);
		}
		async connect() {}
		async request() {}
		async terminate() {}
	}

	const { PeerConnector: PeerConnectorProxy } = rewiremock.proxy<{
		PeerConnector: Contracts.Types.Class<PeerConnector>;
	}>("./peer-connector", {
		"./hapi-nes": {
			Client: ClientMock,
		},
		delay: async (timeout: number) => {
			onDelay(timeout);
		},
	});

	const logger = { debug: () => {}, error: () => {}, info: () => {}, warning: () => {} };
	beforeEach((context) => {
		onDelay = () => {};
		ClientMock.onConstructor = () => {};

		context.sandbox = new Sandbox();

		context.sandbox.app.bind(Identifiers.LogService).toConstantValue(logger);

		context.peerConnector = context.sandbox.app.resolve(PeerConnectorProxy);
	});

	it("#all - should return a empty array when there are no connections", ({ peerConnector }) => {
		assert.length(peerConnector.all(), 0);
	});

	it("#all - should return the connections", async ({ peerConnector }) => {
		const peers = [new Peer("178.165.55.44", 4000), new Peer("178.165.55.33", 4000)];
		await peerConnector.connect(peers[0]);
		await peerConnector.connect(peers[1]);

		assert.length(peerConnector.all(), 2);
	});

	it("#connection - should return the connection", async ({ peerConnector }) => {
		const peers = [
			new Peer("178.165.55.44", 4000),
			new Peer("178.165.55.33", 4000),
			new Peer("2001:3984:3989::104", 4000),
		];
		await peerConnector.connect(peers[0]);
		await peerConnector.connect(peers[1]);
		await peerConnector.connect(peers[2]);

		assert.instance(peerConnector.connection(peers[0]), ClientMock);
		assert.instance(peerConnector.connection(peers[1]), ClientMock);
		assert.instance(peerConnector.connection(peers[2]), ClientMock);
	});

	it("#connection - should return undefined if there is no connection", async ({ peerConnector }) => {
		const peerNotAdded = new Peer("178.0.0.0", 4000);
		assert.undefined(peerConnector.connection(peerNotAdded));
	});

	it("#connect - should set the connection in the connections and return it", async ({ peerConnector }) => {
		const spyClientConstructor = spyFn();
		ClientMock.onConstructor = (...arguments_) => spyClientConstructor.call(...arguments_);

		const peer = new Peer("178.165.55.11", 4000);
		const peerConnection = await peerConnector.connect(peer);

		spyClientConstructor.calledOnce();
		spyClientConstructor.calledWith("ws://178.165.55.11:4000", { timeout: 10_000 });
		assert.instance(peerConnection, ClientMock);
	});

	it("#connect - should set the connection with brackets IPv6", async ({ peerConnector }) => {
		const spyClientConstructor = spyFn();
		ClientMock.onConstructor = (...arguments_) => spyClientConstructor.call(...arguments_);

		const peer = new Peer("2001:3984:3989::104", 4000);
		const peerConnection = await peerConnector.connect(peer);

		spyClientConstructor.calledOnce();
		spyClientConstructor.calledWith("ws://[2001:3984:3989::104]:4000", { timeout: 10_000 });
		assert.instance(peerConnection, ClientMock);
	});

	it.skip("#connect - should log and remove if error on connection", async ({ peerConnector }) => {
		const spyLoggerDebug = spy(logger, "debug");

		const peer = new Peer("178.165.55.11", 4000);
		const peerConnection = await peerConnector.connect(peer);

		peerConnection.onError(new Error("dummy"));

		spyLoggerDebug.calledOnce();
		assert.instance(peerConnection, ClientMock);
	});

	it.skip("#connect - should delay connection create if re-connecting within 10 seconds", async ({
		peerConnector,
	}) => {
		const spyDelay = spyFn();
		onDelay = (timeout) => {
			spyDelay.call(timeout);
		};

		const peer = new Peer("178.165.55.11", 4000);
		await peerConnector.connect(peer);
		peerConnector.disconnect(peer);
		await peerConnector.connect(peer);

		spyDelay.calledOnce();
		assert.gte(spyDelay.getCallArgs(0)[0], 9000);
	});

	it.skip("#disconnect - should call terminate on the connection and forget it", async ({ peerConnector }) => {
		const peer = new Peer("178.165.55.11", 4000);
		const peerConnection = await peerConnector.connect(peer);
		const spyTerminate = spy(peerConnection, "terminate");

		assert.instance(peerConnector.connection(peer), ClientMock);

		peerConnector.disconnect(peer);
		assert.undefined(peerConnector.connection(peer));
		spyTerminate.calledOnce();
	});

	it("#disconnect - should not do anything if the peer is not defined", async ({ peerConnector }) => {
		const peer = new Peer("178.165.0.0", 4000);

		assert.undefined(peerConnector.connection(peer));

		peerConnector.disconnect(peer);
		assert.undefined(peerConnector.connection(peer));
	});

	it("#emit - should connect to the peer and call connection.request", async ({ peerConnector }) => {
		const peer = new Peer("178.165.11.12", 4000);

		const peerConnection = await peerConnector.connect(peer);

		const mockResponse = { payload: "mock payload" };
		const spyRequest = stub(peerConnection, "request").returnValue(mockResponse);

		const response = await peerConnector.emit(peer, "p2p.peer.getStatus", {});

		spyRequest.calledOnce();
		assert.equal(response, mockResponse);
	});

	it("#getError - should return the error set for the peer", ({ peerConnector }) => {
		const peer = new Peer("178.165.11.12", 4000);

		const peerError = `some random error for the peer ${peer.ip}`;
		peerConnector.setError(peer, peerError);

		assert.equal(peerConnector.getError(peer), peerError);
	});

	it("#getError - should return undefined when the peer has no error set", ({ peerConnector }) => {
		const peer = new Peer("178.165.11.12", 4000);

		assert.undefined(peerConnector.getError(peer));
	});

	it("#setError - should set the error for the peer", ({ peerConnector }) => {
		const peer = new Peer("178.165.11.12", 4000);

		const peerError = `some random error for the peer ${peer.ip}`;
		peerConnector.setError(peer, peerError);

		assert.equal(peerConnector.getError(peer), peerError);
	});

	it("#hasError - should return true if the peer has the error specified set", ({ peerConnector }) => {
		const peer = new Peer("178.165.11.12", 4000);

		const peerError = `some random error for the peer ${peer.ip}`;
		peerConnector.setError(peer, peerError);

		assert.true(peerConnector.hasError(peer, peerError));
	});

	it("#hasError - should return false if the peer has not the error specified set", ({ peerConnector }) => {
		const peer = new Peer("178.165.11.12", 4000);

		const peerError = `some random error for the peer ${peer.ip}`;
		peerConnector.setError(peer, peerError);

		assert.false(peerConnector.hasError(peer, "a different error"));
	});

	it("#hasError - should return false if the peer has no error", ({ peerConnector }) => {
		const peer = new Peer("178.165.11.12", 4000);

		const peerError = `some random error for the peer ${peer.ip}`;

		assert.false(peerConnector.hasError(peer, peerError));
	});

	it("#forgetError - should forget the error set for the peer", ({ peerConnector }) => {
		const peer = new Peer("178.165.11.12", 4000);

		const peerError = `some random error for the peer ${peer.ip}`;
		peerConnector.setError(peer, peerError);

		assert.equal(peerConnector.getError(peer), peerError);

		peerConnector.forgetError(peer);
		assert.undefined(peerConnector.getError(peer));
	});
});
