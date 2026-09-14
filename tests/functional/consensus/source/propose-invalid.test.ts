import type { Consensus } from "@mainsail/consensus/distribution/consensus.js";
import type { Contracts } from "@mainsail/contracts";
import { Identifiers } from "@mainsail/constants";
import * as Exceptions from "@mainsail/exceptions";
import { describe } from "@mainsail/test-runner";
import { EvmCalls } from "@mainsail/test-transaction-builders";

import crypto from "../config/crypto.json" with { type: "json" };
import validators from "../config/validators.json" with { type: "json" };
import { assertBlockHash, assertBlockNumber, assertBlockRound, assertInvalidBlock } from "./asserts.js";
import type { Validator } from "./contracts.js";
import type { BlockOverrides } from "./custom-proposal.js";
import { makeCustomProposal, makeTransactionBuilderContext } from "./custom-proposal.js";
import { P2PRegistry } from "./p2p.js";
import { bootMany, bootstrapMany, runMany, setup, stopMany } from "./setup.js";
import {
	getLastCommit,
	getNodeForValidator,
	getValidatorsInSlotOrder,
	makeProposal,
	prepareNodeValidators,
	snoozeForBlock,
	snoozeForInvalidBlock,
	snoozeUntil,
} from "./utilities.js";

type Node = Contracts.Kernel.Application;

type Build = (node0: Node, nodes: Node[], validators: Validator[]) => Promise<Contracts.Crypto.Proposal>;

type Dataset = {
	// Builds the proposal the slot-0 validator sends for block 1, round 0.
	build: Build;
	// What every node reports through BlockEvent.Invalid: the exception of the verifier that rejects the block,
	// or a pattern for the message of the plain Error thrown deeper in block processing.
	error: Contracts.Kernel.Container.Newable<Error> | RegExp;
	toString: () => string;
};

const dataset = (name: string, build: Build, error: Dataset["error"]): Dataset => ({
	build,
	error,
	toString: () => name,
});

type Transactions = (node0: Node, nodes: Node[], validators: Validator[]) => Promise<Contracts.Crypto.Transaction[]>;

const withTransactions =
	(transactions: Transactions): Build =>
	async (node0, nodes, validators) =>
		makeCustomProposal({ app: node0, validators }, await transactions(node0, nodes, validators));

const withHeader =
	(overrides: (validators: Validator[]) => BlockOverrides): Build =>
	async (node0, nodes, validators) =>
		makeCustomProposal({ app: node0, validators }, [], overrides(validators));

const withTimestamp =
	(timestamp: (node0: Node) => number): Build =>
	async (node0, nodes, validators) =>
		makeProposal(node0, validators[0], 1, 0, timestamp(node0));

const evmOf = (node: Node) => node.getTagged<Contracts.Evm.Instance>(Identifiers.Evm.Instance, "instance", "evm");

const lastBlockOf = (node: Node) => node.get<Contracts.State.Store>(Identifiers.State.Store).getLastBlock();

describe<{
	nodes: Node[];
	validators: Validator[];
	p2p: P2PRegistry;
}>("Propose Invalid Block", ({ beforeEach, afterEach, each, assert, stub }) => {
	const totalNodes = 5;

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

		context.validators = await getValidatorsInSlotOrder(context.nodes[0], validators);
	});

	afterEach(async ({ nodes }) => {
		await stopMany(nodes);
	});

	// The proposer bypasses the pool and forges a block that does not pass block processing. Every node,
	// the proposer included, must reject it: prevote nil, precommit nil, and confirm the fresh proposal of
	// the next round instead. The datasets cover the ways a block can be bad: transactions the EVM refuses
	// to execute, header checks of the block verifiers, and header totals that do not match the execution.
	each(
		"should reject block with %s, and confirm the next proposal",
		async ({ context: { nodes, validators, p2p }, dataset }) => {
			// The proposer builds no block of its own for round 0; the bad one below takes its place. From round 1 on
			// it proposes as usual.
			const node0 = getNodeForValidator(nodes, validators[0]);
			const stubPropose = stub(node0.get<Consensus>(Identifiers.Consensus.Service), "prepareProposal");
			stubPropose.callsFake(async () => {
				stubPropose.restore();
			});

			// Listen before the nodes run: the rejection comes as soon as the proposal is processed.
			const invalidBlocks = snoozeForInvalidBlock(nodes, 1);

			await runMany(nodes);

			// Built for block 1, round 0, once every node is up and reachable, and sent to all of them, the proposer
			// included, the way its own proposal would go out.
			await p2p.broadcastProposal(await dataset.build(node0, nodes, validators));

			assertInvalidBlock(await invalidBlocks, dataset.error, 1);

			// Round 0: one proposal, rejected by every node with nil prevotes and nil precommits...
			await snoozeUntil(() => p2p.precommits.getMessages(1, 0).length === totalNodes);

			const [rejectedProposal] = p2p.proposals.getMessages(1, 0);
			assert.defined(rejectedProposal);

			assert.equal(p2p.proposals.getMessages(1, 0).length, 1); // Assert number of proposals
			assert.equal(
				p2p.prevotes.getMessages(1, 0).map((prevote) => prevote.blockHash),
				Array.from({ length: totalNodes }).fill(undefined),
			);
			assert.equal(
				p2p.precommits.getMessages(1, 0).map((precommit) => precommit.blockHash),
				Array.from({ length: totalNodes }).fill(undefined),
			);

			// ...so the proposer forges a fresh block, which is confirmed in round 1.
			await snoozeForBlock(nodes);
			await assertBlockNumber(nodes, 1);
			await assertBlockRound(nodes, 1, 1);
			await assertBlockHash(nodes, 1);
			assert.not.equal((await getLastCommit(nodes[0])).block.hash, rejectedProposal.blockHeader.hash);

			// Next block
			await snoozeForBlock(nodes, 2);
			await assertBlockNumber(nodes, 2);
			await assertBlockRound(nodes, 2, 0);
		},
		[
			dataset(
				"a transaction with a nonce too high",
				withTransactions(async (node0, nodes, validators) => [
					await EvmCalls.makeEvmCall(makeTransactionBuilderContext(node0, nodes, validators), {
						nonceOffset: 1,
						recipient: validators[0].address,
					}),
				]),
				/nonce .* too high/,
			),
			dataset(
				"a transaction with a nonce too low",
				withTransactions(async (node0, nodes, validators) => [
					await EvmCalls.makeEvmCall(makeTransactionBuilderContext(node0, nodes, validators), {
						nonceOffset: -1,
						recipient: validators[0].address,
					}),
				]),
				/nonce .* too low/,
			),
			dataset(
				"a transaction the sender cannot pay for",
				withTransactions(async (node0, nodes, validators) => {
					const { balance } = await evmOf(node0).getAccountInfo(validators[0].address);

					return [
						await EvmCalls.makeEvmCall(makeTransactionBuilderContext(node0, nodes, validators), {
							recipient: validators[0].address,
							value: balance + 1n,
						}),
					];
				}),
				/lack of funds/i,
			),
			dataset(
				"a duplicated transaction",
				withTransactions(async (node0, nodes, validators) => {
					const transaction = await EvmCalls.makeEvmCall(
						makeTransactionBuilderContext(node0, nodes, validators),
						{ recipient: validators[0].address },
					);

					return [transaction, transaction];
				}),
				Exceptions.DuplicatedTransaction,
			),
			dataset(
				"a timestamp before the earliest allowed one",
				// Just after the last block, so the block is chained, but before its timestamp plus the block time.
				withTimestamp((node0) => lastBlockOf(node0).timestamp + 1),
				Exceptions.InvalidTimestamp,
			),
			dataset(
				"a timestamp in the future",
				withTimestamp(() => Date.now() + 60_000),
				Exceptions.FutureBlock,
			),
			dataset(
				"a parent hash that is not the last block",
				withHeader(() => ({ parentHash: "ff".repeat(32) })),
				Exceptions.BlockNotChained,
			),
			dataset(
				"a proposer that is not the one of the round",
				withHeader((validators) => ({ proposer: validators[1].address })),
				Exceptions.InvalidGenerator,
			),
			dataset(
				"a reward that is not the one of the milestone",
				withHeader(() => ({ reward: 1n })),
				Exceptions.InvalidReward,
			),
			dataset(
				"a transactions root that does not match the transactions",
				withHeader(() => ({ transactionsRoot: "ff".repeat(32) })),
				Exceptions.InvalidTransactionsRoot,
			),
			dataset(
				"a gas total that does not match the execution",
				withHeader(() => ({ gasUsed: 21_000 })),
				/does not match consumed gas/,
			),
			dataset(
				"a fee total that does not match the execution",
				withHeader(() => ({ fee: 1n })),
				/does not match consumed fee/,
			),
			dataset(
				"a state root that does not match the execution",
				withHeader(() => ({ stateRoot: "ff".repeat(32) })),
				/state root mismatch/i,
			),
		],
	);
});
