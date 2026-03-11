import { Identifiers } from "@mainsail/constants";
import type { Contracts } from "@mainsail/contracts";

import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";
import {
	blockHeader,
	blockSerialized,
	Proposal as ProposalWithoutValidRound,
	ProposalWithValidRound,
	ProposalWithLockProof,
	ProposalWithLockProofAndValidRound
} from "../test/fixtures/index.js";
import { prepareSandbox } from "../test/helpers/prepare-sandbox";
import { Proposal } from "./proposal.js";
import { assertBlock } from "../test/helpers/asserts";

describe<{
	app: Application;
	proposal: Proposal;
}>("Proposal", ({ it, beforeEach, assert, spy }) => {

	beforeEach(async (context) => {
		await prepareSandbox(context);

		const workerPool = {
			getWorker: () => ({
				// @ts-ignore
				consensusSignature: (method, message, privateKey) =>
					context.app
						.getTagged(Identifiers.Cryptography.Signature.Instance, "type", "consensus")!
						[method](message, privateKey),
				// @ts-ignore
				transactionFactory: (method, message, privateKey) =>
					context.app.get(Identifiers.Cryptography.Transaction.Factory)![method](message, privateKey),
			}),
		};

		context.app.bind(Identifiers.State.Store).toConstantValue({});
		context.app.bind(Identifiers.CryptoWorker.WorkerPool).toConstantValue(workerPool);
		context.proposal = context.app.resolve(Proposal).initialize({ ...ProposalWithoutValidRound.proposalData, dataSerialized: ProposalWithoutValidRound.payloadSerialized, serialized: Buffer.from(ProposalWithoutValidRound.proposalSerialized, "hex") });
	});

	it("#isDataDeserialized", ({ proposal }) => {
		assert.equal(proposal.isDataDeserialized, false);
	});

	it("#blockHeader", ({ proposal }) => {
		assert.equal(proposal.blockHeader, blockHeader);
	});

	it("#lockProof - should be undefined", ({ proposal }) => {
		assert.undefined(proposal.lockProof);
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
		assert.equal(proposal.signature, ProposalWithoutValidRound.proposalData.signature);
	});

	it("#serialized", ({ proposal }) => {
		assert.equal(proposal.serialized.toString("hex"), ProposalWithoutValidRound.proposalSerialized);
	});

	it("#getData - should throw error if not deserialized", async ({ proposal }) => {
		assert.throws(() => proposal.getPayload(), "Proposed payload is not deserialized.");
	});

	it("#deserializeData - should be ok", async ({ proposal }) => {
		await proposal.deserializeData();
		assertBlock(assert, proposal.getPayload().block, blockHeader);
		assert.undefined(proposal.getPayload().lockProof);
		assert.equal(proposal.getPayload().block.transactions.length, 2);
	});

	it("#deserializeData - should deserialize only once", async ({ proposal, app }) => {
		const proposalFactory = app.get<Contracts.Crypto.ProposalFactory>(Identifiers.Cryptography.Proposal.Factory);
		const spyMakePayloadFromBytes = spy(proposalFactory, "makePayloadFromBytes");

		await proposal.deserializeData();
		await proposal.deserializeData();
		spyMakePayloadFromBytes.calledOnce();
	});

	it("#toString - should be ok", ({ proposal }) => {
		assert.equal(
			proposal.toString(),
			`{"block":"a82964de6a37876e9e955cb5f97f6c25b9f52871cdb66c4dae9b33f0c832df65","blockNumber":2,"round":1,"validatorIndex":0}`,
		);
	});

	it("#toSerializableData", ({ proposal }) => {
		assert.equal(proposal.toSerializableData(), ProposalWithoutValidRound.proposalDataSerializable);
	});

	it("#toData", ({ proposal }) => {
		assert.equal(proposal.toData(), ProposalWithoutValidRound.proposalData);
	});
});
