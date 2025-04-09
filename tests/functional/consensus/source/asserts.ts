import { Exceptions } from "@mainsail/contracts";
import { interfaces } from "@mainsail/container";
import { Sandbox } from "@mainsail/test-framework";
import { assert } from "@mainsail/test-runner";

import { getLastCommit, snoozeForInvalidBlock } from "./utilities.js";

export const assertBlockNumber = async (sandbox: Sandbox | Sandbox[], blockNumber: number): Promise<void> => {
	const nodes = Array.isArray(sandbox) ? sandbox : [sandbox];

	for (const node of nodes) {
		const commit = await getLastCommit(node);
		assert.defined(commit);
		assert.equal(commit.block.data.number, blockNumber);
	}
};

export const assertBlockRound = async (sandbox: Sandbox | Sandbox[], round: number): Promise<void> => {
	const nodes = Array.isArray(sandbox) ? sandbox : [sandbox];

	for (const node of nodes) {
		const commit = await getLastCommit(node);
		assert.defined(commit);
		assert.equal(commit.block.data.round, round);
	}
};

export const assertCommitRound = async (sandbox: Sandbox | Sandbox[], round: number): Promise<void> => {
	const nodes = Array.isArray(sandbox) ? sandbox : [sandbox];

	for (const node of nodes) {
		const commit = await getLastCommit(node);
		assert.defined(commit);
		assert.equal(commit.proof.round, round);
	}
};

export const assertBlockHash = async (sandbox: Sandbox | Sandbox[], id?: string): Promise<void> => {
	const nodes = Array.isArray(sandbox) ? sandbox : [sandbox];

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
	exception: interfaces.Newable<Exceptions.Exception>,
	sandbox: Sandbox | Sandbox[],
	blockNumber: number,
	round: number = 0,
): Promise<void> => {
	const nodes = Array.isArray(sandbox) ? sandbox : [sandbox];
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
