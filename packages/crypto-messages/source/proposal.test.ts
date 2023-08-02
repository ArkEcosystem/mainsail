import { Contracts } from "@mainsail/contracts";
import { describe, Sandbox } from "../../test-framework";
import { blockData, proposalData, serializedBlock } from "../test/fixtures/proposal";
import { Proposal } from "./proposal";

describe<{
	sandbox: Sandbox;
}>("Proposal", ({ it, assert }) => {
	const block: Contracts.Crypto.IProposedBlock = {
		block: {
			header: { ...blockData, transactions: [] },
			serialized: serializedBlock,
			transactions: [],
			data: blockData,
		},
		serialized: serializedBlock,
	};

	const proposal = new Proposal({ ...proposalData, block, serialized: Buffer.from("dead", "hex") });

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
		assert.equal(proposal.signature, proposalData.signature);
	});

	it("#serialized", async () => {
		assert.equal(proposal.serialized.toString("hex"), "dead");
	});

	it("#toString", async () => {
		assert.equal(
			proposal.toString(),
			`{"block":"b99502ed7b675fad3f023a3b2d103be43a84941307663d3ccfb23b87d96f18a0","height":1,"round":1,"validatorIndex":0}`,
		);
	});

	it("#toData", async () => {
		assert.equal(proposal.toData(), proposalData);
	});
});
