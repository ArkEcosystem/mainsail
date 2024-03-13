import { describe, Sandbox } from "../../test-framework/source";
import { prevoteData } from "../test/fixtures/proposal";
import { Prevote } from "./prevote";

describe<{
	sandbox: Sandbox;
}>("Prevote", ({ it, assert }) => {
	const prevote = new Prevote({ ...prevoteData, serialized: Buffer.from("dead", "hex") });

	it("#height", async () => {
		assert.equal(prevote.height, 1);
	});

	it("#round", async () => {
		assert.equal(prevote.round, 1);
	});

	it("#blockId", async () => {
		assert.equal(prevote.blockId, prevoteData.blockId);
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
			`{"blockId":"${prevoteData.blockId}","height":1,"round":1,"signature":"${prevoteData.signature}","validatorIndex":0}`,
		);
	});

	it("#toData", async () => {
		assert.equal(prevote.toData(), prevoteData);
	});
});
