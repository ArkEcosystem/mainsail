import { describe, Sandbox } from "../../test-framework";
import { blockData } from "../test/fixtures/proposal";
import { Proposal } from "./proposal";

describe<{
	sandbox: Sandbox;
}>("Proposal", ({ it, assert }) => {
	const block = {
		header: { ...blockData, transactions: undefined },
		serialized: "",
		transactions: [],
		data: blockData,
	};

	const proposal = new Proposal(
		1,
		1,
		block,
		"95af988701a6fb60e09da41d2ca1a9e0b49e43501bda4255b3ca01073f490c34102b6bbcafde6333185e9980745d72cb",
		"b22317bfdb10ba592724c27d0cdc51378e5cd94a12cd7e85c895d2a68e8589e8d3c5b3c80f4fe905ef67aa7827617d04110c5c5248f2bb36df97a58c541961ed0f2fcd0760e9de5ae1598f27638dd3ddaebeea08bf313832a57cfdb7f2baaa03",
	);

	it("#signature", async () => {
		assert.equal(
			proposal.signature,
			"b22317bfdb10ba592724c27d0cdc51378e5cd94a12cd7e85c895d2a68e8589e8d3c5b3c80f4fe905ef67aa7827617d04110c5c5248f2bb36df97a58c541961ed0f2fcd0760e9de5ae1598f27638dd3ddaebeea08bf313832a57cfdb7f2baaa03",
		);
	});

	it("#toString", async () => {
		assert.equal(
			proposal.toString(),
			`{"block":"e6ece29ff55b818dd22f1c2b2c420b374d8b9ce4a9e602816cab6d08ee754ca7","height":1,"round":1,"validatorPublicKey":"95af988701a6fb60e09da41d2ca1a9e0b49e43501bda4255b3ca01073f490c34102b6bbcafde6333185e9980745d72cb"}`,
		);
	});

	it("#toData", async () => {
		assert.equal(proposal.toData(), {
			height: 1,
			round: 1,
			block,
			signature:
				"b22317bfdb10ba592724c27d0cdc51378e5cd94a12cd7e85c895d2a68e8589e8d3c5b3c80f4fe905ef67aa7827617d04110c5c5248f2bb36df97a58c541961ed0f2fcd0760e9de5ae1598f27638dd3ddaebeea08bf313832a57cfdb7f2baaa03",
			validatorPublicKey:
				"95af988701a6fb60e09da41d2ca1a9e0b49e43501bda4255b3ca01073f490c34102b6bbcafde6333185e9980745d72cb",
		});
	});
});
