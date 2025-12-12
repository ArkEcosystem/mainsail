import { describe, Sandbox } from "../../test-framework/source";
import { prevoteData } from "../test/fixtures/index.js";
import { Message } from "./message.js";

describe<{
	sandbox: Sandbox;
}>("Message", ({ it, assert }) => {
	const message = new Message({ ...prevoteData, serialized: Buffer.from("dead", "hex") });

	it("#blockNumber", async () => {
		assert.equal(message.blockNumber, 1);
	});

	it("#round", async () => {
		assert.equal(message.round, 1);
	});

	it("#blockHash", async () => {
		assert.equal(message.blockHash, prevoteData.blockHash);
	});

	it("#validatorIndex", async () => {
		assert.equal(message.validatorIndex, 0);
	});

	it("#signature", async () => {
		assert.equal(message.signature, prevoteData.signature);
	});

	it("#serialized", async () => {
		assert.equal(message.serialized.toString("hex"), "dead");
	});

	it("#toString", async () => {
		assert.equal(
			message.toString(),
			`{"blockHash":"${prevoteData.blockHash}","blockNumber":1,"round":1,"signature":"${prevoteData.signature}","validatorIndex":0}`,
		);
	});
});
