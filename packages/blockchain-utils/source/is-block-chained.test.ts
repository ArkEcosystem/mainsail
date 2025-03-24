import { Contracts } from "@mainsail/contracts";

import { describe } from "../../test-framework/source";
import { getBlockNotChainedErrorMessage, isBlockChained } from "./is-block-chained";

describe("", ({ assert, it, stub }) => {
	const slots = {
		getSlotNumber: () => {},
	};

	it("isBlockChained should be ok", async () => {
		const parentHash: Partial<Contracts.Crypto.BlockData> = {
			number: 1,
			hash: "1",
			parentHash: undefined,
			timestamp: 1,
		};

		const nextBlock: Partial<Contracts.Crypto.BlockData> = {
			number: 2,
			hash: "2",
			parentHash: "1",
			timestamp: 2,
		};

		stub(slots, "getSlotNumber").resolvedValueNth(0, 1).resolvedValueNth(1, 2);

		assert.true(
			await isBlockChained(
				parentHash as Contracts.Crypto.BlockData,
				nextBlock as Contracts.Crypto.BlockData,
				slots as Contracts.Crypto.Slots,
			),
		);
	});

	it("isBlockChained should not chain when previous block does not match", async () => {
		const parentHash: Partial<Contracts.Crypto.BlockData> = {
			number: 2,
			hash: "2",
			parentHash: undefined,
			timestamp: 2,
		};

		const nextBlock: Partial<Contracts.Crypto.BlockData> = {
			number: 3,
			hash: "1",
			parentHash: "1",
			timestamp: 1,
		};

		stub(slots, "getSlotNumber").resolvedValueNth(0, 1).resolvedValueNth(1, 2);

		assert.false(
			await isBlockChained(
				parentHash as Contracts.Crypto.BlockData,
				nextBlock as Contracts.Crypto.BlockData,
				slots as Contracts.Crypto.Slots,
			),
		);
	});

	it("isBlockChained should not chain when next number is not plus 1", async () => {
		const parentHash: Partial<Contracts.Crypto.BlockData> = {
			number: 1,
			hash: "1",
			parentHash: undefined,
			timestamp: 1,
		};

		const nextBlock: Partial<Contracts.Crypto.BlockData> = {
			number: 3,
			hash: "2",
			parentHash: "1",
			timestamp: 2,
		};

		stub(slots, "getSlotNumber").resolvedValueNth(0, 1).resolvedValueNth(1, 2);

		assert.false(
			await isBlockChained(
				parentHash as Contracts.Crypto.BlockData,
				nextBlock as Contracts.Crypto.BlockData,
				slots as Contracts.Crypto.Slots,
			),
		);
	});

	it("isBlockChained should not chain when same timestamp", async () => {
		const parentHash: Partial<Contracts.Crypto.BlockData> = {
			number: 1,
			hash: "1",
			parentHash: undefined,
			timestamp: 1,
		};

		const nextBlock: Partial<Contracts.Crypto.BlockData> = {
			number: 2,
			hash: "2",
			parentHash: "1",
			timestamp: 1,
		};

		stub(slots, "getSlotNumber").resolvedValueNth(0, 1).resolvedValueNth(1, 1);

		assert.false(
			await isBlockChained(
				parentHash as Contracts.Crypto.BlockData,
				nextBlock as Contracts.Crypto.BlockData,
				slots as Contracts.Crypto.Slots,
			),
		);
	});

	it("isBlockChained should not chain when lower timestamp", async () => {
		const parentHash: Partial<Contracts.Crypto.BlockData> = {
			number: 1,
			hash: "1",
			parentHash: undefined,
			timestamp: 2,
		};

		const nextBlock: Partial<Contracts.Crypto.BlockData> = {
			number: 2,
			hash: "2",
			parentHash: "1",
			timestamp: 1,
		};

		stub(slots, "getSlotNumber").resolvedValueNth(0, 2).resolvedValueNth(1, 1);

		assert.false(
			await isBlockChained(
				parentHash as Contracts.Crypto.BlockData,
				nextBlock as Contracts.Crypto.BlockData,
				slots as Contracts.Crypto.Slots,
			),
		);
	});

	it("getBlockNotChainedErrorMessage should throw when blocks are chained", async () => {
		const parentHash: Partial<Contracts.Crypto.BlockData> = {
			number: 1,
			hash: "1",
			parentHash: undefined,
			timestamp: 1,
		};

		const nextBlock: Partial<Contracts.Crypto.BlockData> = {
			number: 2,
			hash: "2",
			parentHash: "1",
			timestamp: 2,
		};

		stub(slots, "getSlotNumber").resolvedValueNth(0, 1).resolvedValueNth(1, 2);

		await assert.rejects(
			() =>
				getBlockNotChainedErrorMessage(
					parentHash as Contracts.Crypto.BlockData,
					nextBlock as Contracts.Crypto.BlockData,
					slots as Contracts.Crypto.Slots,
				),
			"Block had no chain error",
		);
	});

	it("getBlockNotChainedErrorMessage should report when previous block hash does not match", async () => {
		const parentHash: Partial<Contracts.Crypto.BlockData> = {
			number: 2,
			hash: "2",
			parentHash: undefined,
			timestamp: 1,
		};

		const nextBlock: Partial<Contracts.Crypto.BlockData> = {
			number: 3,
			hash: "1",
			parentHash: "1",
			timestamp: 2,
		};

		stub(slots, "getSlotNumber").resolvedValueNth(0, 1).resolvedValueNth(1, 2);

		assert.is(
			await getBlockNotChainedErrorMessage(
				parentHash as Contracts.Crypto.BlockData,
				nextBlock as Contracts.Crypto.BlockData,
				slots as Contracts.Crypto.Slots,
			),
			"Block { number: 3, hash: 1, parentHash: 1 } is not chained to the previous block { number: 2, hash: 2 }: previous block hash mismatch",
		);
	});

	it("getBlockNotChainedErrorMessage should report when next number is not plus 1", async () => {
		const parentHash: Partial<Contracts.Crypto.BlockData> = {
			number: 1,
			hash: "1",
			parentHash: undefined,
			timestamp: 1,
		};

		const nextBlock: Partial<Contracts.Crypto.BlockData> = {
			number: 3,
			hash: "2",
			parentHash: "1",
			timestamp: 2,
		};

		stub(slots, "getSlotNumber").resolvedValueNth(0, 1).resolvedValueNth(1, 2);

		assert.is(
			await getBlockNotChainedErrorMessage(
				parentHash as Contracts.Crypto.BlockData,
				nextBlock as Contracts.Crypto.BlockData,
				slots as Contracts.Crypto.Slots,
			),
			"Block { number: 3, hash: 2, parentHash: 1 } is not chained to the previous block { number: 1, hash: 1 }: number is not plus one",
		);
	});

	it("getBlockNotChainedErrorMessage should not chain when same timestamp", async () => {
		const parentHash = {
			number: 1,
			hash: "1",
			parentHash: undefined,
			timestamp: 1,
		};

		const nextBlock = {
			number: 2,
			hash: "2",
			parentHash: "1",
			timestamp: 1,
		};

		stub(slots, "getSlotNumber").resolvedValueNth(0, 1).resolvedValueNth(1, 1);

		assert.is(
			await getBlockNotChainedErrorMessage(
				parentHash as Contracts.Crypto.BlockData,
				nextBlock as Contracts.Crypto.BlockData,
				slots as Contracts.Crypto.Slots,
			),
			"Block { number: 2, hash: 2, parentHash: 1 } is not chained to the previous block { number: 1, hash: 1 }: previous timestamp is after current timestamp: 1 VS 1",
		);
	});

	it("getBlockNotChainedErrorMessage should not chain when lower timestamp", async () => {
		const parentHash = {
			number: 1,
			hash: "1",
			parentHash: undefined,
			timestamp: 2,
		};

		const nextBlock = {
			number: 2,
			hash: "2",
			parentHash: "1",
			timestamp: 1,
		};

		stub(slots, "getSlotNumber").resolvedValueNth(0, 2).resolvedValueNth(1, 1);

		assert.is(
			await getBlockNotChainedErrorMessage(
				parentHash as Contracts.Crypto.BlockData,
				nextBlock as Contracts.Crypto.BlockData,
				slots as Contracts.Crypto.Slots,
			),
			"Block { number: 2, hash: 2, parentHash: 1 } is not chained to the previous block { number: 1, hash: 1 }: previous timestamp is after current timestamp: 2 VS 1",
		);
	});
});
