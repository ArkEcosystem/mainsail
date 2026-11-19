import { Enums, Identifiers } from "@mainsail/constants";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";

import { PostMessageRoute } from "./post-message";

describe<{
	route: PostMessageRoute;
	messageProcessor: any;
	factory: any;
	peerDisposer: any;
}>("PostMessageRoute", ({ it, assert, beforeEach, spy }) => {
	const connection = { remoteAddress: "1.2.3.4" } as any;
	const data = { message: Buffer.from("dead", "hex") };

	beforeEach((context) => {
		context.messageProcessor = { process: async () => Enums.Consensus.ProcessorResult.Accepted };
		context.factory = { makeMessageFromBytes: async (bytes: Buffer) => ({ serialized: bytes }) };
		context.peerDisposer = { banPeer: () => {} };

		const app = new Application();
		app.bind(Identifiers.Consensus.Processor.Message).toConstantValue(context.messageProcessor);
		app.bind(Identifiers.Cryptography.Message.Factory).toConstantValue(context.factory);
		app.bind(Identifiers.P2P.Peer.Disposer).toConstantValue(context.peerDisposer);

		context.route = app.resolve(PostMessageRoute);
	});

	it("should hand the message to the processor", async ({ route, messageProcessor, peerDisposer }) => {
		const process = spy(messageProcessor, "process");
		const banPeer = spy(peerDisposer, "banPeer");

		assert.equal(await route.handle(connection, data), {});

		process.calledWith({ serialized: data.message });
		banPeer.neverCalled();
	});

	it("should not ban the sender of a message the processor skipped", async ({
		route,
		messageProcessor,
		peerDisposer,
	}) => {
		messageProcessor.process = async () => Enums.Consensus.ProcessorResult.Skipped;
		const banPeer = spy(peerDisposer, "banPeer");

		assert.equal(await route.handle(connection, data), {});

		banPeer.neverCalled();
	});

	it("should ban the sender of an invalid message", async ({ route, messageProcessor, peerDisposer }) => {
		messageProcessor.process = async () => Enums.Consensus.ProcessorResult.Invalid;
		const banPeer = spy(peerDisposer, "banPeer");

		assert.equal(await route.handle(connection, data), {});

		banPeer.calledOnce();
		assert.equal(banPeer.getCallArgs(0)[0], "1.2.3.4");
		assert.equal(banPeer.getCallArgs(0)[1].message, "Invalid message");
	});

	it("should ban the sender of a message that cannot be read", async ({
		route,
		factory,
		messageProcessor,
		peerDisposer,
	}) => {
		const failure = new Error("malformed");
		factory.makeMessageFromBytes = async () => {
			throw failure;
		};
		const process = spy(messageProcessor, "process");
		const banPeer = spy(peerDisposer, "banPeer");

		assert.equal(await route.handle(connection, data), {});

		process.neverCalled();
		banPeer.calledWith("1.2.3.4", failure);
	});
});
