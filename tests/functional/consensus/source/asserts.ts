import type { Contracts } from "@mainsail/contracts";
import { assert } from "@mainsail/test-runner";

import { getLastCommit, InvalidBlock } from "./utilities.js";

export const assertBlockNumber = async (
	app: Contracts.Kernel.Application | Contracts.Kernel.Application[],
	blockNumber: number,
): Promise<void> => {
	const nodes = Array.isArray(app) ? app : [app];

	for (const node of nodes) {
		const commit = await getLastCommit(node);
		assert.defined(commit);
		assert.equal(commit.block.number, blockNumber);
	}
};

export const assertBlockRound = async (
	app: Contracts.Kernel.Application | Contracts.Kernel.Application[],
	round: number,
): Promise<void> => {
	const nodes = Array.isArray(app) ? app : [app];

	for (const node of nodes) {
		const commit = await getLastCommit(node);
		assert.defined(commit);
		assert.equal(commit.block.round, round);
	}
};

export const assertCommitRound = async (
	app: Contracts.Kernel.Application | Contracts.Kernel.Application[],
	round: number,
): Promise<void> => {
	const nodes = Array.isArray(app) ? app : [app];

	for (const node of nodes) {
		const commit = await getLastCommit(node);
		assert.defined(commit);
		assert.equal(commit.proof.round, round);
	}
};

export const assertBlockHash = async (
	app: Contracts.Kernel.Application | Contracts.Kernel.Application[],
	id?: string,
): Promise<void> => {
	const nodes = Array.isArray(app) ? app : [app];

	if (id === undefined) {
		const commit = await getLastCommit(nodes[0]);
		id = commit.block.hash;
	}

	for (const node of nodes) {
		const commit = await getLastCommit(node);
		assert.defined(commit);
		assert.equal(commit.block!.hash, id);
	}
};

// `invalidBlocks` are the BlockEvent.Invalid payloads collected with snoozeForInvalidBlock, one per node.
// `expected` is either the exception class a block verifier throws, or a pattern for the message of the plain
// Error raised deeper in block processing (transaction execution, gas and fee totals, state root).
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
