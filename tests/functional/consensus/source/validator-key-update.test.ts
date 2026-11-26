import type { Contracts } from "@mainsail/contracts";
import { Identifiers } from "@mainsail/constants";
import { describe } from "@mainsail/test-runner";

import crypto from "../config/crypto.json" with { type: "json" };
import validators from "../config/validators.json" with { type: "json" };
import { assertBlockHash, assertBlockNumber, assertLastBlockNumber } from "./asserts.js";
import type { Validator } from "./contracts.js";
import { holdChainAt, voteNull } from "./faults.js";
import { P2PRegistry } from "./p2p.js";
import { bootMany, bootstrapMany, restartFromState, runMany, setup, stopMany } from "./setup.js";
import {
	getLastCommit,
	getNodeForValidator,
	getValidatorIndex,
	getValidatorsInSlotOrder,
	makeValidatorUpdate,
	prepareNodeValidators,
	snoozeForBlock,
} from "./utilities.js";

describe<{
	nodes: Contracts.Kernel.Application[];
	validators: Validator[];
	p2p: P2PRegistry;
}>("ValidatorKeyUpdate", ({ beforeEach, afterEach, it, assert, stub }) => {
	const totalNodes = 5;

	const nodeValidators = (nodeIndex: number) => prepareNodeValidators(validators, nodeIndex, totalNodes);

	const consensusKeyPairFactoryOf = (node: Contracts.Kernel.Application) =>
		node.getTagged<Contracts.Crypto.KeyPairFactory>(
			Identifiers.Cryptography.Identity.KeyPair.Factory,
			"type",
			"consensus",
		);

	const includeInFirstBlock = (node: Contracts.Kernel.Application, transaction: Contracts.Crypto.Transaction) => {
		const served = new Set<string>();

		stub(
			node.get<Contracts.TransactionPool.Worker>(Identifiers.TransactionPool.Worker),
			"getTransactions",
		).callsFake(async (...arguments_: unknown[]) => {
			const { blockRound } = arguments_[0] as Contracts.TransactionPool.GetBatchOptions;

			if (!blockRound.startsWith("1-") || served.has(blockRound)) {
				return { remaining: 0, transactions: [] };
			}

			served.add(blockRound);
			return { remaining: 0, transactions: [transaction] };
		});
	};

	const waitForBlock = async (nodes: Contracts.Kernel.Application[], blockNumber: number) => {
		let timer: NodeJS.Timeout | undefined;

		await Promise.race([
			snoozeForBlock(nodes, blockNumber),
			new Promise((resolve) => {
				timer = setTimeout(resolve, 20_000);
			}),
		]);
		clearTimeout(timer);

		await assertBlockNumber(nodes, blockNumber);
	};

	const roundKeyOf = (node: Contracts.Kernel.Application, validator: Validator) =>
		node
			.get<Contracts.ValidatorSet.Service>(Identifiers.ValidatorSet.Service)
			.getRoundValidators()
			.find((wallet) => wallet.address === validator.address)?.blsPublicKey;

	const hasValidSignature = (node: Contracts.Kernel.Application, commit: Contracts.Crypto.Commit) =>
		node
			.get<Contracts.Consensus.CommitProcessor>(Identifiers.Consensus.Processor.Commit)
			.hasValidSignature(commit, commit.block.parentHash);

	beforeEach(async (context) => {
		context.p2p = new P2PRegistry();

		context.nodes = [];
		for (let index = 0; index < totalNodes; index++) {
			context.nodes.push(await setup(index, context.p2p, crypto, nodeValidators(index)));
		}

		await bootMany(context.nodes);
		await bootstrapMany(context.nodes);

		context.validators = await getValidatorsInSlotOrder(context.nodes[0], validators);
	});

	afterEach(async ({ nodes }) => {
		await stopMany(nodes);
	});

	it("should verify a validator against its round key after a restart that follows its key update", async ({
		nodes,
		validators,
		p2p,
	}) => {
		const updated = validators[0];
		const updatedNode = getNodeForValidator(nodes, updated);
		const nullVoter = validators[4];
		const restartedIndex = nodes.indexOf(getNodeForValidator(nodes, validators[1]));

		const chain = holdChainAt(stub, nodes, 1);

		const consensusKeyPair = await consensusKeyPairFactoryOf(updatedNode).fromPrivateKey(Buffer.alloc(32, 1));
		const update = await makeValidatorUpdate(updatedNode, updated, consensusKeyPair);
		includeInFirstBlock(updatedNode, update);

		await runMany(nodes);
		await waitForBlock(nodes, 1);

		assert.equal(
			(await getLastCommit(updatedNode)).block.transactions.map((transaction) => transaction.hash),
			[update.hash],
		);

		voteNull(stub, getNodeForValidator(nodes, nullVoter));

		nodes[restartedIndex] = await restartFromState(
			nodes[restartedIndex],
			restartedIndex,
			p2p,
			crypto,
			nodeValidators(restartedIndex),
		);

		const restarted = nodes[restartedIndex];
		chain.join(restarted);
		await assertLastBlockNumber([restarted], 1);

		const [live] = await restarted
			.get<Contracts.Evm.ConsensusContractService>(Identifiers.Evm.ContractService.Consensus)
			.getValidatorsOf([updated.address]);

		assert.equal(live.blsPublicKey, consensusKeyPair.publicKey);
		assert.equal(roundKeyOf(restarted, updated), updated.consensusPublicKey);

		chain.moveTo(2);
		await waitForBlock(nodes, 2);
		await assertBlockHash(nodes, 2);

		const commit = await getLastCommit(updatedNode);

		assert.equal(commit.block.number, 2);
		assert.false(commit.proof.validators[getValidatorIndex(restarted, nullVoter)]);
		assert.true(commit.proof.validators[getValidatorIndex(restarted, updated)]);
		assert.true(await hasValidSignature(restarted, commit));
	});

	it("should hand a validator that restarts with both keys over to its new key at the next round", async ({
		nodes,
		validators,
		p2p,
	}) => {
		const updated = validators[0];
		const updatedIndex = nodes.indexOf(getNodeForValidator(nodes, updated));
		const nullVoter = validators[4];
		const mnemonic =
			"abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";

		const chain = holdChainAt(stub, nodes, 1);

		const consensusKeyPair = await consensusKeyPairFactoryOf(nodes[updatedIndex]).fromMnemonic(mnemonic);
		const update = await makeValidatorUpdate(nodes[updatedIndex], updated, consensusKeyPair);
		includeInFirstBlock(nodes[updatedIndex], update);

		await runMany(nodes);
		await waitForBlock(nodes, 1);

		assert.equal(
			(await getLastCommit(nodes[updatedIndex])).block.transactions.map((transaction) => transaction.hash),
			[update.hash],
		);

		voteNull(stub, getNodeForValidator(nodes, nullVoter));

		nodes[updatedIndex] = await restartFromState(nodes[updatedIndex], updatedIndex, p2p, crypto, {
			secrets: [updated.mnemonic, mnemonic],
		});
		chain.join(nodes[updatedIndex]);
		await assertLastBlockNumber([nodes[updatedIndex]], 1);

		assert.equal(roundKeyOf(nodes[updatedIndex], updated), updated.consensusPublicKey);

		chain.moveTo(5);
		await waitForBlock(nodes, 5);

		for (const node of nodes) {
			assert.equal(roundKeyOf(node, updated), consensusKeyPair.publicKey);
		}

		chain.moveTo(6);
		await waitForBlock(nodes, 6);
		await assertBlockHash(nodes, 6);

		const commit = await getLastCommit(nodes[0]);

		assert.equal(commit.block.number, 6);
		assert.false(commit.proof.validators[getValidatorIndex(nodes[0], nullVoter)]);
		assert.true(commit.proof.validators[getValidatorIndex(nodes[0], updated)]);

		for (const node of nodes) {
			assert.true(await hasValidSignature(node, commit));
		}
	});
});
