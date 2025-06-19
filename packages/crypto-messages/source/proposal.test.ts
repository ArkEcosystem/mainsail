import { Contracts, Identifiers } from "@mainsail/contracts";

import { describe, Sandbox } from "../../test-framework/source";
import { blockData, proposalData, proposalDataWithValidRound, serializedBlock } from "../test/fixtures/proposal";
import { prepareSandbox } from "../test/helpers/prepare-sandbox";
import { Proposal } from "./proposal";
import { assertProposedData } from "../test/helpers/asserts";

describe<{
	sandbox: Sandbox;
	proposal: Proposal;
}>("Proposal", ({ it, beforeEach, assert }) => {
	const data: Contracts.Crypto.ProposedData = {
		block: {
			data: blockData,
			header: { ...blockData },
			serialized: serializedBlock.slice(2),
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

		context.sandbox.app.bind(Identifiers.State.Store).toConstantValue({});
		context.sandbox.app.bind(Identifiers.CryptoWorker.WorkerPool).toConstantValue(workerPool);

		const blockInstance = await context.sandbox.app
			.get<Contracts.Crypto.BlockFactory>(Identifiers.Cryptography.Block.Factory)
			.fromData(blockData);

		(data.block as any).transactions = blockInstance.transactions;

		context.proposal = context.sandbox.app.resolve(Proposal).initialize({
			...proposalData,
			dataSerialized: data.serialized,
			blockNumber: data.block.data.number,
			serialized: Buffer.from("dead", "hex"),
		});
	});

	it("#isDataDeserialized", ({ proposal }) => {
		assert.equal(proposal.isDataDeserialized, false);
	});

	it("#blockNumber", ({ proposal }) => {
		assert.equal(proposal.blockNumber, 2);
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
	it("#getData - should be ok", async ({ proposal }) => {
		await proposal.deserializeData();
		assertProposedData(assert, proposal.getData(), data);
	});

	it("#toString - should be ok", ({ proposal }) => {
		assert.equal(proposal.toString(), `{"blockNumber":2,"round":1,"validatorIndex":0}`);
	});

	it("#toString - should include block id after deserialization", async ({ proposal }) => {
		await proposal.deserializeData();

		assert.equal(
			proposal.toString(),
			`{"block":"82139a7708157c8e2b78f0db38216924c8a17f82e77d5997fb280b1435a6cc97","blockNumber":2,"round":1,"validatorIndex":0}`,
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
			blockNumber: data.block.data.number,
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
