import type { Contracts } from "@mainsail/contracts";

import { Identifiers } from "@mainsail/constants";
import { InvalidGenerator } from "@mainsail/exceptions";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";

import { GeneratorVerifier } from "./generator-verifier.js";

describe<{
	app: Application;
	configuration: any;
	proposerCalculator: any;
	validatorSet: any;
	verifier: GeneratorVerifier;
}>("GeneratorVerifier", ({ it, beforeEach, assert, spy }) => {
	const makeUnit = (block: Partial<Contracts.Crypto.Block>, round = block.round) =>
		({ getBlock: () => block, round }) as Contracts.Processor.ProcessableUnit;

	beforeEach((context) => {
		context.configuration = { getGenesisHeight: () => 0 };
		context.proposerCalculator = { getValidatorIndex: () => 2 };
		context.validatorSet = { getValidator: () => ({ address: "proposer" }) };

		context.app = new Application();
		context.app.bind(Identifiers.Cryptography.Configuration).toConstantValue(context.configuration);
		context.app.bind(Identifiers.BlockchainUtils.ProposerCalculator).toConstantValue(context.proposerCalculator);
		context.app.bind(Identifiers.ValidatorSet.Service).toConstantValue(context.validatorSet);

		context.verifier = context.app.resolve(GeneratorVerifier);
	});

	it("should skip the genesis block", async ({ proposerCalculator, verifier }) => {
		const getValidatorIndex = spy(proposerCalculator, "getValidatorIndex");

		await verifier.execute(makeUnit({ hash: "g", number: 0, proposer: "anyone", round: 0 }));

		getValidatorIndex.neverCalled();
	});

	it("should accept a block proposed by the validator of its round", async ({
		proposerCalculator,
		validatorSet,
		verifier,
	}) => {
		const getValidatorIndex = spy(proposerCalculator, "getValidatorIndex");
		const getValidator = spy(validatorSet, "getValidator");

		await verifier.execute(makeUnit({ hash: "b", number: 3, proposer: "proposer", round: 1 }));

		getValidatorIndex.calledWith(1);
		getValidator.calledWith(2);
	});

	it("should look the proposer up by the round of the block, not the round of the unit", async ({
		proposerCalculator,
		verifier,
	}) => {
		// A block re-proposed in a later round keeps the proposer of the round it was forged in.
		const getValidatorIndex = spy(proposerCalculator, "getValidatorIndex");

		await verifier.execute(makeUnit({ hash: "b", number: 3, proposer: "proposer", round: 1 }, 4));

		getValidatorIndex.calledWith(1);
	});

	it("should reject a block proposed by another validator", async ({ verifier }) => {
		await assert.rejects(
			() => verifier.execute(makeUnit({ hash: "b", number: 3, proposer: "other", round: 1 })),
			InvalidGenerator,
			"Proposer is other instead proposer",
		);
	});

	it("should propagate a failing validator lookup", async ({ validatorSet, verifier }) => {
		validatorSet.getValidator = () => {
			throw new Error("Validator at index 2 not found.");
		};

		await assert.rejects(
			() => verifier.execute(makeUnit({ hash: "b", number: 3, proposer: "proposer", round: 1 })),
			"Validator at index 2 not found.",
		);
	});
});
