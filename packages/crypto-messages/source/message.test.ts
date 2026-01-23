import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";
import { prevoteData, precommitData } from "../test/fixtures/index.js";
import { Message } from "./message.js";

describe<{
	app: Application;
}>("Message", ({ it, assert }) => {
	const prevote = new Message({ ...prevoteData, serialized: Buffer.from("dead", "hex") });
	const precommit = new Message({ ...precommitData, serialized: Buffer.from("dead", "hex") });

	it("#type", async () => {
		assert.equal(prevote.type, 1);
		assert.equal(precommit.type, 2);
	});

	it("#blockNumber", async () => {
		assert.equal(prevote.blockNumber, 1);
		assert.equal(precommit.blockNumber, 1);
	});

	it("#round", async () => {
		assert.equal(prevote.round, 1);
		assert.equal(precommit.round, 1);
	});

	it("#blockHash", async () => {
		assert.equal(prevote.blockHash, prevoteData.blockHash);
		assert.equal(precommit.blockHash, precommitData.blockHash);
	});

	it("#validatorIndex", async () => {
		assert.equal(prevote.validatorIndex, 0);
		assert.equal(precommit.validatorIndex, 0);
	});

	it("#signature", async () => {
		assert.equal(prevote.signature, prevoteData.signature);
		assert.equal(precommit.signature, precommitData.signature);
	});

	it("#serialized", async () => {
		assert.equal(prevote.serialized.toString("hex"), "dead");
		assert.equal(precommit.serialized.toString("hex"), "dead");
	});

	it("#toString", async () => {
		assert.equal(
			prevote.toString(),
			`{"blockHash":"${prevoteData.blockHash}","blockNumber":1,"round":1,"signature":"${prevoteData.signature}","type":1,"validatorIndex":0}`,
		);

		assert.equal(
			precommit.toString(),
			`{"blockHash":"${precommitData.blockHash}","blockNumber":1,"round":1,"signature":"${precommitData.signature}","type":2,"validatorIndex":0}`,
		);
	});
});
