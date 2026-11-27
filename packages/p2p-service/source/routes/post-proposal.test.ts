import { Enums, Identifiers } from "@mainsail/constants";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";

import { PostProposalRoute } from "./post-proposal";

describe<{
	route: PostProposalRoute;
	proposalProcessor: any;
	factory: any;
	peerDisposer: any;
}>("PostProposalRoute", ({ it, assert, beforeEach, spy }) => {
	const connection = { remoteAddress: "1.2.3.4" } as any;
	const data = { proposal: Buffer.from("dead", "hex") };

	beforeEach((context) => {
		context.proposalProcessor = { process: async () => Enums.Consensus.ProcessorResult.Accepted };
		context.factory = { makeProposalFromBytes: async (bytes: Buffer) => ({ serialized: bytes }) };
		context.peerDisposer = { banPeer: () => {} };

		const app = new Application();
		app.bind(Identifiers.Consensus.Processor.Proposal).toConstantValue(context.proposalProcessor);
		app.bind(Identifiers.Cryptography.Proposal.Factory).toConstantValue(context.factory);
		app.bind(Identifiers.P2P.Peer.Disposer).toConstantValue(context.peerDisposer);

		context.route = app.resolve(PostProposalRoute);
	});

	it("should hand the proposal to the processor", async ({ route, proposalProcessor, peerDisposer }) => {
		const process = spy(proposalProcessor, "process");
		const banPeer = spy(peerDisposer, "banPeer");

		assert.equal(await route.handle(connection, data), {});

		process.calledWith({ serialized: data.proposal });
		banPeer.neverCalled();
	});

	it("should not ban the sender of a proposal the processor skipped", async ({
		route,
		proposalProcessor,
		peerDisposer,
	}) => {
		proposalProcessor.process = async () => Enums.Consensus.ProcessorResult.Skipped;
		const banPeer = spy(peerDisposer, "banPeer");

		assert.equal(await route.handle(connection, data), {});

		banPeer.neverCalled();
	});

	it("should ban the sender of an invalid proposal", async ({ route, proposalProcessor, peerDisposer }) => {
		proposalProcessor.process = async () => Enums.Consensus.ProcessorResult.Invalid;
		const banPeer = spy(peerDisposer, "banPeer");

		assert.equal(await route.handle(connection, data), {});

		banPeer.calledOnce();
		assert.equal(banPeer.getCallArgs(0)[0], "1.2.3.4");
		assert.equal(banPeer.getCallArgs(0)[1].message, "Invalid proposal");
	});

	it("should ban the sender of a proposal that cannot be read", async ({
		route,
		factory,
		proposalProcessor,
		peerDisposer,
	}) => {
		const failure = new Error("malformed");
		factory.makeProposalFromBytes = async () => {
			throw failure;
		};
		const process = spy(proposalProcessor, "process");
		const banPeer = spy(peerDisposer, "banPeer");

		assert.equal(await route.handle(connection, data), {});

		process.neverCalled();
		banPeer.calledWith("1.2.3.4", failure);
	});
});
