import type { Contracts } from "@mainsail/contracts";
import * as Exceptions from "@mainsail/exceptions";
import { assert } from "@mainsail/test-runner";

import { getLastCommit, snoozeForInvalidBlock } from "./utilities.js";

export const assertBlockNumber = async (app: Contracts.Kernel.Application | Contracts.Kernel.Application[], blockNumber: number): Promise<void> => {
	const nodes = Array.isArray(app) ? app : [app];

	for (const node of nodes) {
		const commit = await getLastCommit(node);
		assert.defined(commit);
		assert.equal(commit.block.data.number, blockNumber);
	}
};

export const assertBlockRound = async (app: Contracts.Kernel.Application | Contracts.Kernel.Application[], round: number): Promise<void> => {
	const nodes = Array.isArray(app) ? app : [app];

	for (const node of nodes) {
		const commit = await getLastCommit(node);
		assert.defined(commit);
		assert.equal(commit.block.data.round, round);
	}
};

export const assertCommitRound = async (app: Contracts.Kernel.Application | Contracts.Kernel.Application[], round: number): Promise<void> => {
	const nodes = Array.isArray(app) ? app : [app];

	for (const node of nodes) {
		const commit = await getLastCommit(node);
		assert.defined(commit);
		assert.equal(commit.proof.round, round);
	}
};

export const assertBlockHash = async (app: Contracts.Kernel.Application | Contracts.Kernel.Application[], id?: string): Promise<void> => {
	const nodes = Array.isArray(app) ? app : [app];

	if (id === undefined) {
		const commit = await getLastCommit(nodes[0]);
		id = commit.block.data.hash;
	}

	for (const node of nodes) {
		const commit = await getLastCommit(node);
		assert.defined(commit);
		assert.equal(commit.block!.data.hash, id);
	}
};

export const assertInvalidBlock = async (
	exception: Contracts.Kernel.Container.Newable<Exceptions.Exception>,
	app: Contracts.Kernel.Application | Contracts.Kernel.Application[],
	blockNumber: number,
	round: number = 0,
): Promise<void> => {
	const nodes = Array.isArray(app) ? app : [app];
	const invalidBlocks = await snoozeForInvalidBlock(nodes, blockNumber);

	assert.length(nodes, invalidBlocks.length);

	for (const { block, error } of invalidBlocks) {
		assert.equal(block.number, blockNumber);
		assert.equal(block.round, round);

		if (!(error instanceof exception)) {
			console.log(exception.name, error);
		}

		assert.instance(error, exception);
	}
};
