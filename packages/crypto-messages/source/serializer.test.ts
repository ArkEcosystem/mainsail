import { describe, Sandbox } from "../../test-framework";
import {
	blockData,
	precommitData,
	precommitDataNoBlock,
	prevoteData,
	prevoteDataNoBlock,
	proposalData,
	serializedPrecommit,
	serializedPrecommitNoBlock,
	serializedPrecommitForSignature,
	serializedPrevote,
	serializedPrevoteNoBlock,
	serializedPrevoteForSignature,
	serializedProposal,
	serializedProposalForSignature,
} from "../test/fixtures/proposal";
import { prepareSandbox } from "../test/helpers/prepare-sandbox";
import { Serializer } from "./serializer";

describe<{
	sandbox: Sandbox;
	serializer: Serializer;
}>("Serializer", ({ it, assert, beforeEach }) => {
	beforeEach(async (context) => {
		await prepareSandbox(context);

		context.serializer = context.sandbox.app.resolve(Serializer);
	});

	it("#serializeProposal - should correctly serialize for signature", async ({ serializer }) => {
		const serialized = (
			await serializer.serializeProposalForSignature({
				height: proposalData.height,
				round: proposalData.round,
				blockId: blockData.id,
			})
		).toString("hex");
		assert.equal(serialized, serializedProposalForSignature);
	});

	it("#serializeProposal - should correctly serialize with signature", async ({ serializer }) => {
		const serialized = (await serializer.serializeProposal(proposalData)).toString("hex");
		assert.equal(serialized, serializedProposal);
	});

	it("#serializePrecommit - should correctly serialize for signature", async ({ serializer }) => {
		const serialized = (await serializer.serializePrecommitForSignature(precommitData)).toString("hex");
		assert.equal(serialized, serializedPrecommitForSignature);
	});

	it("#serializePrecommit - should correctly serialize with signature", async ({ serializer }) => {
		const serialized = (await serializer.serializePrecommit(precommitData)).toString("hex");
		assert.equal(serialized, serializedPrecommit);
	});

	it("#serializePrecommit - should correctly serialize without block", async ({ serializer }) => {
		const serialized = (await serializer.serializePrecommit(precommitDataNoBlock)).toString("hex");
		assert.equal(serialized, serializedPrecommitNoBlock);
	});

	it("#serializePrevote - should correctly serialize for signature", async ({ serializer }) => {
		const serialized = (await serializer.serializePrevoteForSignature(prevoteData)).toString("hex");
		assert.equal(serialized, serializedPrevoteForSignature);
	});

	it("#serializePrevote - should correctly serialize with signature", async ({ serializer }) => {
		const serialized = (await serializer.serializePrevote(prevoteData)).toString("hex");
		assert.equal(serialized, serializedPrevote);
	});

	it("#serializePrevote - should correctly serialize without block", async ({ serializer }) => {
		const serialized = (await serializer.serializePrevote(prevoteDataNoBlock)).toString("hex");
		assert.equal(serialized, serializedPrevoteNoBlock);
	});
});
