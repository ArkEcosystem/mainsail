import { describe, Sandbox } from "../../test-framework/source";
import { prevoteData } from "../test/fixtures/proposal";
import { Prevote } from "./prevote";

describe<{
	sandbox: Sandbox;
}>("Prevote", ({ it, assert }) => {
	const prevote = new Prevote({ ...prevoteData, serialized: Buffer.from("dead", "hex") });

	it("#blockNumber", async () => {
		assert.equal(prevote.blockNumber, 1);
	});

	it("#round", async () => {
		assert.equal(prevote.round, 1);
	});

	it("#blockHash", async () => {
		assert.equal(prevote.blockHash, prevoteData.blockHash);
	});

	it("#validatorIndex", async () => {
		assert.equal(prevote.validatorIndex, 0);
	});

	it("#signature", async () => {
		assert.equal(prevote.signature, prevoteData.signature);
	});

	it("#serialized", async () => {
		assert.equal(prevote.serialized.toString("hex"), "dead");
	});

	it("#toString", async () => {
		assert.equal(
			prevote.toString(),
			`{"blockHash":"${prevoteData.blockHash}","blockNumber":1,"round":1,"signature":"${prevoteData.signature}","validatorIndex":0}`,
		);
	});

	it("#toData", async () => {
		assert.equal(prevote.toData(), prevoteData);
	});
});
