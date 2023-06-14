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
		const { verified, errors } = await verifier.verifyProposal(proposalData);
		assert.equal(errors, []);
		assert.true(verified);
	});

	it("#verifyPrecommit - should correctly verify", async ({ verifier }) => {
		const { verified, errors } = await verifier.verifyPrecommit(precommitData);
		assert.equal(errors, []);
		assert.true(verified);
	});

	it("#verifyPrevote - should correctly verify", async ({ verifier }) => {
		const { verified, errors } = await verifier.verifyPrevote(prevoteData);
		assert.equal(errors, []);
		assert.true(verified);
	});
});
