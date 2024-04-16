import { Contracts } from "@mainsail/contracts";

import { describe, Sandbox } from "../../test-framework/source";
import { blockData, proposalData, proposalDataWithValidRound, serializedBlock } from "../test/fixtures/proposal";
import { Proposal } from "./proposal";

describe<{
	sandbox: Sandbox;
}>("Proposal", ({ it, assert }) => {
	const data: Contracts.Crypto.ProposedData = {
		block: {
			data: blockData,
			header: { ...blockData, transactions: [] },
			serialized: serializedBlock,
			transactions: [],
		},
		serialized: serializedBlock,
	};

	const proposal = new Proposal({ ...proposalData, data, serialized: Buffer.from("dead", "hex") });
	const proposalWithValidRound = new Proposal({
		...proposalDataWithValidRound,
		data,
		serialized: Buffer.from("dead", "hex"),
	});

	it("#isDataDeserialized", () => {
		assert.equal(proposal.isDataDeserialized, true);
	});

	it("#height", () => {
		assert.equal(proposal.height, 2);
	});

	it("#round", () => {
		assert.equal(proposal.round, 1);
	});

	it("#validRound", () => {
		assert.undefined(proposal.validRound);
	});

	it("#validatorIndex", () => {
		assert.equal(proposal.validatorIndex, 0);
	});

	it("#signature", () => {
		assert.equal(proposal.signature, proposalData.signature);
	});

	it("#serialized", () => {
		assert.equal(proposal.serialized.toString("hex"), "dead");
	});

	it("#getData", () => {
		assert.equal(proposal.getData(), data);
	});

	it("#toString", () => {
		assert.equal(
			proposal.toString(),
			`{"block":"3b76ae07ded37bbab2d56302f7ab09f302ec1a815a53c80ee9805d9c8c8eca19","height":2,"round":1,"validatorIndex":0}`,
		);
	});

	it("#toData", () => {
		assert.equal(proposal.toData(), proposalData);
	});

	it("#toSerializableData", () => {
		assert.equal(proposal.toSerializableData(), {
			data,
			round: proposalData.round,
			signature: proposalData.signature,
			validRound: proposalData.validRound,
			validatorIndex: proposalData.validatorIndex,
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
