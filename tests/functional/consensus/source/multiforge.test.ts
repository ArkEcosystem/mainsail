import { Consensus } from "@mainsail/consensus/distribution/consensus.js";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { describe, Sandbox } from "@mainsail/test-framework";

import crypto from "../config/crypto.json";
import validators from "../config/validators.json";
import { assertBlockId, assertBockHeight, assertBockRound } from "./asserts.js";
import { Validator } from "./contracts.js";
import { P2PRegistry } from "./p2p.js";
import { bootMany, bootstrapMany, runMany, setup, stopMany } from "./setup.js";
import { getLastCommit, getValidators, prepareNodeValidators, snoozeForBlock } from "./utils.js";

describe<{
	nodes: Sandbox[];
	validators: Validator[];
	p2p: P2PRegistry;
}>("Consensus", ({ beforeEach, afterEach, it, assert, stub }) => {
	const totalNodes = 5;

	const makeProposal = async (node: Sandbox, validator: Validator, height: number, round: number) => {
		const proposer = node.app
			.get<Contracts.Validator.ValidatorRepository>(Identifiers.Validator.Repository)
			.getValidator(validator.consensusPublicKey);

		if (!proposer) {
			throw new Error(`Validator ${validator.consensusPublicKey} not found`);
		}

		const block = await proposer.prepareBlock(validator.publicKey, round);
		return await proposer.propose(
			node.app
				.get<Contracts.ValidatorSet.Service>(Identifiers.ValidatorSet.Service)
				.getValidatorIndexByWalletPublicKey(validator.publicKey),
			round,
			undefined,
			block,
		);
	};

	beforeEach(async (context) => {
		context.p2p = new P2PRegistry();

		context.nodes = [];
		for (let index = 0; index < totalNodes; index++) {
			context.nodes.push(
				await setup(index, context.p2p, crypto, prepareNodeValidators(validators, index, totalNodes)),
			);
		}

		await bootMany(context.nodes);
		await bootstrapMany(context.nodes);

		context.validators = await getValidators(context.nodes[0], validators);

		await runMany(context.nodes);
	});

	afterEach(async ({ nodes }) => {
		await stopMany(nodes);
	});

	it("#single propose - should forge 3 blocks with all validators signing", async ({ nodes, validators }) => {
		await snoozeForBlock(nodes);

		await assertBockHeight(nodes, 1);
		await assertBockRound(nodes, 0);
		await assertBlockId(nodes);
		assert.equal((await getLastCommit(nodes[0])).block.data.generatorPublicKey, validators[0].publicKey);

		await snoozeForBlock(nodes);

		await assertBockHeight(nodes, 2);
		await assertBockRound(nodes, 0);
		await assertBlockId(nodes);
		assert.equal((await getLastCommit(nodes[0])).block.data.generatorPublicKey, validators[0].publicKey);

		await snoozeForBlock(nodes);

		await assertBockHeight(nodes, 3);
		await assertBockRound(nodes, 0);
		await assertBlockId(nodes);
		assert.equal((await getLastCommit(nodes[0])).block.data.generatorPublicKey, validators[0].publicKey);
	});

	it("#missing propose - should increase round and forge on same height", async ({ nodes }) => {
		const node0 = nodes[0];
		const stubPropose = stub(node0.app.get<Consensus>(Identifiers.Consensus.Service), "propose");

		stubPropose.callsFake(async () => {
			stubPropose.restore();
		});

		await snoozeForBlock(nodes);

		await assertBockHeight(nodes, 1);
		await assertBockRound(nodes, 1);
		await assertBlockId(nodes);
	});

	it("#double propose - one by one - should take the first proposal", async ({ nodes, validators, p2p }) => {
		const node0 = nodes[0];
		const stubPropose = stub(nodes[0].app.get<Consensus>(Identifiers.Consensus.Service), "propose");
		stubPropose.callsFake(async () => {
			stubPropose.restore();
		});

		const proposal0 = await makeProposal(node0, validators[0], 1, 0);
		const proposal1 = await makeProposal(node0, validators[0], 1, 0);

		assert.not.equal(proposal0.block.block.data.id, proposal1.block.block.data.id);

		await p2p.broadcastProposal(proposal0);
		await p2p.broadcastProposal(proposal1);

		await snoozeForBlock(nodes);

		await assertBockHeight(nodes, 1);
		await assertBockRound(nodes, 0);
		await assertBlockId(nodes, proposal0.block.block.data.id);

		assert.equal(p2p.proposals.getMessages(1, 0).length, 2); // Assert number of proposals
		assert.equal(p2p.prevotes.getMessages(1, 0).length, totalNodes); // Assert number of prevotes
		assert.equal(p2p.precommits.getMessages(1, 0).length, totalNodes); // Assert number of precommits

		// Assert all nodes prevote
		assert.equal(
			p2p.prevotes.getMessages(1, 0).map((prevote) => prevote.blockId),
			[
				proposal0.block.block.data.id,
				proposal0.block.block.data.id,
				proposal0.block.block.data.id,
				proposal0.block.block.data.id,
				proposal0.block.block.data.id,
			],
		);

		// Assert all nodes precommit
		assert.equal(
			p2p.precommits.getMessages(1, 0).map((precommit) => precommit.blockId),
			new Array(totalNodes).fill(proposal0.block.block.data.id),
		);
	});

	it("#double propose - 50 : 50 split - should not accept block", async ({ nodes, validators, p2p }) => {
		const node0 = nodes[0];
		const stubPropose = stub(nodes[0].app.get<Consensus>(Identifiers.Consensus.Service), "propose");
		stubPropose.callsFake(async () => {
			stubPropose.restore();
		});

		const proposal0 = await makeProposal(node0, validators[0], 1, 0);
		const proposal1 = await makeProposal(node0, validators[0], 1, 0);

		assert.not.equal(proposal0.block.block.data.id, proposal1.block.block.data.id);

		await p2p.broadcastProposal(proposal0, [0, 1, 2]);
		await p2p.broadcastProposal(proposal1, [3, 4]);

		await snoozeForBlock(nodes);

		await assertBockHeight(nodes, 1);
		await assertBockRound(nodes, 1);
		await assertBlockId(nodes);

		assert.equal(p2p.proposals.getMessages(1, 0).length, 2); // Assert number of proposals
		assert.equal(p2p.prevotes.getMessages(1, 0).length, totalNodes); // Assert number of prevotes
		assert.equal(p2p.precommits.getMessages(1, 0).length, totalNodes); // Assert number of precommits

		// Assert all nodes prevote
		assert.equal(
			p2p.prevotes.getMessages(1, 0).map((prevote) => prevote.blockId),
			[
				proposal0.block.block.data.id,
				proposal0.block.block.data.id,
				proposal0.block.block.data.id,
				proposal1.block.block.data.id,
				proposal1.block.block.data.id,
			],
		);

		// Assert all nodes precommit (null)
		assert.equal(
			p2p.precommits.getMessages(1, 0).map((precommit) => precommit.blockId),
			new Array(totalNodes).fill(undefined),
		);
	});

	it("#double propose - majority : minority split - should  accept block broadcasted to majority", async ({
		nodes,
		validators,
		p2p,
	}) => {
		const node0 = nodes[0];
		const stubPropose = stub(nodes[0].app.get<Consensus>(Identifiers.Consensus.Service), "propose");
		stubPropose.callsFake(async () => {
			stubPropose.restore();
		});

		const proposal0 = await makeProposal(node0, validators[0], 1, 0);
		const proposal1 = await makeProposal(node0, validators[0], 1, 0);

		assert.not.equal(proposal0.block.block.data.id, proposal1.block.block.data.id);

		await p2p.broadcastProposal(proposal0, [0, 1, 2, 3]);
		await p2p.broadcastProposal(proposal1, [4]);

		const nodesSubset = nodes.slice(0, 4);
		await snoozeForBlock(nodesSubset);

		await assertBockHeight(nodesSubset, 1);
		await assertBockRound(nodesSubset, 0);
		await assertBlockId(nodesSubset);

		assert.equal(p2p.proposals.getMessages(1, 0).length, 2); // Assert number of proposals
		assert.equal(p2p.prevotes.getMessages(1, 0).length, totalNodes); // Assert number of prevotes
		assert.equal(p2p.precommits.getMessages(1, 0).length, totalNodes - 1); // Assert number of precommits

		// Assert all nodes prevote
		assert.equal(
			p2p.prevotes.getMessages(1, 0).map((prevote) => prevote.blockId),
			[
				proposal0.block.block.data.id,
				proposal0.block.block.data.id,
				proposal0.block.block.data.id,
				proposal0.block.block.data.id,
				proposal1.block.block.data.id,
			],
		);

		// // Assert all nodes precommit (null)
		assert.equal(
			p2p.precommits.getMessages(1, 0).map((precommit) => precommit.blockId),
			new Array(totalNodes - 1).fill(proposal0.block.block.data.id),
		);
	});
});
