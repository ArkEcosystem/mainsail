import { describe, Sandbox } from "../../test-framework";
import {
	precommitData,
	prevoteData,
	proposalData,
	serializedPrecommit,
	serializedPrevote,
	serializedProposal,
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

	it("#serializeProposal - should correctly serialize", async ({ serializer }) => {
		assert.equal(await serializer.serializeProposal(proposalData), Buffer.from(serializedProposal, "hex"));
	});

	it("#serializePrecommit - should correctly serialize", async ({ serializer }) => {
		assert.equal(await serializer.serializePrecommit(precommitData), Buffer.from(serializedPrecommit, "hex"));
	});

	it("#serializePrevote - should correctly serialize", async ({ serializer }) => {
		assert.equal(await serializer.serializePrevote(prevoteData), Buffer.from(serializedPrevote, "hex"));
	});
});
