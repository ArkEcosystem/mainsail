import { describe, Sandbox } from "../../test-framework/source";
import { precommitData } from "../test/fixtures/proposal";
import { Precommit } from "./precommit";

describe<{
	sandbox: Sandbox;
}>("Precommit", ({ it, assert }) => {
	const precommit = new Precommit({ ...precommitData, serialized: Buffer.from("dead", "hex") });

	it("#blockNumber", async () => {
		assert.equal(precommit.blockNumber, 1);
	});

	it("#round", async () => {
		assert.equal(precommit.round, 1);
	});

	it("#blockHash", async () => {
		assert.equal(precommit.blockHash, precommitData.blockHash);
	});

	it("#validatorIndex", async () => {
		assert.equal(precommit.validatorIndex, 0);
	});

	it("#signature", async () => {
		assert.equal(precommit.signature, precommitData.signature);
	});

	it("#signature", async () => {
		assert.equal(precommit.serialized.toString("hex"), "dead");
	});

	it("#toString", async () => {
		assert.equal(
			precommit.toString(),
			`{"blockHash":"${precommitData.blockHash}","blockNumber":1,"round":1,"signature":"${precommitData.signature}","validatorIndex":0}`,
		);
	});

	it("#toData", async () => {
		assert.equal(precommit.toData(), precommitData);
	});
});
