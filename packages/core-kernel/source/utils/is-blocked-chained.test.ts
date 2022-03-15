import { Crypto, Interfaces } from "@arkecosystem/crypto";

import { describe } from "../../../core-test-framework";
import { getBlockNotChainedErrorMessage, isBlockChained } from "./is-block-chained";

const mockGetBlockTimeLookup = (height: number) => {
	switch (height) {
		case 1:
			return 0;
		default:
			throw new Error(`Test scenarios should not hit this line`);
	}
};

describe("", ({ assert, it }) => {
	it("isBlockChained should be ok", () => {
		const previousBlock = {
			id: "1",
			timestamp: Crypto.Slots.getSlotTime(mockGetBlockTimeLookup, 0),
			height: 1,
			previousBlock: null,
		} as Interfaces.IBlockData;

		const nextBlock = {
			id: "2",
			timestamp: Crypto.Slots.getSlotTime(mockGetBlockTimeLookup, 1),
			height: 2,
			previousBlock: "1",
		} as Interfaces.IBlockData;

		assert.true(isBlockChained(previousBlock, nextBlock, mockGetBlockTimeLookup));
	});

	it("isBlockChained should not chain when previous block does not match", () => {
		const previousBlock = {
			id: "2",
			timestamp: Crypto.Slots.getSlotTime(mockGetBlockTimeLookup, 0),
			height: 2,
			previousBlock: null,
		} as Interfaces.IBlockData;

		const nextBlock = {
			id: "1",
			timestamp: Crypto.Slots.getSlotTime(mockGetBlockTimeLookup, 1),
			height: 3,
			previousBlock: "1",
		} as Interfaces.IBlockData;

		assert.false(isBlockChained(previousBlock, nextBlock, mockGetBlockTimeLookup));
	});

	it("isBlockChained should not chain when next height is not plus 1", () => {
		const previousBlock = {
			id: "1",
			timestamp: Crypto.Slots.getSlotTime(mockGetBlockTimeLookup, 0),
			height: 1,
			previousBlock: null,
		} as Interfaces.IBlockData;

		const nextBlock = {
			id: "2",
			timestamp: Crypto.Slots.getSlotTime(mockGetBlockTimeLookup, 1),
			height: 3,
			previousBlock: "1",
		} as Interfaces.IBlockData;

		assert.false(isBlockChained(previousBlock, nextBlock, mockGetBlockTimeLookup));
	});

	it("isBlockChained should not chain when same slot", () => {
		const previousBlock = {
			id: "1",
			timestamp: Crypto.Slots.getSlotTime(mockGetBlockTimeLookup, 0),
			height: 1,
			previousBlock: null,
		} as Interfaces.IBlockData;

		const nextBlock = {
			id: "2",
			timestamp: Crypto.Slots.getSlotTime(mockGetBlockTimeLookup, 0),
			height: 2,
			previousBlock: "1",
		} as Interfaces.IBlockData;

		assert.false(isBlockChained(previousBlock, nextBlock, mockGetBlockTimeLookup));
	});

	it("isBlockChained should not chain when lower slot", () => {
		const previousBlock = {
			id: "1",
			timestamp: Crypto.Slots.getSlotTime(mockGetBlockTimeLookup, 1),
			height: 1,
			previousBlock: null,
		} as Interfaces.IBlockData;

		const nextBlock = {
			id: "2",
			timestamp: Crypto.Slots.getSlotTime(mockGetBlockTimeLookup, 0),
			height: 2,
			previousBlock: "1",
		} as Interfaces.IBlockData;

		assert.false(isBlockChained(previousBlock, nextBlock, mockGetBlockTimeLookup));
	});

	it("getBlockNotChainedErrorMessage should throw when blocks are chained", async () => {
		const previousBlock = {
			id: "1",
			timestamp: Crypto.Slots.getSlotTime(mockGetBlockTimeLookup, 0),
			height: 1,
			previousBlock: null,
		} as Interfaces.IBlockData;

		const nextBlock = {
			id: "2",
			timestamp: Crypto.Slots.getSlotTime(mockGetBlockTimeLookup, 1),
			height: 2,
			previousBlock: "1",
		} as Interfaces.IBlockData;

		const check = () => getBlockNotChainedErrorMessage(previousBlock, nextBlock, mockGetBlockTimeLookup);

		await assert.rejects(check);
	});

	it("getBlockNotChainedErrorMessage should report when previous block id does not match", () => {
		const previousBlock = {
			id: "2",
			timestamp: Crypto.Slots.getSlotTime(mockGetBlockTimeLookup, 0),
			height: 2,
			previousBlock: null,
		} as Interfaces.IBlockData;

		const nextBlock = {
			id: "1",
			timestamp: Crypto.Slots.getSlotTime(mockGetBlockTimeLookup, 1),
			height: 3,
			previousBlock: "1",
		} as Interfaces.IBlockData;

		const msg = getBlockNotChainedErrorMessage(previousBlock, nextBlock, mockGetBlockTimeLookup);

		assert.is(
			msg,
			"Block { height: 3, id: 1, previousBlock: 1 } is not chained to the previous block { height: 2, id: 2 }: previous block id mismatch",
		);
	});

	it("getBlockNotChainedErrorMessage should report when next height is not plus 1", () => {
		const previousBlock = {
			id: "1",
			timestamp: Crypto.Slots.getSlotTime(mockGetBlockTimeLookup, 0),
			height: 1,
			previousBlock: null,
		} as Interfaces.IBlockData;

		const nextBlock = {
			id: "2",
			timestamp: Crypto.Slots.getSlotTime(mockGetBlockTimeLookup, 1),
			height: 3,
			previousBlock: "1",
		} as Interfaces.IBlockData;

		const msg = getBlockNotChainedErrorMessage(previousBlock, nextBlock, mockGetBlockTimeLookup);

		assert.is(
			msg,
			"Block { height: 3, id: 2, previousBlock: 1 } is not chained to the previous block { height: 1, id: 1 }: height is not plus one",
		);
	});

	it("getBlockNotChainedErrorMessage should not chain when same slot", () => {
		const previousBlock = {
			id: "1",
			timestamp: Crypto.Slots.getSlotTime(mockGetBlockTimeLookup, 0),
			height: 1,
			previousBlock: null,
		} as Interfaces.IBlockData;

		const nextBlock = {
			id: "2",
			timestamp: Crypto.Slots.getSlotTime(mockGetBlockTimeLookup, 0),
			height: 2,
			previousBlock: "1",
		} as Interfaces.IBlockData;

		const msg = getBlockNotChainedErrorMessage(previousBlock, nextBlock, mockGetBlockTimeLookup);

		assert.is(
			msg,
			"Block { height: 2, id: 2, previousBlock: 1 } is not chained to the previous block { height: 1, id: 1 }: previous slot is not smaller: 0 (derived from timestamp 0) VS 0 (derived from timestamp 0)",
		);
	});

	it("getBlockNotChainedErrorMessage should not chain when lower slot", () => {
		const previousBlock = {
			id: "1",
			timestamp: Crypto.Slots.getSlotTime(mockGetBlockTimeLookup, 1),
			height: 1,
			previousBlock: null,
		} as Interfaces.IBlockData;

		const nextBlock = {
			id: "2",
			timestamp: Crypto.Slots.getSlotTime(mockGetBlockTimeLookup, 0),
			height: 2,
			previousBlock: "1",
		} as Interfaces.IBlockData;

		const msg = getBlockNotChainedErrorMessage(previousBlock, nextBlock, mockGetBlockTimeLookup);

		assert.is(
			msg,
			"Block { height: 2, id: 2, previousBlock: 1 } is not chained to the previous block { height: 1, id: 1 }: previous slot is not smaller: 1 (derived from timestamp 8) VS 0 (derived from timestamp 0)",
		);
	});
});
