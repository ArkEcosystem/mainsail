import { describe } from "@mainsail/test-runner";

import { randaoMessage } from "./randao";

describe("randaoMessage", ({ assert, it }) => {
	const genesisBlockHash = "27184b900e6f6a44eb0e1f0923b8214b351eee6b3736e8c07f75e5019bee2a92";

	it("should build the message as tag + genesis block hash + big-endian block number", () => {
		const message = randaoMessage(genesisBlockHash, 1);

		// 15-byte ASCII tag + 32-byte genesis hash + 4-byte block number
		assert.equal(message.length, 15 + 32 + 4);
		assert.equal(message.subarray(0, 15).toString(), "MAINSAIL_RANDAO");
		assert.equal(message.subarray(15, 47).toString("hex"), genesisBlockHash);
		assert.equal(message.subarray(47).toString("hex"), "00000001");
	});

	it("should pin the exact byte layout", () => {
		// Golden value: signer (validator) and verifier (processor) must never drift apart,
		// and any change to the layout is consensus-breaking for all existing reveals.
		assert.equal(
			randaoMessage(genesisBlockHash, 0x01_02_03_04).toString("hex"),
			"4d41494e5341494c5f52414e44414f" + genesisBlockHash + "01020304",
		);
	});

	it("should be deterministic for the same inputs", () => {
		assert.equal(randaoMessage(genesisBlockHash, 42), randaoMessage(genesisBlockHash, 42));
	});

	it("should produce a different message for a different block number", () => {
		assert.not.equal(
			randaoMessage(genesisBlockHash, 1).toString("hex"),
			randaoMessage(genesisBlockHash, 2).toString("hex"),
		);
	});

	it("should produce a different message for a different chain", () => {
		const otherGenesisBlockHash = "d9a6d087b433167ce5a99bd4a89dd0e6b21804bea3ef7488762a5bcadbb302cd";

		assert.not.equal(
			randaoMessage(genesisBlockHash, 1).toString("hex"),
			randaoMessage(otherGenesisBlockHash, 1).toString("hex"),
		);
	});

	it("should cover the full uint32 block number range", () => {
		assert.equal(randaoMessage(genesisBlockHash, 0).subarray(47).toString("hex"), "00000000");
		assert.equal(randaoMessage(genesisBlockHash, 0xff_ff_ff_ff).subarray(47).toString("hex"), "ffffffff");

		// Beyond uint32 the message would be ambiguous — writeUInt32BE must reject, not wrap.
		assert.throws(() => randaoMessage(genesisBlockHash, 0xff_ff_ff_ff + 1));
	});
});
