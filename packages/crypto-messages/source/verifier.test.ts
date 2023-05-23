import { describe, Sandbox } from "../../test-framework";
import { precommitData, prevoteData, proposalData } from "../test/fixtures/proposal";
import { prepareSandbox } from "../test/helpers/prepare-sandbox";
import { Verifier } from "./verifier";

describe<{
	sandbox: Sandbox;
	verifier: Verifier;
}>("Verifier", ({ it, assert, beforeEach }) => {
	beforeEach(async (context) => {
		await prepareSandbox(context);

		context.verifier = context.sandbox.app.resolve(Verifier);
	});

	it("#verifyProposal - should correctly verify", async ({ verifier }) => {
		assert.true((await verifier.verifyProposal(proposalData)).verified);
	});

	it("#verifyPrecommit - should correctly verify", async ({ verifier }) => {
		assert.true((await verifier.verifyPrecommit(precommitData)).verified);
	});

	it("#verifyPrevote - should correctly verify", async ({ verifier }) => {
		assert.true((await verifier.verifyPrevote(prevoteData)).verified);
	});
});
