import { Contracts, Identifiers } from "@mainsail/contracts";

import { describe, Sandbox } from "../../test-framework/source";
import { blockData, proposalData, proposalDataWithValidRound, serializedBlock } from "../test/fixtures/proposal";
import { prepareSandbox } from "../test/helpers/prepare-sandbox";
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

	beforeEach(async (context) => {
		await prepareSandbox(context);

		const workerPool = {
			getWorker: () => ({
				// @ts-ignore
				consensusSignature: (method, message, privateKey) =>
					context.sandbox.app
						.getTagged(Identifiers.Cryptography.Signature.Instance, "type", "consensus")!
						[method](message, privateKey),
			}),
		};

		context.sandbox.app.bind(Identifiers.State.Service).toConstantValue({});
		context.sandbox.app.bind(Identifiers.CryptoWorker.WorkerPool).toConstantValue(workerPool);

		context.proposal = context.sandbox.app.resolve(Proposal).initialize({
			...proposalData,
			dataSerialized: data.serialized,
			height: data.block.data.height,
			serialized: Buffer.from("dead", "hex"),
		});
	});

	it("#isDataDeserialized", ({ proposal }) => {
		assert.equal(proposal.isDataDeserialized, false);
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

	it("#getData - should throw error if not deserialized", async ({ proposal }) => {
		assert.throws(() => proposal.getData(), "Proposed data is not deserialized.");
	});

	// User assert block data
	it.skip("#getData - should be ok", async ({ proposal }) => {
		await proposal.deserializeData();
		assert.equal(proposal.getData(), data);
	});

	it("#toString - should be ok", ({ proposal }) => {
		assert.equal(proposal.toString(), `{"height":2,"round":1,"validatorIndex":0}`);
	});

	// TODO: update fixture
	it.skip("#toString - should include block id after deserialization", async ({ proposal }) => {
		await proposal.deserializeData();

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
			data: { serialized: data.serialized },
			round: proposalData.round,
			signature: proposalData.signature,
			validRound: proposalData.validRound,
			validatorIndex: proposalData.validatorIndex,
		});

		const proposalWithValidRound = sandbox.app.resolve(Proposal).initialize({
			...proposalDataWithValidRound,
			dataSerialized: data.serialized,
			height: data.block.data.height,
			serialized: Buffer.from("dead", "hex"),
		});

		assert.equal(proposalWithValidRound.toSerializableData(), {
			data: { serialized: data.serialized },
			round: proposalDataWithValidRound.round,
			signature: proposalDataWithValidRound.signature,
			validRound: proposalDataWithValidRound.validRound,
			validatorIndex: proposalDataWithValidRound.validatorIndex,
		});
	});
});
