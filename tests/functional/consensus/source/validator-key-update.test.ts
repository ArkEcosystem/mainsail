import type { Contracts } from "@mainsail/contracts";
import { Identifiers } from "@mainsail/constants";
import { describe } from "@mainsail/test-runner";
import { sleep } from "@mainsail/utils";

import crypto from "../config/crypto.json" with { type: "json" };
import validators from "../config/validators.json" with { type: "json" };
import { assertBlockHash, assertBlockNumber, assertLastBlockNumber } from "./asserts.js";
import type { Validator } from "./contracts.js";
import { disconnect } from "./faults.js";
import { P2PRegistry } from "./p2p.js";
import { bootMany, bootstrapMany, restartFromState, runMany, setup, stopMany } from "./setup.js";
import {
	getLastCommit,
	getNodeForValidator,
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
		const disconnectedNode = getNodeForValidator(nodes, validators[4]);
		const restartedIndex = nodes.indexOf(getNodeForValidator(nodes, validators[1]));

		disconnect(stub, disconnectedNode);

		const consensusKeyPair = await updatedNode
			.getTagged<Contracts.Crypto.KeyPairFactory>(
				Identifiers.Cryptography.Identity.KeyPair.Factory,
				"type",
				"consensus",
			)
			.fromPrivateKey(Buffer.alloc(32, 1));
		const update = await makeValidatorUpdate(updatedNode, updated, consensusKeyPair);

		const served = new Set<string>();
		stub(
			updatedNode.get<Contracts.TransactionPool.Worker>(Identifiers.TransactionPool.Worker),
			"getTransactions",
		).callsFake(async (...arguments_: unknown[]) => {
			const { blockRound } = arguments_[0] as Contracts.TransactionPool.GetBatchOptions;

			if (!blockRound.startsWith("1-") || served.has(blockRound)) {
				return { remaining: 0, transactions: [] };
			}

			served.add(blockRound);
			return { remaining: 0, transactions: [update] };
		});

		await runMany(nodes);
		await snoozeForBlock(
			nodes.filter((node) => node !== disconnectedNode),
			1,
		);

		assert.equal(
			(await getLastCommit(updatedNode)).block.transactions.map((transaction) => transaction.hash),
			[update.hash],
		);

		nodes[restartedIndex] = await restartFromState(
			nodes[restartedIndex],
			restartedIndex,
			p2p,
			crypto,
			nodeValidators(restartedIndex),
		);

		const restarted = nodes[restartedIndex];
		await assertLastBlockNumber([restarted], 1);

		const [live] = await restarted
			.get<Contracts.Evm.ConsensusContractService>(Identifiers.Evm.ContractService.Consensus)
			.getValidatorsOf([updated.address]);
		const round = restarted
			.get<Contracts.ValidatorSet.Service>(Identifiers.ValidatorSet.Service)
			.getRoundValidators()
			.find((wallet) => wallet.address === updated.address);

		assert.equal(live.blsPublicKey, consensusKeyPair.publicKey);
		assert.equal(round?.blsPublicKey, updated.consensusPublicKey);

		const quorum = nodes.filter((node) => node !== disconnectedNode);
		await Promise.race([snoozeForBlock(quorum, 2), sleep(10_000)]);

		await assertBlockNumber(quorum, 2);
		await assertBlockHash(quorum, 2);
	});
});
