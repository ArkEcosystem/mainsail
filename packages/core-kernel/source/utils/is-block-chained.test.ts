import { Contracts } from "@arkecosystem/core-contracts";

import { describe } from "../../../core-test-framework";
import { getBlockNotChainedErrorMessage, isBlockChained } from "./is-block-chained";

describe("", ({ assert, it, stub }) => {
	const slots = {
		getSlotNumber: () => {},
	};

	it("isBlockChained should be ok", async () => {
		const previousBlock: Partial<Contracts.Crypto.IBlockData> = {
			height: 1,
			id: "1",
			previousBlock: null,
			timestamp: 1,
		};

		const nextBlock: Partial<Contracts.Crypto.IBlockData> = {
			height: 2,
			id: "2",
			previousBlock: "1",
			timestamp: 2,
		};

		stub(slots, "getSlotNumber").resolvedValueNth(0, 1).resolvedValueNth(1, 2);

		assert.true(
			await isBlockChained(
				previousBlock as Contracts.Crypto.IBlockData,
				nextBlock as Contracts.Crypto.IBlockData,
				slots as Contracts.Crypto.Slots,
			),
		);
	});

	it("isBlockChained should not chain when previous block does not match", async () => {
		const previousBlock: Partial<Contracts.Crypto.IBlockData> = {
			height: 2,
			id: "2",
			previousBlock: null,
			timestamp: 2,
		};

		const nextBlock: Partial<Contracts.Crypto.IBlockData> = {
			height: 3,
			id: "1",
			previousBlock: "1",
			timestamp: 1,
		};

		stub(slots, "getSlotNumber").resolvedValueNth(0, 1).resolvedValueNth(1, 2);

		assert.false(
			await isBlockChained(
				previousBlock as Contracts.Crypto.IBlockData,
				nextBlock as Contracts.Crypto.IBlockData,
				slots as Contracts.Crypto.Slots,
			),
		);
	});

	it("isBlockChained should not chain when next height is not plus 1", async () => {
		const previousBlock: Partial<Contracts.Crypto.IBlockData> = {
			height: 1,
			id: "1",
			previousBlock: null,
			timestamp: 1,
		};

		const nextBlock: Partial<Contracts.Crypto.IBlockData> = {
			height: 3,
			id: "2",
			previousBlock: "1",
			timestamp: 2,
		};

		stub(slots, "getSlotNumber").resolvedValueNth(0, 1).resolvedValueNth(1, 2);

		assert.false(
			await isBlockChained(
				previousBlock as Contracts.Crypto.IBlockData,
				nextBlock as Contracts.Crypto.IBlockData,
				slots as Contracts.Crypto.Slots,
			),
		);
	});

	it("isBlockChained should not chain when same slot", async () => {
		const previousBlock: Partial<Contracts.Crypto.IBlockData> = {
			height: 1,
			id: "1",
			previousBlock: null,
			timestamp: 1,
		};

		const nextBlock: Partial<Contracts.Crypto.IBlockData> = {
			height: 2,
			id: "2",
			previousBlock: "1",
			timestamp: 2,
		};

		stub(slots, "getSlotNumber").resolvedValueNth(0, 1).resolvedValueNth(1, 1);

		assert.false(
			await isBlockChained(
				previousBlock as Contracts.Crypto.IBlockData,
				nextBlock as Contracts.Crypto.IBlockData,
				slots as Contracts.Crypto.Slots,
			),
		);
	});

	it("isBlockChained should not chain when lower slot", async () => {
		const previousBlock: Partial<Contracts.Crypto.IBlockData> = {
			height: 1,
			id: "1",
			previousBlock: null,
			timestamp: 1,
		};

		const nextBlock: Partial<Contracts.Crypto.IBlockData> = {
			height: 2,
			id: "2",
			previousBlock: "1",
			timestamp: 2,
		};

		stub(slots, "getSlotNumber").resolvedValueNth(0, 2).resolvedValueNth(1, 1);

		assert.false(
			await isBlockChained(
				previousBlock as Contracts.Crypto.IBlockData,
				nextBlock as Contracts.Crypto.IBlockData,
				slots as Contracts.Crypto.Slots,
			),
		);
	});

	it("getBlockNotChainedErrorMessage should throw when blocks are chained", async () => {
		const previousBlock: Partial<Contracts.Crypto.IBlockData> = {
			height: 1,
			id: "1",
			previousBlock: null,
			timestamp: 1,
		};

		const nextBlock: Partial<Contracts.Crypto.IBlockData> = {
			height: 2,
			id: "2",
			previousBlock: "1",
			timestamp: 2,
		};

		stub(slots, "getSlotNumber").resolvedValueNth(0, 1).resolvedValueNth(1, 2);

		await assert.rejects(
			() =>
				getBlockNotChainedErrorMessage(
					previousBlock as Contracts.Crypto.IBlockData,
					nextBlock as Contracts.Crypto.IBlockData,
					slots as Contracts.Crypto.Slots,
				),
			"Block had no chain error",
		);
	});

	it("getBlockNotChainedErrorMessage should report when previous block id does not match", async () => {
		const previousBlock: Partial<Contracts.Crypto.IBlockData> = {
			height: 2,
			id: "2",
			previousBlock: null,
			timestamp: 1,
		};

		const nextBlock: Partial<Contracts.Crypto.IBlockData> = {
			height: 3,
			id: "1",
			previousBlock: "1",
			timestamp: 2,
		};

		stub(slots, "getSlotNumber").resolvedValueNth(0, 1).resolvedValueNth(1, 2);

		assert.is(
			await getBlockNotChainedErrorMessage(
				previousBlock as Contracts.Crypto.IBlockData,
				nextBlock as Contracts.Crypto.IBlockData,
				slots as Contracts.Crypto.Slots,
			),
			"Block { height: 3, id: 1, previousBlock: 1 } is not chained to the previous block { height: 2, id: 2 }: previous block id mismatch",
		);
	});

	it("getBlockNotChainedErrorMessage should report when next height is not plus 1", async () => {
		const previousBlock: Partial<Contracts.Crypto.IBlockData> = {
			height: 1,
			id: "1",
			previousBlock: null,
			timestamp: 1,
		};

		const nextBlock: Partial<Contracts.Crypto.IBlockData> = {
			height: 3,
			id: "2",
			previousBlock: "1",
			timestamp: 2,
		};

		stub(slots, "getSlotNumber").resolvedValueNth(0, 1).resolvedValueNth(1, 2);

		assert.is(
			await getBlockNotChainedErrorMessage(
				previousBlock as Contracts.Crypto.IBlockData,
				nextBlock as Contracts.Crypto.IBlockData,
				slots as Contracts.Crypto.Slots,
			),
			"Block { height: 3, id: 2, previousBlock: 1 } is not chained to the previous block { height: 1, id: 1 }: height is not plus one",
		);
	});

	it("getBlockNotChainedErrorMessage should not chain when same slot", async () => {
		const previousBlock = {
			height: 1,
			id: "1",
			previousBlock: null,
			timestamp: 1,
		};

		const nextBlock = {
			height: 2,
			id: "2",
			previousBlock: "1",
			timestamp: 1,
		};

		stub(slots, "getSlotNumber").resolvedValueNth(0, 1).resolvedValueNth(1, 1);

		assert.is(
			await getBlockNotChainedErrorMessage(
				previousBlock as Contracts.Crypto.IBlockData,
				nextBlock as Contracts.Crypto.IBlockData,
				slots as Contracts.Crypto.Slots,
			),
			"Block { height: 2, id: 2, previousBlock: 1 } is not chained to the previous block { height: 1, id: 1 }: previous slot is not smaller: 1 (derived from timestamp 1) VS 1 (derived from timestamp 1)",
		);
	});

	it("getBlockNotChainedErrorMessage should not chain when lower slot", async () => {
		const previousBlock = {
			height: 1,
			id: "1",
			previousBlock: null,
			timestamp: 2,
		};

		const nextBlock = {
			height: 2,
			id: "2",
			previousBlock: "1",
			timestamp: 1,
		};

		stub(slots, "getSlotNumber").resolvedValueNth(0, 2).resolvedValueNth(1, 1);

		assert.is(
			await getBlockNotChainedErrorMessage(
				previousBlock as Contracts.Crypto.IBlockData,
				nextBlock as Contracts.Crypto.IBlockData,
				slots as Contracts.Crypto.Slots,
			),
			"Block { height: 2, id: 2, previousBlock: 1 } is not chained to the previous block { height: 1, id: 1 }: previous slot is not smaller: 2 (derived from timestamp 2) VS 1 (derived from timestamp 1)",
		);
	});
});
