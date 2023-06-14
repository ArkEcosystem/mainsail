import { describe, Sandbox } from "../../test-framework";
import { Prevote } from "./prevote";

describe<{
	sandbox: Sandbox;
}>("Prevote", ({ it, assert }) => {
	const prevote = new Prevote(
		1,
		1,
		undefined,
		0,
		"b22317bfdb10ba592724c27d0cdc51378e5cd94a12cd7e85c895d2a68e8589e8d3c5b3c80f4fe905ef67aa7827617d04110c5c5248f2bb36df97a58c541961ed0f2fcd0760e9de5ae1598f27638dd3ddaebeea08bf313832a57cfdb7f2baaa03",
	);

	it("#height", async () => {
		assert.equal(prevote.height, 1);
	});

	it("#round", async () => {
		assert.equal(prevote.round, 1);
	});

	it("#blockId", async () => {
		assert.undefined(prevote.blockId);
	});

	it("#validatorIndex", async () => {
		assert.equal(prevote.validatorIndex, 0);
	});

	it("#signature", async () => {
		assert.equal(
			prevote.signature,
			"b22317bfdb10ba592724c27d0cdc51378e5cd94a12cd7e85c895d2a68e8589e8d3c5b3c80f4fe905ef67aa7827617d04110c5c5248f2bb36df97a58c541961ed0f2fcd0760e9de5ae1598f27638dd3ddaebeea08bf313832a57cfdb7f2baaa03",
		);
	});

	it("#toString", async () => {
		assert.equal(prevote.toString(), `{"height":1,"round":1}`);
	});

	it("#toData", async () => {
		assert.equal(prevote.toData(), {
			height: 1,
			round: 1,
			blockId: undefined,
			signature:
				"b22317bfdb10ba592724c27d0cdc51378e5cd94a12cd7e85c895d2a68e8589e8d3c5b3c80f4fe905ef67aa7827617d04110c5c5248f2bb36df97a58c541961ed0f2fcd0760e9de5ae1598f27638dd3ddaebeea08bf313832a57cfdb7f2baaa03",
			validatorIndex: 0,
		});
	});
});
