import { Contracts } from "@mainsail/contracts";
import { describe, Sandbox } from "../../test-framework";
import { Precommit } from "./precommit";
import { precommitData } from "../test/fixtures/proposal";

describe<{
	sandbox: Sandbox;
}>("Precommit", ({ it, assert }) => {
	const precommit = new Precommit(precommitData);

	it("#height", async () => {
		assert.equal(precommit.height, 1);
	});

	it("#round", async () => {
		assert.equal(precommit.round, 1);
	});

	it("#blockId", async () => {
		assert.equal(precommit.blockId, precommitData.blockId);
	});

	it("#validatorIndex", async () => {
		assert.equal(precommit.validatorIndex, 0);
	});

	it("#signature", async () => {
		assert.equal(precommit.signature, precommitData.signature);
	});

	it("#toString", async () => {
		assert.equal(
			precommit.toString(),
			`{"blockId":"${precommitData.blockId}","height":1,"round":1,"signature":"${precommitData.signature}","validatorIndex":0}`,
		);
	});

	it("#toData", async () => {
		assert.equal(precommit.toData(), precommitData);
	});
});
