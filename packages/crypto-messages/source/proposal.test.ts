import { describe, Sandbox } from "../../test-framework";
import { blockData } from "../test/fixtures/proposal";
import { Proposal } from "./proposal";

describe<{
	sandbox: Sandbox;
}>("Proposal", ({ it, assert }) => {
	const block = {
		header: { ...blockData, transactions: [] },
		serialized: "",
		transactions: [],
		data: blockData,
	};

	const proposal = new Proposal(
		1,
		1,
		block,
		undefined,
		0,
		undefined,
		"b22317bfdb10ba592724c27d0cdc51378e5cd94a12cd7e85c895d2a68e8589e8d3c5b3c80f4fe905ef67aa7827617d04110c5c5248f2bb36df97a58c541961ed0f2fcd0760e9de5ae1598f27638dd3ddaebeea08bf313832a57cfdb7f2baaa03",
	);

	it("#height", async () => {
		assert.equal(proposal.height, 1);
	});

	it("#round", async () => {
		assert.equal(proposal.round, 1);
	});

	it("#validRound", async () => {
		assert.undefined(proposal.validRound);
	});

	it("#block", async () => {
		assert.equal(proposal.block, block);
	});

	it("#validatorIndex", async () => {
		assert.equal(proposal.validatorIndex, 0);
	});

	it("#signature", async () => {
		assert.equal(
			proposal.signature,
			"b22317bfdb10ba592724c27d0cdc51378e5cd94a12cd7e85c895d2a68e8589e8d3c5b3c80f4fe905ef67aa7827617d04110c5c5248f2bb36df97a58c541961ed0f2fcd0760e9de5ae1598f27638dd3ddaebeea08bf313832a57cfdb7f2baaa03",
		);
	});

	it("#toString", async () => {
		assert.equal(
			proposal.toString(),
			`{"block":"de6fbaaf4535dee0e243d455793a0f869a5af59de7989271d45583df5f710e8a","height":1,"round":1,"validatorIndex":0}`,
		);
	});

	it("#toData", async () => {
		assert.equal(proposal.toData(), {
			height: 1,
			round: 1,
			validRound: undefined,
			lockProof: undefined,
			block,
			signature:
				"b22317bfdb10ba592724c27d0cdc51378e5cd94a12cd7e85c895d2a68e8589e8d3c5b3c80f4fe905ef67aa7827617d04110c5c5248f2bb36df97a58c541961ed0f2fcd0760e9de5ae1598f27638dd3ddaebeea08bf313832a57cfdb7f2baaa03",
			validatorIndex: 0,
		});
	});
});
