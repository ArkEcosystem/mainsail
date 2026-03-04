import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";
// import {
// 	proposalData,
// 	proposalDataWithValidRound,
// 	serializedBlock,
// 	lockProof,
// 	serializedProposal,
// 	serializedLockProof,
// 	serializedProposalData,
// 	serializedProposedDataWithLockProof,
// 	serializedProposalWithValidRound,
// 	serializedProposalDataWithValidRoundUnsigned,
// 	serializedProposalUnsigned,
// } from "../test/fixtures/index.js";

import {
	proposalData,
	proposalDataWithValidRound,
	serializedBlock,
	lockProof,
	serializedProposal,
	serializedLockProof,
	serializedProposalData,
	serializedProposedDataWithLockProof,
	serializedProposalWithValidRound,
	serializedProposalDataWithValidRoundUnsigned,
	serializedProposalUnsigned,
	Proposal,
} from "../test/fixtures/index.js";

import { prepareSandbox } from "../test/helpers/prepare-sandbox";
import { Deserializer } from "./deserializer";
import { Serializer } from "./serializer";

describe<{
	app: Application;
	serializer: Serializer;
	deserializer: Deserializer;
}>("Serializer", ({ it, assert, beforeEach }) => {
	beforeEach(async (context) => {
		await prepareSandbox(context);

		context.serializer = context.app.resolve(Serializer);
		context.deserializer = context.app.resolve(Deserializer);
	});


	it("#serializePayload - should correctly serialize", async ({ serializer }) => {
		const serialized = await serializer.serializePayload(Proposal.payload);

		console.log(serialized.toString("hex"));
		assert.equal(serialized.toString("hex"), Proposal.payloadSerialized);
	});

	it("#serializeProposalUnsigned - should correctly serialize", async ({ serializer }) => {
		const serialized = await serializer.serializeProposalUnsigned(Proposal.proposalDataSerializableUnsigned);

		// console.log(serialized.toString("hex"));

		// assert.equal(serialized.toString("hex"), Proposal.payloadSerialized);
	});

	// it("#serializeProposalUnsigned - should correctly serialize for signature", async ({ serializer }) => {
	// 	const serialized =
	// 		await serializer.serializeProposalUnsigned(
	// 			{
	// 				data: { serialized: serializedBlock },
	// 				round: proposalData.round,
	// 				validatorIndex: proposalData.validatorIndex,
	// 			}
	// 		)

	// 	assert.equal(serialized.toString("hex"), serializedProposalUnsigned);
	// });

	// it("#serializeProposalUnsigned - should correctly serialize for signature, with valid round", async ({ serializer }) => {
	// 	const serialized =
	// 		await serializer.serializeProposalUnsigned(
	// 			{
	// 				data: { serialized: serializedBlock },
	// 				round: proposalDataWithValidRound.round,
	// 				validRound: proposalDataWithValidRound.validRound,
	// 				validatorIndex: proposalDataWithValidRound.validatorIndex,
	// 			},
	// 		)

	// 	assert.equal(serialized.toString("hex"), serializedProposalDataWithValidRoundUnsigned);
	// });

	// it("#serializeProposal - should correctly serialize with signature", async ({ serializer }) => {
	// 	const serialized = await serializer.serializeProposal(
	// 			{
	// 				data: { serialized: serializedBlock },
	// 				round: proposalData.round,
	// 				signature: proposalData.signature,
	// 				validatorIndex: proposalData.validatorIndex,
	// 			},
	// 		)

	// 	assert.equal(serialized.toString("hex"), serializedProposal);
	// });

	// it("#serializeProposal - should correctly serialize with signature, with valid round", async ({ serializer }) => {
	// 	const serialized =
	// 		await serializer.serializeProposal(
	// 			{
	// 				data: { serialized: serializedBlock },
	// 				round: proposalDataWithValidRound.round,
	// 				signature: proposalDataWithValidRound.signature,
	// 				validRound: proposalDataWithValidRound.validRound,
	// 				validatorIndex: proposalDataWithValidRound.validatorIndex,
	// 			},
	// 		);

	// 	assert.equal(serialized.toString("hex"), serializedProposalWithValidRound);
	// });

	// it("#serializeLockProof - should serialize and deserialize lock proof", async ({ deserializer, serializer }) => {
	// 	const serialized = (await serializer.serializeLockProof(lockProof)).toString("hex");
	// 	assert.equal(serialized, serializedLockProof);

	// 	const deserialized = await deserializer.deserializeLockProof(Buffer.from(serialized, "hex"));
	// 	assert.equal(lockProof.signature, deserialized.signature);
	// 	assert.equal(lockProof.validators, deserialized.validators);
	// });

	// it("#serializeProposedData - should correctly serialize block", async ({ serializer }) => {
	// 	const serialized =
	// 		await serializer.serializeProposedData(
	// 			{
	// 				block: { serialized: serializedBlock },
	// 				lockProof: undefined
	// 			},
	// 		);

	// 	assert.equal(serialized.toString("hex"), serializedProposalData);
	// });

	// it("#serializeProposedData - should correctly serialize block, with lock proof", async ({ serializer }) => {
	// 	const serialized =
	// 		await serializer.serializeProposedData(
	// 			{
	// 				block: { serialized: serializedBlock },
	// 				lockProof: lockProof
	// 			},
	// 		);

	// 	assert.equal(serialized.toString("hex"), serializedProposedDataWithLockProof);
	// });
});
