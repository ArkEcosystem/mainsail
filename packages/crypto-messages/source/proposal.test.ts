import { Contracts } from "@mainsail/contracts";

import { describe, Sandbox } from "../../test-framework/source";
import { blockData, proposalData, proposalDataWithValidRound, serializedBlock } from "../test/fixtures/proposal";
import { Proposal } from "./proposal";

describe<{
	sandbox: Sandbox;
	proposal: Proposal;
}>("Proposal", ({ it, beforeEach, assert }) => {
	const data: Contracts.Crypto.ProposedData = {
		block: {
			data: blockData,
			header: { ...blockData, transactions: [] },
			serialized: serializedBlock,
			transactions: [],
		},
		serialized: serializedBlock,
	};

	beforeEach((context) => {
		context.sandbox = new Sandbox();
		context.proposal = context.sandbox.app
			.resolve(Proposal)
			.initialize({ ...proposalData, data, serialized: Buffer.from("dead", "hex") });
	});

	it("#isDataDeserialized", ({ proposal }) => {
		assert.equal(proposal.isDataDeserialized, true);
	});

	it("#height", ({ proposal }) => {
		assert.equal(proposal.height, 2);
	});

	it("#round", ({ proposal }) => {
		assert.equal(proposal.round, 1);
	});

	it("#validRound", ({ proposal }) => {
		assert.undefined(proposal.validRound);
	});

	it("#validatorIndex", ({ proposal }) => {
		assert.equal(proposal.validatorIndex, 0);
	});

	it("#signature", ({ proposal }) => {
		assert.equal(proposal.signature, proposalData.signature);
	});

	it("#serialized", ({ proposal }) => {
		assert.equal(proposal.serialized.toString("hex"), "dead");
	});

	it("#getData", ({ proposal }) => {
		assert.equal(proposal.getData(), data);
	});

	it("#toString", ({ proposal }) => {
		assert.equal(
			proposal.toString(),
			`{"block":"3b76ae07ded37bbab2d56302f7ab09f302ec1a815a53c80ee9805d9c8c8eca19","height":2,"round":1,"validatorIndex":0}`,
		);
	});

	it("#toData", ({ proposal }) => {
		assert.equal(proposal.toData(), proposalData);
	});

	it("#toSerializableData", ({ sandbox, proposal }) => {
		assert.equal(proposal.toSerializableData(), {
			data,
			round: proposalData.round,
			signature: proposalData.signature,
			validRound: proposalData.validRound,
			validatorIndex: proposalData.validatorIndex,
		});

		const proposalWithValidRound = sandbox.app.resolve(Proposal).initialize({
			...proposalDataWithValidRound,
			data,
			serialized: Buffer.from("dead", "hex"),
		});

		assert.equal(proposalWithValidRound.toSerializableData(), {
			data,
			round: proposalDataWithValidRound.round,
			signature: proposalDataWithValidRound.signature,
			validRound: proposalDataWithValidRound.validRound,
			validatorIndex: proposalDataWithValidRound.validatorIndex,
		});
	});
});
