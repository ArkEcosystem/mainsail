import { Identifiers } from "@mainsail/constants";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";

import { RoundState } from "./round-state";
import { RoundStateRepository } from "./round-state-repository";

describe<{
	app: Application;
	repository: RoundStateRepository;
	proposerCalculator: any;
	validatorSet: any;
}>("RoundStateRepository", ({ it, assert, beforeEach, spy }) => {
	const validators = [{ blsPublicKey: "bls-0" }, { blsPublicKey: "bls-1" }];

	beforeEach((context) => {
		context.validatorSet = { getRoundValidators: () => validators };
		context.proposerCalculator = { getValidatorIndex: () => 1 };

		context.app = new Application();
		context.app.bind(Identifiers.ValidatorSet.Service).toConstantValue(context.validatorSet);
		context.app.bind(Identifiers.BlockchainUtils.ProposerCalculator).toConstantValue(context.proposerCalculator);

		// Dependencies required only so a RoundState can be resolved; never invoked here.
		context.app.bind(Identifiers.Consensus.Aggregator).toConstantValue({});
		context.app.bind(Identifiers.Cryptography.Commit.Serializer).toConstantValue({});
		context.app.bind(Identifiers.Cryptography.Configuration).toConstantValue({});
		context.app.bind(Identifiers.Services.Log.Service).toConstantValue({});

		context.repository = context.app.resolve(RoundStateRepository);
	});

	it("#getRoundState - should create a round state configured for the block number and round", ({
		repository,
		proposerCalculator,
	}) => {
		const getValidatorIndex = spy(proposerCalculator, "getValidatorIndex");

		const roundState = repository.getRoundState(3, 2);

		assert.instance(roundState, RoundState);
		assert.equal(roundState.blockNumber, 3);
		assert.equal(roundState.round, 2);
		assert.equal(roundState.validators, ["bls-0", "bls-1"]);
		assert.is(roundState.proposer, validators[1]);
		getValidatorIndex.calledOnce();
		getValidatorIndex.calledWith(2);
	});

	it("#getRoundState - should return the same round state for the same block number and round", ({
		repository,
		validatorSet,
	}) => {
		const getRoundValidators = spy(validatorSet, "getRoundValidators");

		const roundState = repository.getRoundState(3, 2);

		assert.is(repository.getRoundState(3, 2), roundState);
		// Configured once; the second access is served from the cache.
		getRoundValidators.calledOnce();
	});

	it("#getRoundState - should keep round states apart by block number and round", ({ repository }) => {
		const first = repository.getRoundState(1, 0);
		const second = repository.getRoundState(1, 1);
		const third = repository.getRoundState(2, 0);

		assert.is.not(first, second);
		assert.is.not(first, third);
		assert.is.not(second, third);
		assert.equal(
			[first, second, third].map((roundState) => [roundState.blockNumber, roundState.round]),
			[
				[1, 0],
				[1, 1],
				[2, 0],
			],
		);
	});

	it("#getRoundStates - should be empty for a fresh repository", ({ repository }) => {
		assert.equal(repository.getRoundStates(), []);
	});

	it("#getRoundStates - should list the round states in creation order", ({ repository }) => {
		const first = repository.getRoundState(2, 1);
		const second = repository.getRoundState(1, 0);
		const third = repository.getRoundState(2, 0);
		repository.getRoundState(1, 0); // cached, must not be listed twice

		const roundStates = repository.getRoundStates();

		assert.length(roundStates, 3);
		assert.is(roundStates[0], first);
		assert.is(roundStates[1], second);
		assert.is(roundStates[2], third);
	});

	it("#clear - should drop every round state so the next access creates a fresh one", ({ repository }) => {
		const stale = repository.getRoundState(1, 0);
		repository.getRoundState(1, 1);

		repository.clear();

		assert.equal(repository.getRoundStates(), []);

		const fresh = repository.getRoundState(1, 0);
		assert.instance(fresh, RoundState);
		assert.is.not(fresh, stale);
		assert.length(repository.getRoundStates(), 1);
	});
});
