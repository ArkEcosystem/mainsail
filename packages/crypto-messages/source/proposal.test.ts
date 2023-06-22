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

	const proposal = new Proposal({ ...proposalData, block });

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

	it("#toString", async () => {
		assert.equal(
			proposal.toString(),
			`{"block":"de6fbaaf4535dee0e243d455793a0f869a5af59de7989271d45583df5f710e8a","height":1,"round":1,"validatorIndex":0}`,
		);
	});

	it("#toData", async () => {
		assert.equal(proposal.toData(), proposalData);
	});
});
