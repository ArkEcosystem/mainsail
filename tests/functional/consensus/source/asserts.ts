import type { Contracts } from "@mainsail/contracts";
import { assert } from "@mainsail/test-runner";

import type { InvalidBlock } from "./utilities.js";

import { getCommit, getLastBlockNumber, getLastCommit } from "./utilities.js";

type Nodes = Contracts.Kernel.Application | Contracts.Kernel.Application[];

const toNodes = (app: Nodes): Contracts.Kernel.Application[] => (Array.isArray(app) ? app : [app]);

// The chain keeps growing while a test asserts, so these read the commit of `blockNumber` rather than the last one:
// by the time the last commit is read, a node may already be a block further. `assertLastBlockNumber` is the
// exception, for a node that must not have advanced.
const getCommitOf = async (
	node: Contracts.Kernel.Application,
	blockNumber: number,
): Promise<Contracts.Crypto.Commit> => {
	const commit = await getCommit(node, blockNumber);
	if (commit === undefined) {
		throw new Error(`Block ${blockNumber} is not committed, the last block is ${await getLastBlockNumber(node)}.`);
	}

	return commit;
};

// Every node has committed `blockNumber`.
export const assertBlockNumber = async (app: Nodes, blockNumber: number): Promise<void> => {
	for (const node of toNodes(app)) {
		await getCommitOf(node, blockNumber);
	}
};

// The last block of every node is exactly `blockNumber`.
export const assertLastBlockNumber = async (app: Nodes, blockNumber: number): Promise<void> => {
	for (const node of toNodes(app)) {
		const commit = await getLastCommit(node);
		assert.defined(commit);
		assert.equal(commit.block.number, blockNumber);
	}
};

export const assertBlockRound = async (app: Nodes, blockNumber: number, round: number): Promise<void> => {
	for (const node of toNodes(app)) {
		const commit = await getCommitOf(node, blockNumber);
		assert.equal(commit.block.round, round);
	}
};

export const assertCommitRound = async (app: Nodes, blockNumber: number, round: number): Promise<void> => {
	for (const node of toNodes(app)) {
		const commit = await getCommitOf(node, blockNumber);
		assert.equal(commit.proof.round, round);
	}
};

// Every node holds the same `blockNumber`, and the given one if `hash` is passed.
export const assertBlockHash = async (app: Nodes, blockNumber: number, hash?: string): Promise<void> => {
	const nodes = toNodes(app);

	if (hash === undefined) {
		const commit = await getCommitOf(nodes[0], blockNumber);
		hash = commit.block.hash;
	}

	for (const node of nodes) {
		const commit = await getCommitOf(node, blockNumber);
		assert.equal(commit.block.hash, hash);
	}
};

// `invalidBlocks` are the BlockEvent.Invalid payloads collected with snoozeForInvalidBlock, one per node.
// `expected` is either the exception class the block processor or one of its verifiers throws, or a pattern for
// the message of an error raised deeper in block processing, such as one surfaced by the EVM.
export const assertInvalidBlock = (
	invalidBlocks: InvalidBlock[],
	expected: Contracts.Kernel.Container.Newable<Error> | RegExp,
	blockNumber: number,
	round: number = 0,
): void => {
	for (const { block, error } of invalidBlocks) {
		assert.equal(block.number, blockNumber);
		assert.equal(block.round, round);

		if (expected instanceof RegExp) {
			assert.match(error.message, expected);
		} else {
			assert.instance(error, expected);
		}
	}
};
