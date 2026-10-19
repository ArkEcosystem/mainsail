import type { Contracts } from "@mainsail/contracts";

import { Identifiers } from "@mainsail/constants";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";

import { ValidatorRepository } from "./validator-repository";

const makeValidator = (consensusPublicKey: string): Contracts.Validator.Validator =>
	({ getConsensusPublicKey: () => consensusPublicKey }) as Contracts.Validator.Validator;

const makeWallet = (address: string, blsPublicKey: string, isResigned = false): Contracts.State.ValidatorWallet =>
	({ address, blsPublicKey, isResigned }) as Contracts.State.ValidatorWallet;

describe<{
	app: Application;
	logger: { info: (message: string) => void };
	validatorSet: {
		getAllValidators: () => Contracts.State.ValidatorWallet[];
		getRoundValidators: () => Contracts.State.ValidatorWallet[];
	};
	validatorRepository: ValidatorRepository;
}>("ValidatorRepository", ({ it, assert, beforeEach, spy }) => {
	beforeEach((context) => {
		context.app = new Application();

		context.logger = { info: () => {} };
		context.app.bind(Identifiers.Services.Log.Service).toConstantValue(context.logger);

		context.validatorSet = {
			getAllValidators: () => [],
			getRoundValidators: () => [],
		};
		context.app.bind(Identifiers.ValidatorSet.Service).toConstantValue(context.validatorSet);

		context.validatorRepository = context.app.resolve(ValidatorRepository);
	});

	it("#configure - should return the repository for chaining", ({ validatorRepository }) => {
		assert.equal(validatorRepository.configure([]), validatorRepository);
	});

	it("#getValidator - should return undefined for an unknown public key", ({ validatorRepository }) => {
		validatorRepository.configure([makeValidator("known-key")]);

		assert.undefined(validatorRepository.getValidator("unknown-key"));
	});

	it("#getValidator - should return the validator configured under the given public key", ({
		validatorRepository,
	}) => {
		const validator = makeValidator("known-key");
		validatorRepository.configure([validator]);

		assert.equal(validatorRepository.getValidator("known-key"), validator);
	});

	it("#printLoadedValidators - should report when no validators are loaded", ({ validatorRepository, logger }) => {
		validatorRepository.configure([]);

		const info = spy(logger, "info");

		validatorRepository.printLoadedValidators();

		info.calledOnce();
		info.calledWith("No validators found on this node");
	});

	it("#printLoadedValidators - should bucket validators into active, stand-by, resigned and undefined", ({
		validatorRepository,
		validatorSet,
		logger,
	}) => {
		const activeKey = "active-key";
		const standByKey = "standby-key";
		const resignedKey = "resigned-key";
		const unknownKey = "unknown-key";

		const activeWallet = makeWallet("0xActive", activeKey);
		const standByWallet = makeWallet("0xStandBy", standByKey);
		const resignedWallet = makeWallet("0xResigned", resignedKey, true);

		validatorSet.getAllValidators = () => [activeWallet, standByWallet, resignedWallet];
		validatorSet.getRoundValidators = () => [activeWallet];

		validatorRepository.configure([
			makeValidator(activeKey),
			makeValidator(standByKey),
			makeValidator(resignedKey),
			makeValidator(unknownKey),
		]);

		const info = spy(logger, "info");

		validatorRepository.printLoadedValidators();

		// header line + the four bucket lines
		info.calledTimes(5);
		info.calledWith("Round validators (1): [0xActive]");
		info.calledWith("Stand by validators (1): [0xStandBy]");
		info.calledWith("Resigned validators (1): [0xResigned]");
		info.calledWith("Undefined validators (1): [unknown-key]");
	});

	it("#printLoadedValidators - should count a resigned validator only once", ({
		validatorRepository,
		validatorSet,
		logger,
	}) => {
		const resignedKey = "resigned-key";
		const resignedWallet = makeWallet("0xResigned", resignedKey, true);

		// The resigned validator is also part of the active round; it must not be double-counted.
		validatorSet.getAllValidators = () => [resignedWallet];
		validatorSet.getRoundValidators = () => [resignedWallet];

		validatorRepository.configure([makeValidator(resignedKey)]);

		const info = spy(logger, "info");

		validatorRepository.printLoadedValidators();

		info.calledWith("Round validators (0): []");
		info.calledWith("Stand by validators (0): []");
		info.calledWith("Resigned validators (1): [0xResigned]");
	});
});
