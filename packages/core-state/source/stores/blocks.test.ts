import { BlockStore } from "./blocks";
import { Interfaces } from "@arkecosystem/crypto";
import { describe } from "@arkecosystem/core-test-framework";

describe("BlockStore", ({ it, assert }) => {
	it("should push and get a block", () => {
		const block: Interfaces.IBlock = {
			data: { height: 1, id: "1", previousBlock: undefined },
		} as Interfaces.IBlock;

		const store = new BlockStore(100);
		store.set(block);

		assert.equal(store.count(), 1);
		assert.equal(store.get(block.data.id), block.data);
		assert.equal(store.get(block.data.height), block.data);
	});

	it("should fail to push a block if its height is not 1 and there is no last block", () => {
		const store = new BlockStore(2);

		assert.throws(() => store.set({ data: { height: 3, id: "3" } } as Interfaces.IBlock));
	});

	it("should fail to push a block if it does not contain an id", () => {
		const store = new BlockStore(2);

		assert.throws(() => store.set({ data: { height: 1 } } as Interfaces.IBlock));
	});

	it("should fail to push a block if it isn't chained", () => {
		const store = new BlockStore(2);
		store.set({ data: { height: 1, id: "1" } } as Interfaces.IBlock);

		assert.throws(() => store.set({ data: { height: 3, id: "3" } } as Interfaces.IBlock));
	});

	it("should return all ids and heights in the order they were inserted", () => {
		const store = new BlockStore(4);

		for (let i = 1; i < 5; i++) {
			store.set({ data: { id: i.toString(), height: i } } as Interfaces.IBlock);
		}

		assert.equal(store.count(), 4);
		assert.equal(store.getIds(), ["1", "2", "3", "4"]);
		assert.equal(store.getHeights(), [1, 2, 3, 4]);
	});

	it("should return whether the store contains a specific block", () => {
		const store = new BlockStore(4);

		for (let i = 1; i < 5; i++) {
			store.set({ data: { id: i.toString(), height: i } } as Interfaces.IBlock);
		}

		assert.true(store.has({ height: 1, id: "1" } as Interfaces.IBlockData));
		assert.false(store.has({ height: 5, id: "5" } as Interfaces.IBlockData));
	});

	it("should delete blocks", () => {
		const store = new BlockStore(4);

		for (let i = 1; i < 5; i++) {
			store.set({ data: { id: i.toString(), height: i } } as Interfaces.IBlock);
		}

		store.delete({ height: 4, id: "4" } as Interfaces.IBlockData);

		assert.equal(store.count(), 3);
		assert.false(store.has({ height: 4, id: "4" } as Interfaces.IBlockData));
	});

	// TODO: check this is the desired behaviour
	it("should be resizeable", () => {
		const store = new BlockStore(1);
		store.set({ data: { height: 1, id: "1" } } as Interfaces.IBlock);
		store.set({ data: { height: 2, id: "2" } } as Interfaces.IBlock);

		assert.equal(store.count(), 1);
		assert.equal(store.getIds(), ["2"]); // seems that the underlying CappedMap overwrites from beginning

		store.resize(2);
		store.set({ data: { height: 3, id: "3" } } as Interfaces.IBlock);

		assert.equal(store.count(), 2);
		assert.equal(store.getIds(), ["2", "3"]);
	});

	it("should clear all blocks", () => {
		const store = new BlockStore(4);

		for (let i = 1; i < 5; i++) {
			store.set({ data: { id: i.toString(), height: i } } as Interfaces.IBlock);
		}

		assert.equal(store.count(), 4);
		assert.equal(store.values().length, 4);

		store.clear();

		assert.equal(store.count(), 0);
	});
});
