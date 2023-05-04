import { describe, Sandbox } from "../../test-framework";

import { ChunkCache } from "./chunk-cache";

describe<{
	sandbox: Sandbox;
	chunkCache: ChunkCache;
}>("ChunkCache", ({ it, assert, beforeEach }) => {
	beforeEach((context) => {
		context.sandbox = new Sandbox();
		context.chunkCache = context.sandbox.app.resolve(ChunkCache);
	});

	it("#set - should set data", ({ chunkCache }) => {
		chunkCache.set("1-2", []);
	});

	it("#set - should remove first inserted data when cache is full", ({ chunkCache }) => {
		for (let index = 0; index < 100; index++) {
			chunkCache.set(`${index}`, []);
		}

		chunkCache.get("0");

		chunkCache.set(`101`, []);

		assert.throws(() => chunkCache.get("0"));
	});

	it("#get - should get data", ({ chunkCache }) => {
		const chunk = [{ id: "1" }, { id: "2" }];

		// @ts-ignore
		chunkCache.set("1-2", chunk);

		assert.equal(chunkCache.get("1-2"), chunk);
	});

	it("#get - should throw error if key does not exists", ({ chunkCache }) => {
		assert.throws(() => {
			chunkCache.get("1-2");
		}, `Downloaded chunk for key 1-2 is not defined.`);
	});

	it("#has - should return true if key exists", ({ chunkCache }) => {
		chunkCache.set("1-2", []);

		assert.true(chunkCache.has("1-2"));
	});

	it("#has - should return false if key does not exists", ({ chunkCache }) => {
		assert.false(chunkCache.has("1-2"));
	});

	it("#remove - should remove by key", ({ chunkCache }) => {
		chunkCache.set("1-2", []);
		assert.true(chunkCache.has("1-2"));

		chunkCache.remove("1-2");
		assert.false(chunkCache.has("1-2"));
	});
});
