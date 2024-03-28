import { Sandbox } from "@mainsail/test-framework";
import { assert } from "@mainsail/test-runner";

import { getLastCommit } from "./utils.js";

export const assertBockHeight = async (sandbox: Sandbox | Sandbox[], height: number): Promise<void> => {
	const nodes = Array.isArray(sandbox) ? sandbox : [sandbox];

	for (const node of nodes) {
		const commit = await getLastCommit(node);
		assert.defined(commit);
		assert.equal(commit.block.data.height, height);
	}
};

export const assertBlockId = async (sandbox: Sandbox | Sandbox[], id?: string): Promise<void> => {
	const nodes = Array.isArray(sandbox) ? sandbox : [sandbox];

	if (id === undefined) {
		const commit = await getLastCommit(nodes[0]);
		id = commit.block.data.id;
	}

	for (const node of nodes) {
		const commit = await getLastCommit(node);
		assert.defined(commit);
		assert.equal(commit.block!.data.id, id);
	}
};

export const assertCommitValidators = async (sandbox: Sandbox | Sandbox[], validators: boolean[]): Promise<void> => {
	const nodes = Array.isArray(sandbox) ? sandbox : [sandbox];

	for (const node of nodes) {
		const commit = await getLastCommit(node);
		assert.defined(commit);
		assert.equal(commit.proof.validators, validators);
	}
};
