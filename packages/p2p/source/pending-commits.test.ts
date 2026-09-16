import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";
import { PendingCommits } from "./pending-commits";

describe<{
	pendingCommits: PendingCommits;
}>("PendingCommits", ({ it, assert, beforeEach }) => {
	const makeCommit = (number: number): any => ({ block: { number } });

	beforeEach((context) => {
		context.pendingCommits = new Application().resolve(PendingCommits);
	});

	it("#has - should know the block numbers of the added commits", ({ pendingCommits }) => {
		pendingCommits.add([makeCommit(2), makeCommit(3)]);

		assert.false(pendingCommits.has(1));
		assert.true(pendingCommits.has(2));
		assert.true(pendingCommits.has(3));
	});

	it("#take - should hand out the commit and forget it", ({ pendingCommits }) => {
		const commit = makeCommit(2);
		pendingCommits.add([commit, makeCommit(3)]);

		assert.equal(pendingCommits.take(2), commit);
		assert.false(pendingCommits.has(2));
		assert.true(pendingCommits.has(3));
		assert.undefined(pendingCommits.take(2));
	});

	it("#clear - should forget every commit", ({ pendingCommits }) => {
		pendingCommits.add([makeCommit(2), makeCommit(3)]);

		pendingCommits.clear();

		assert.false(pendingCommits.has(2));
		assert.false(pendingCommits.has(3));
	});
});
