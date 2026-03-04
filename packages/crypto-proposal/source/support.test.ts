import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";

import {
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

		assert.equal(serialized.toString("hex"), Proposal.payloadSerialized);
	});

	it("#serializeProposalUnsigned - should correctly serialize", async ({ serializer }) => {
		const serialized = await serializer.serializeProposalUnsigned(Proposal.proposalDataSerializableUnsigned);

		assert.equal(serialized.toString("hex"), Proposal.proposalSerializedUnsigned);
	});
});
