import { describe, Sandbox } from "../../test-framework";
import {
	precommitData,
	precommitDataNoBlock,
	prevoteData,
	prevoteDataNoBlock,
	proposalData,
	serializedPrecommit,
	serializedPrecommitNoBlock,
	serializedPrecommitWithoutSignature,
	serializedPrevote,
	serializedPrevoteNoBlock,
	serializedPrevoteWithoutSignature,
	serializedProposal,
	serializedProposalWithoutSignature,
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

	it("#serializeProposal - should correctly serialize without signature", async ({ serializer }) => {
		const serialized = (await serializer.serializeProposal(proposalData, { excludeSignature: true })).toString(
			"hex",
		);
		assert.equal(serialized, serializedProposalWithoutSignature);
	});

	it("#serializeProposal - should correctly serialize with signature", async ({ serializer }) => {
		const serialized = (await serializer.serializeProposal(proposalData, { excludeSignature: false })).toString(
			"hex",
		);
		assert.equal(serialized, serializedProposal);
	});

	it("#serializePrecommit - should correctly serialize without signature", async ({ serializer }) => {
		const serialized = (await serializer.serializePrecommit(precommitData, { excludeSignature: true })).toString(
			"hex",
		);
		assert.equal(serialized, serializedPrecommitWithoutSignature);
	});

	it("#serializePrecommit - should correctly serialize with signature", async ({ serializer }) => {
		const serialized = (await serializer.serializePrecommit(precommitData, { excludeSignature: false })).toString(
			"hex",
		);
		assert.equal(serialized, serializedPrecommit);
	});

	it("#serializePrecommit - should correctly serialize without block", async ({ serializer }) => {
		assert.equal(
			await serializer.serializePrecommit(precommitDataNoBlock),
			Buffer.from(serializedPrecommitNoBlock, "hex"),
		);
	});

	it("#serializePrevote - should correctly serialize without signature", async ({ serializer }) => {
		const serialized = (await serializer.serializePrevote(prevoteData, { excludeSignature: true })).toString("hex");
		assert.equal(serialized, serializedPrevoteWithoutSignature);
	});

	it("#serializePrevote - should correctly serialize with signature", async ({ serializer }) => {
		const serialized = (await serializer.serializePrevote(prevoteData, { excludeSignature: false })).toString(
			"hex",
		);
		assert.equal(serialized, serializedPrevote);
	});

	it("#serializePrevote - should correctly serialize without block", async ({ serializer }) => {
		assert.equal(
			await serializer.serializePrevote(prevoteDataNoBlock),
			Buffer.from(serializedPrevoteNoBlock, "hex"),
		);
	});
});
