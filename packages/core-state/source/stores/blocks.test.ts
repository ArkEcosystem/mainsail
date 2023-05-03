import { Contracts } from "@mainsail/core-contracts";

import { describe } from "../../../core-test-framework";
import { BlockStore } from "./blocks";

describe("BlockStore", ({ it, assert }) => {
	it("should push and get a block", () => {
		const block: Contracts.Crypto.IBlock = {
			data: { height: 1, id: "1", previousBlock: undefined },
		} as Contracts.Crypto.IBlock;

		const store = new BlockStore(100);
		store.set(block);

		assert.equal(store.count(), 1);
		assert.equal(store.get(block.data.id), block.data);
		assert.equal(store.get(block.data.height), block.data);
	});

	it("should fail to push a block if its height is not 1 and there is no last block", () => {
		const store = new BlockStore(2);

		assert.throws(() => store.set({ data: { height: 3, id: "3" } } as Contracts.Crypto.IBlock));
	});

	it("should fail to push a block if it does not contain an id", () => {
		const store = new BlockStore(2);

		assert.throws(() => store.set({ data: { height: 1 } } as Contracts.Crypto.IBlock));
	});

	it("should fail to push a block if it isn't chained", () => {
		const store = new BlockStore(2);
		store.set({ data: { height: 1, id: "1" } } as Contracts.Crypto.IBlock);

		assert.throws(() => store.set({ data: { height: 3, id: "3" } } as Contracts.Crypto.IBlock));
	});

	it("should return all ids and heights in the order they were inserted", () => {
		const store = new BlockStore(4);

		for (let index = 1; index < 5; index++) {
			store.set({ data: { height: index, id: index.toString() } } as Contracts.Crypto.IBlock);
		}

		assert.equal(store.count(), 4);
		assert.equal(store.getIds(), ["1", "2", "3", "4"]);
		assert.equal(store.getHeights(), [1, 2, 3, 4]);
	});

	it("should return whether the store contains a specific block", () => {
		const store = new BlockStore(4);

		for (let index = 1; index < 5; index++) {
			store.set({ data: { height: index, id: index.toString() } } as Contracts.Crypto.IBlock);
		}

		assert.true(store.has({ height: 1, id: "1" } as Contracts.Crypto.IBlockData));
		assert.false(store.has({ height: 5, id: "5" } as Contracts.Crypto.IBlockData));
	});

	it("should delete blocks", () => {
		const store = new BlockStore(4);

		for (let index = 1; index < 5; index++) {
			store.set({ data: { height: index, id: index.toString() } } as Contracts.Crypto.IBlock);
		}

		store.delete({ height: 4, id: "4" } as Contracts.Crypto.IBlockData);

		assert.equal(store.count(), 3);
		assert.false(store.has({ height: 4, id: "4" } as Contracts.Crypto.IBlockData));
	});

	// TODO: check this is the desired behaviour
	it("should be resizeable", () => {
		const store = new BlockStore(1);
		store.set({ data: { height: 1, id: "1" } } as Contracts.Crypto.IBlock);
		store.set({ data: { height: 2, id: "2" } } as Contracts.Crypto.IBlock);

		assert.equal(store.count(), 1);
		assert.equal(store.getIds(), ["2"]); // seems that the underlying CappedMap overwrites from beginning

		store.resize(2);
		store.set({ data: { height: 3, id: "3" } } as Contracts.Crypto.IBlock);

		assert.equal(store.count(), 2);
		assert.equal(store.getIds(), ["2", "3"]);
	});

	it("should clear all blocks", () => {
		const store = new BlockStore(4);

		for (let index = 1; index < 5; index++) {
			store.set({ data: { height: index, id: index.toString() } } as Contracts.Crypto.IBlock);
		}

		assert.equal(store.count(), 4);
		assert.equal(store.values().length, 4);

		store.clear();

		assert.equal(store.count(), 0);
	});
});
