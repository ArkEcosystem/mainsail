import { Identifiers } from "@mainsail/constants";
import type { Contracts } from "@mainsail/contracts";

import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";
import {
	blockHeader,
	Proposal as ProposalWithoutValidRound,
	ProposalWithLockProofAndValidRound,
	lockProof,
} from "../test/fixtures/index.js";
import { prepareSandbox } from "../test/helpers/prepare-sandbox";
import { Proposal } from "./proposal.js";
import { assertBlock } from "../test/helpers/asserts";

describe<{
	app: Application;
	proposal: Proposal;
	proposalFull: Proposal;
}>("Proposal", ({ it, beforeEach, assert, spy }) => {
	beforeEach(async (context) => {
		await prepareSandbox(context);

		context.app.get<Contracts.Crypto.Configuration>(Identifiers.Cryptography.Configuration).setHeight(1);

		const workerPool = {
			getWorker: () => ({
				consensusSignature: (method, message, privateKey) =>
					context.app
						.getTagged(Identifiers.Cryptography.Signature.Instance, "type", "consensus")!
						[method](message, privateKey),
				transactionFactory: (method, message, privateKey) =>
					context.app.get(Identifiers.Cryptography.Transaction.Factory)![method](message, privateKey),
			}),
		};

		context.app.bind(Identifiers.State.Store).toConstantValue({});
		context.app.bind(Identifiers.CryptoWorker.WorkerPool).toConstantValue(workerPool);
		context.proposal = context.app.resolve(Proposal).initialize({
			...ProposalWithoutValidRound.proposalData,
			serialized: Buffer.from(ProposalWithoutValidRound.proposalSerialized, "hex"),
		});
		context.proposalFull = context.app.resolve(Proposal).initialize({
			...ProposalWithLockProofAndValidRound.proposalData,
			serialized: Buffer.from(ProposalWithLockProofAndValidRound.proposalSerialized, "hex"),
		});
	});

	it("#isDataDeserialized", async ({ proposal }) => {
		assert.false(proposal.isDataDeserialized);

		await proposal.deserializePayload();

		assert.true(proposal.isDataDeserialized);
	});

	it("#blockHeader", ({ proposal, proposalFull }) => {
		assert.equal(proposal.blockHeader, blockHeader);
		assert.equal(proposalFull.blockHeader, blockHeader);
	});

	it("#lockProof - should be ok", ({ proposal, proposalFull }) => {
		assert.undefined(proposal.lockProof);
		assert.equal(proposalFull.lockProof, lockProof);
	});

	it("#round", ({ proposal, proposalFull }) => {
		assert.equal(proposal.round, 1);
		assert.equal(proposalFull.round, 1);
	});

	it("#validRound", ({ proposal, proposalFull }) => {
		assert.undefined(proposal.validRound);
		assert.equal(proposalFull.validRound, 0);
	});

	it("#payloadSerialized", ({ proposal, proposalFull }) => {
		assert.equal(proposal.payloadSerialized, ProposalWithoutValidRound.payloadSerialized);
		assert.equal(proposalFull.payloadSerialized, ProposalWithLockProofAndValidRound.payloadSerialized);
	});

	it("#validatorIndex", ({ proposal, proposalFull }) => {
		assert.equal(proposal.validatorIndex, 0);
		assert.equal(proposalFull.validatorIndex, 0);
	});

	it("#signature", ({ proposal, proposalFull }) => {
		assert.equal(proposal.signature, ProposalWithoutValidRound.signature);
		assert.equal(proposalFull.signature, ProposalWithLockProofAndValidRound.signature);
	});

	it("#serialized", ({ proposal, proposalFull }) => {
		assert.equal(proposal.serialized.toString("hex"), ProposalWithoutValidRound.proposalSerialized);
		assert.equal(proposalFull.serialized.toString("hex"), ProposalWithLockProofAndValidRound.proposalSerialized);
	});

	it("#getData - should throw error if not deserialized", async ({ proposal }) => {
		assert.throws(() => proposal.getPayload(), "Proposed payload is not deserialized.");
	});

	it("#deserializeData - should be ok", async ({ proposal, proposalFull }) => {
		await proposal.deserializePayload();

		assertBlock(assert, proposal.getPayload().block, blockHeader);
		assert.undefined(proposal.getPayload().lockProof);
		assert.equal(proposal.getPayload().block.transactions.length, 2);

		await proposalFull.deserializePayload();
		assertBlock(assert, proposalFull.getPayload().block, blockHeader);
		assert.equal(proposalFull.getPayload().lockProof, lockProof);
		assert.equal(proposalFull.getPayload().block.transactions.length, 2);
	});

	it("#deserializeData - should deserialize only once", async ({ proposal, app }) => {
		const proposalFactory = app.get<Contracts.Crypto.ProposalFactory>(Identifiers.Cryptography.Proposal.Factory);
		const spyMakePayloadFromBytes = spy(proposalFactory, "makePayloadFromBytes");

		await proposal.deserializePayload();
		await proposal.deserializePayload();
		spyMakePayloadFromBytes.calledOnce();
	});

	it("#toString - should be ok", ({ proposal, proposalFull }) => {
		assert.equal(
			proposal.toString(),
			`{"block":"a82964de6a37876e9e955cb5f97f6c25b9f52871cdb66c4dae9b33f0c832df65","blockNumber":2,"round":1,"validatorIndex":0}`,
		);

		assert.equal(
			proposalFull.toString(),
			`{"block":"a82964de6a37876e9e955cb5f97f6c25b9f52871cdb66c4dae9b33f0c832df65","blockNumber":2,"round":1,"validRound":0,"validatorIndex":0}`,
		);
	});

	it("#toSerializableData", ({ proposal, proposalFull }) => {
		assert.equal(proposal.toSerializableData(), ProposalWithoutValidRound.proposalDataSerializable);
		assert.equal(proposalFull.toSerializableData(), ProposalWithLockProofAndValidRound.proposalDataSerializable);
	});

	it("#toData", ({ proposal, proposalFull }) => {
		assert.equal(proposal.toData(), ProposalWithoutValidRound.proposalData);
		assert.equal(proposalFull.toData(), ProposalWithLockProofAndValidRound.proposalData);
	});
});
