import type { Contracts } from "@mainsail/contracts";

import { Identifiers } from "@mainsail/constants";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";
import esmock from "esmock";

import { PeerConnector } from "./peer-connector";

type Deferred = { promise: Promise<void>; resolve: () => void; reject: (error: Error) => void };

const deferred = (): Deferred => {
	let resolve!: () => void;
	let reject!: (error: Error) => void;
	const promise = new Promise<void>((res, rej) => {
		resolve = res;
		reject = rej;
	});

	return { promise, reject, resolve };
};

class ClientMock {
	static instances: ClientMock[] = [];
	static connectImpl: (client: ClientMock) => Promise<void> = async () => {};

	public onDisconnect: (...arguments_: unknown[]) => void = () => {};
	public onError: (error: Error) => void = () => {};
	public connectOptions: unknown;
	public timeout: number | undefined;
	public terminated = 0;

	public constructor(
		public readonly url: string,
		public readonly options: unknown,
	) {
		ClientMock.instances.push(this);
	}

	public connect(options: unknown): Promise<void> {
		this.connectOptions = options;
		return ClientMock.connectImpl(this);
	}

	public async request(): Promise<{ payload: Buffer }> {
		return { payload: Buffer.from("response") };
	}

	public setTimeout(timeout: number): void {
		this.timeout = timeout;
	}

	public async terminate(): Promise<void> {
		this.terminated++;
	}
}

let delayCalls: number[] = [];

const { PeerConnector: PeerConnectorProxy } = await esmock("./peer-connector", {
	"./hapi-nes": {
		Client: ClientMock,
	},
	delay: async (timeout: number) => {
		delayCalls.push(timeout);
	},
});

describe<{
	app: Application;
	peerConnector: PeerConnector;
	peerDisposer: { banPeer: (ip: string, error: Error) => void; disposePeer: (ip: string) => void };
}>("PeerConnector", ({ it, assert, beforeEach, spy }) => {
	const logger = { debug: () => {}, error: () => {}, info: () => {}, warn: () => {} };
	const peer = { ip: "178.165.55.11", port: 4000 } as Contracts.P2P.Peer;

	beforeEach((context) => {
		ClientMock.instances = [];
		ClientMock.connectImpl = async () => {};
		delayCalls = [];

		context.peerDisposer = { banPeer: () => {}, disposePeer: () => {} };

		context.app = new Application();
		context.app.bind(Identifiers.P2P.Logger).toConstantValue(logger);
		context.app.bind(Identifiers.P2P.Peer.Disposer).toConstantValue(context.peerDisposer);

		context.peerConnector = context.app.resolve(PeerConnectorProxy);
	});

	it("#connect - should create a client, connect it without reconnect and reuse it", async ({ peerConnector }) => {
		const connection = await peerConnector.connect(peer);

		assert.length(ClientMock.instances, 1);
		assert.equal(ClientMock.instances[0].url, "ws://178.165.55.11:4000");
		assert.equal(ClientMock.instances[0].options, { timeout: 10_000 });
		assert.equal(ClientMock.instances[0].connectOptions, { reconnect: false });

		assert.equal(await peerConnector.connect(peer), connection);
		assert.length(ClientMock.instances, 1);
	});

	it("#connect - should bracket IPv6 addresses", async ({ peerConnector }) => {
		await peerConnector.connect({ ip: "2001:3984:3989::104", port: 4000 } as Contracts.P2P.Peer);

		assert.equal(ClientMock.instances[0].url, "ws://[2001:3984:3989::104]:4000");
	});

	it("#connect - should share one in-flight creation between concurrent callers", async ({ peerConnector }) => {
		const connecting = deferred();
		ClientMock.connectImpl = () => connecting.promise;

		const first = peerConnector.connect(peer);
		const second = peerConnector.connect(peer);

		connecting.resolve();

		assert.equal(await first, await second);
		assert.length(ClientMock.instances, 1);
	});

	it("#connect - should not keep a client whose connect failed", async ({ peerConnector }) => {
		ClientMock.connectImpl = async () => {
			throw new Error("refused");
		};

		await assert.rejects(() => peerConnector.connect(peer), "refused");

		assert.length(ClientMock.instances, 1);

		ClientMock.connectImpl = async () => {};
		const connection = await peerConnector.connect(peer);

		assert.length(ClientMock.instances, 2);
		assert.equal(connection, ClientMock.instances[1]);
	});

	it("#connect - should delay re-creation within ten seconds of the previous one", async ({ peerConnector }) => {
		await peerConnector.connect(peer);
		await peerConnector.disconnect(peer.ip);
		await peerConnector.connect(peer);

		assert.length(delayCalls, 2);
		assert.equal(delayCalls[0], 0);
		assert.gte(delayCalls[1], 9000);
		assert.length(ClientMock.instances, 2);
	});

	it("#disconnect - should terminate and forget the connection", async ({ peerConnector }) => {
		const connection = await peerConnector.connect(peer);

		await peerConnector.disconnect(peer.ip);

		assert.equal(ClientMock.instances[0].terminated, 1);
		assert.not.equal(await peerConnector.connect(peer), connection);
	});

	it("#disconnect - should terminate a connection that is still being created", async ({ peerConnector }) => {
		const connecting = deferred();
		ClientMock.connectImpl = () => connecting.promise;

		const connectPromise = peerConnector.connect(peer);
		const disconnectPromise = peerConnector.disconnect(peer.ip);

		connecting.resolve();
		const connection = await connectPromise;
		await disconnectPromise;

		assert.equal(connection.terminated, 1);
		assert.not.equal(await peerConnector.connect(peer), connection);
		assert.length(ClientMock.instances, 2);
	});

	it("#disconnect - should ignore a creation that fails", async ({ peerConnector }) => {
		const connecting = deferred();
		ClientMock.connectImpl = () => connecting.promise;

		const connectPromise = peerConnector.connect(peer);
		const disconnectPromise = peerConnector.disconnect(peer.ip);

		connecting.reject(new Error("refused"));

		await assert.rejects(() => connectPromise, "refused");
		await assert.resolves(() => disconnectPromise);
	});

	it("#disconnect - should do nothing for an unknown peer", async ({ peerConnector }) => {
		await peerConnector.disconnect(peer.ip);

		assert.length(ClientMock.instances, 0);
	});

	it("#emit - should connect, set the timeout and send the request", async ({ peerConnector }) => {
		const connection = await peerConnector.connect(peer);
		const request = spy(connection, "request");

		const payload = Buffer.from("payload");
		const response = await peerConnector.emit(peer, "getStatus", payload, 5000);

		request.calledOnce();
		request.calledWith({ headers: {}, method: "POST", path: "getStatus", payload });
		assert.equal(connection.timeout, 5000);
		assert.equal(response.payload, Buffer.from("response"));
	});

	it("should dispose the peer when the client disconnects and ban it on client errors", async ({
		peerConnector,
		peerDisposer,
	}) => {
		const disposePeer = spy(peerDisposer, "disposePeer");
		const banPeer = spy(peerDisposer, "banPeer");

		const connection = await peerConnector.connect(peer);

		connection.onDisconnect();
		disposePeer.calledOnce();
		disposePeer.calledWith(peer.ip);

		const error = new Error("boom");
		connection.onError(error);
		banPeer.calledOnce();
		banPeer.calledWith(peer.ip, error);
	});
});
