import { Contracts, Identifiers } from "@mainsail/contracts";

import { describe, Sandbox } from "../../test-framework";
import { blockData, precommitData, prevoteData, proposalData } from "../test/fixtures/proposal";
import { prepareSandbox } from "../test/helpers/prepare-sandbox";
import { prepareWallet } from "../test/helpers/prepare-wallet";
import { Verifier } from "./verifier";
import { MessageFactory } from "./factory";
import { Proposal } from "./proposal";
import { Precommit } from "./precommit";
import { Prevote } from "./prevote";

describe<{
	sandbox: Sandbox;
	factory: MessageFactory;
	verifier: Verifier;
}>("Verifier", ({ it, assert, beforeEach }) => {
	beforeEach(async (context) => {
		await prepareSandbox(context);

		const wallet = await prepareWallet(context);
		const validatorSet = {
			getActiveValidators: () => [wallet],
		};

		context.sandbox.app.bind(Identifiers.ValidatorSet).toConstantValue(validatorSet);
		context.factory = context.sandbox.app.resolve(MessageFactory);
		context.verifier = context.sandbox.app.resolve(Verifier);
	});

	it("#verifyProposal - should correctly verify", async ({ verifier }) => {
		const proposal = new Proposal(
			proposalData.height,
			proposalData.round,
			{ block: { header: blockData } } as Contracts.Crypto.IProposedBlock,
			proposalData.validRound,
			proposalData.validatorIndex,
			proposalData.signature,
		);
		const { verified, errors } = await verifier.verifyProposal(proposal);

		assert.equal(errors, []);
		assert.true(verified);
	});

	it("#verifyPrecommit - should correctly verify", async ({ verifier }) => {
		const precommit = new Precommit(
			precommitData.height,
			precommitData.round,
			precommitData.blockId,
			precommitData.validatorIndex,
			precommitData.signature,
		);
		const { verified, errors } = await verifier.verifyPrecommit(precommit);

		assert.equal(errors, []);
		assert.true(verified);
	});

	it("#verifyPrevote - should correctly verify", async ({ verifier }) => {
		const prevote = new Prevote(
			prevoteData.height,
			prevoteData.round,
			prevoteData.blockId,
			prevoteData.validatorIndex,
			prevoteData.signature,
		);
		const { verified, errors } = await verifier.verifyPrevote(prevote);

		assert.equal(errors, []);
		assert.true(verified);
	});
});
