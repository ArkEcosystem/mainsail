import type { Contracts } from "@mainsail/contracts";

import { Events, Identifiers } from "@mainsail/constants";
import { Application } from "@mainsail/kernel";
import { http } from "@mainsail/utils";
import esmock from "esmock";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";

import { describe } from "@mainsail/test-runner";
import { Peer } from "./peer";
import { PeerCommunicator } from "./peer-communicator";

let emit: (event: string, data: unknown) => void = () => {};

const { PeerCommunicator: PeerCommunicatorProxy } = await esmock("./peer-communicator", {
	"@mainsail/kernel": {
		Ipc: { emit: (event: string, data: unknown) => emit(event, data) },
	},
});

describe<{
	app: Application;
	peerCommunicator: PeerCommunicator;
	peer: Peer;
}>("PeerCommunicator", ({ it, assert, beforeEach, match, stub, spyFn, nock }) => {
	const ip = "167.184.53.78";
	const port = 4007;

	const logger = { debug: () => {} };
	const repository = { forgetPeer: () => {} };
	const config: Record<string, number> = { maxSequentialErrors: 2, postTimeout: 5000 };
	const configuration = { getRequired: (key: string) => config[key] };
	const withConfig = (overrides: Record<string, number>) =>
		stub(configuration, "getRequired").callsFake((key: string) => ({ ...config, ...overrides })[key]);

	const transactions = [
		{ serialized: Buffer.from("deadbeef", "hex") },
		{ serialized: Buffer.from("c0ffee", "hex") },
	] as Contracts.Crypto.Transaction[];

	beforeEach((context) => {
		emit = () => {};

		context.app = new Application();

		context.app.bind(Identifiers.Services.Log.Service).toConstantValue(logger);
		context.app.bind(Identifiers.TransactionPool.Peer.Repository).toConstantValue(repository);
		context.app
			.bind(Identifiers.ServiceProvider.Configuration)
			.toConstantValue(configuration)
			.whenTagged("plugin", "transaction-pool-broadcaster");

		context.peerCommunicator = context.app.resolve(PeerCommunicatorProxy);
		context.peer = context.app.resolve(Peer).init(ip, port);
	});

	it("#postTransactions - should post serialized transactions to the peer", async ({ peerCommunicator, peer }) => {
		const spyPost = stub(http, "post").resolvedValue({ statusCode: 200 });

		await peerCommunicator.postTransactions(peer, transactions);

		spyPost.calledOnce();
		spyPost.calledWith(`http://${ip}:${port}/api/transactions`, {
			body: { transactions: ["deadbeef", "c0ffee"] },
			maxContentLength: 128 * 1024,
			signal: match.instanceOf(AbortSignal),
		});
	});

	it("#postTransactions - should accept a response of 128 KiB", async ({ app, peerCommunicator }) => {
		const server = createServer((request, response) => {
			request.resume();
			request.on("end", () => response.end("x".repeat(128 * 1024)));
		});
		await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
		const peer = app.resolve(Peer).init("127.0.0.1", (server.address() as AddressInfo).port);
		nock.enableNetConnect("127.0.0.1");

		try {
			await peerCommunicator.postTransactions(peer, transactions);
		} finally {
			nock.disableNetConnect();
			server.close();
		}

		assert.equal(peer.errorCount, 0);
		assert.defined(peer.lastPinged);
	});

	it("#postTransactions - should stop reading a response larger than 128 KiB and count it as a failed post", async ({
		app,
		peerCommunicator,
	}) => {
		const server = createServer((request, response) => {
			request.resume();
			request.on("end", () => response.end("x".repeat(128 * 1024 + 1)));
		});
		await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
		const peer = app.resolve(Peer).init("127.0.0.1", (server.address() as AddressInfo).port);
		const spyDebug = stub(logger, "debug");
		nock.enableNetConnect("127.0.0.1");

		try {
			await peerCommunicator.postTransactions(peer, transactions);
		} finally {
			nock.disableNetConnect();
			server.close();
		}

		assert.equal(peer.errorCount, 1);
		spyDebug.calledWith("socket error 127.0.0.1: response too large");
	});

	it("#postTransactions - should give up on a response still arriving after postTimeout and count it as a failed post", async ({
		app,
		peerCommunicator,
	}) => {
		let responseClosed = false;
		const server = createServer((request, response) => {
			request.resume();
			request.on("end", () => {
				const drip = setInterval(() => response.write("x"), 10);
				const end = setTimeout(() => response.end(), 1000);
				response.on("close", () => {
					clearInterval(drip);
					clearTimeout(end);
					responseClosed = true;
				});
			});
		});
		await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
		const peer = app.resolve(Peer).init("127.0.0.1", (server.address() as AddressInfo).port);
		withConfig({ postTimeout: 50 });
		const spyDebug = stub(logger, "debug");
		nock.enableNetConnect("127.0.0.1");

		try {
			await peerCommunicator.postTransactions(peer, transactions);
			await new Promise((resolve) => setTimeout(resolve, 100));
		} finally {
			nock.disableNetConnect();
			server.close();
		}

		assert.equal(peer.errorCount, 1);
		spyDebug.calledWith("socket error 127.0.0.1: The operation was aborted");
		assert.true(responseClosed);
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
		withConfig({ maxSequentialErrors: 5 });
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
		withConfig({ maxSequentialErrors: 2 });
		const spyForget = stub(repository, "forgetPeer");
		const spyEmit = spyFn();
		emit = spyEmit.toFunction();

		await peerCommunicator.postTransactions(peer, transactions);
		spyForget.neverCalled();
		spyEmit.neverCalled();

		await peerCommunicator.postTransactions(peer, transactions);

		assert.equal(peer.errorCount, 2);
		spyForget.calledOnce();
		spyForget.calledWith(ip);
		spyEmit.calledOnce();
		spyEmit.calledWith(Events.PeerEvent.Removed, ip);
	});

	it("#postTransactions - should reset errorCount after a successful retry", async ({ peerCommunicator, peer }) => {
		const spyPost = stub(http, "post");
		withConfig({ maxSequentialErrors: 5 });

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
