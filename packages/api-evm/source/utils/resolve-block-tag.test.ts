import { describe } from "@mainsail/test-runner";

import { getHistoryHeightFromBlockTag, resolveBlockTag } from "./resolve-block-tag.js";

describe<{
	stateStore: any;
}>("resolveBlockTag", ({ beforeEach, it, assert }) => {
	beforeEach((context) => {
		context.stateStore = {
			getBlockNumber: () => 100,
		};
	});

	it("should parse a 0x hex tag to a number", async ({ stateStore }) => {
		assert.is(await resolveBlockTag(stateStore, "0x10"), 16);
		assert.is(await resolveBlockTag(stateStore, "0x0"), 0);
		assert.is(await resolveBlockTag(stateStore, "0xff"), 255);
	});

	it("should return the current block number for latest/finalized/safe", async ({ stateStore }) => {
		assert.is(await resolveBlockTag(stateStore, "latest"), 100);
		assert.is(await resolveBlockTag(stateStore, "finalized"), 100);
		assert.is(await resolveBlockTag(stateStore, "safe"), 100);
	});

	it("should throw for an invalid tag", async ({ stateStore }) => {
		await assert.rejects(() => resolveBlockTag(stateStore, "pending"), "invalid blockTag:pending");
	});
});

describe("getHistoryHeightFromBlockTag", ({ it, assert }) => {
	it("should return a bigint from a 0x hex tag", async () => {
		assert.is(await getHistoryHeightFromBlockTag("0x10"), 16n);
		assert.is(await getHistoryHeightFromBlockTag("0x0"), 0n);
	});

	it("should return undefined for latest/finalized/safe", async () => {
		assert.undefined(await getHistoryHeightFromBlockTag("latest"));
		assert.undefined(await getHistoryHeightFromBlockTag("finalized"));
		assert.undefined(await getHistoryHeightFromBlockTag("safe"));
	});

	it("should throw for an invalid tag", async () => {
		await assert.rejects(() => getHistoryHeightFromBlockTag("pending"), "invalid blockTag:pending");
	});
});
