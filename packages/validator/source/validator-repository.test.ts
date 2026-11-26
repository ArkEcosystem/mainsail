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
		getRoundValidators: () => Contracts.State.ValidatorWallet[];
	};
	consensusContractService: {
		getValidatorsByBlsPublicKeys: (
			blsPublicKeys: string[],
		) => Promise<(Contracts.State.ValidatorWallet | undefined)[]>;
	};
	validatorRepository: ValidatorRepository;
}>("ValidatorRepository", ({ it, assert, beforeEach, spy }) => {
	const registered = (...wallets: Contracts.State.ValidatorWallet[]) => {
		const byKey = new Map<string, Contracts.State.ValidatorWallet>();
		for (const wallet of wallets) {
			byKey.set(wallet.blsPublicKey, wallet);
		}

		return async (blsPublicKeys: string[]) => blsPublicKeys.map((blsPublicKey) => byKey.get(blsPublicKey));
	};

	beforeEach((context) => {
		context.app = new Application();

		context.logger = { info: () => {} };
		context.app.bind(Identifiers.Services.Log.Service).toConstantValue(context.logger);

		context.validatorSet = {
			getRoundValidators: () => [],
		};
		context.app.bind(Identifiers.ValidatorSet.Service).toConstantValue(context.validatorSet);

		context.consensusContractService = {
			getValidatorsByBlsPublicKeys: async (blsPublicKeys) => blsPublicKeys.map(() => undefined),
		};
		context.app.bind(Identifiers.Evm.ContractService.Consensus).toConstantValue(context.consensusContractService);

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

	it("#printLoadedValidators - should report when no validators are loaded", async ({
		validatorRepository,
		logger,
		consensusContractService,
	}) => {
		validatorRepository.configure([]);

		const info = spy(logger, "info");
		const lookup = spy(consensusContractService, "getValidatorsByBlsPublicKeys");

		await validatorRepository.printLoadedValidators();

		info.calledOnce();
		info.calledWith("No validators found on this node");
		lookup.neverCalled();
	});

	it("#printLoadedValidators - should bucket validators into active, stand-by, resigned and undefined", async ({
		validatorRepository,
		validatorSet,
		consensusContractService,
		logger,
	}) => {
		const activeKey = "active-key";
		const standByKey = "standby-key";
		const resignedKey = "resigned-key";
		const unknownKey = "unknown-key";

		const activeWallet = makeWallet("0xActive", activeKey);
		const standByWallet = makeWallet("0xStandBy", standByKey);
		const resignedWallet = makeWallet("0xResigned", resignedKey, true);

		consensusContractService.getValidatorsByBlsPublicKeys = registered(activeWallet, standByWallet, resignedWallet);
		validatorSet.getRoundValidators = () => [activeWallet];

		validatorRepository.configure([
			makeValidator(activeKey),
			makeValidator(standByKey),
			makeValidator(resignedKey),
			makeValidator(unknownKey),
		]);

		const info = spy(logger, "info");
		const lookup = spy(consensusContractService, "getValidatorsByBlsPublicKeys");

		await validatorRepository.printLoadedValidators();

		lookup.calledOnce();
		lookup.calledWith([activeKey, standByKey, resignedKey, unknownKey]);

		// header line + the four bucket lines
		info.calledTimes(5);
		info.calledWith("Round validators (1): [0xActive]");
		info.calledWith("Stand by validators (1): [0xStandBy]");
		info.calledWith("Resigned validators (1): [0xResigned]");
		info.calledWith("Undefined validators (1): [unknown-key]");
	});

	it("#printLoadedValidators - should report a key that its validator has replaced as undefined", async ({
		validatorRepository,
		consensusContractService,
		logger,
	}) => {
		const replacedKey = "replaced-key";
		const resignedReplacedKey = "resigned-replaced-key";
		const owners = new Map([
			[replacedKey, makeWallet("0xUpdated", "new-key")],
			[resignedReplacedKey, makeWallet("0xResigned", "other-key", true)],
		]);

		consensusContractService.getValidatorsByBlsPublicKeys = async (blsPublicKeys) =>
			blsPublicKeys.map((blsPublicKey) => owners.get(blsPublicKey));

		validatorRepository.configure([makeValidator(replacedKey), makeValidator(resignedReplacedKey)]);

		const info = spy(logger, "info");

		await validatorRepository.printLoadedValidators();

		info.calledWith("Round validators (0): []");
		info.calledWith("Stand by validators (0): []");
		info.calledWith("Resigned validators (0): []");
		info.calledWith("Undefined validators (2): [replaced-key,resigned-replaced-key]");
	});

	it("#printLoadedValidators - should count a replaced key that is still in the round as a round validator", async ({
		validatorRepository,
		validatorSet,
		consensusContractService,
		logger,
	}) => {
		const roundKey = "round-key";
		const updatedWallet = makeWallet("0xUpdated", "new-key");

		consensusContractService.getValidatorsByBlsPublicKeys = async (blsPublicKeys) =>
			blsPublicKeys.map(() => updatedWallet);
		validatorSet.getRoundValidators = () => [makeWallet("0xUpdated", roundKey)];

		validatorRepository.configure([makeValidator(roundKey)]);

		const info = spy(logger, "info");

		await validatorRepository.printLoadedValidators();

		info.calledWith("Round validators (1): [0xUpdated]");
		info.calledWith("Stand by validators (0): []");
		info.calledWith("Undefined validators (0): []");
	});

	it("#printLoadedValidators - should report the round key and the new key of the same validator", async ({
		validatorRepository,
		validatorSet,
		consensusContractService,
		logger,
	}) => {
		const updatedWallet = makeWallet("0xUpdated", "new-key");

		consensusContractService.getValidatorsByBlsPublicKeys = async (blsPublicKeys) =>
			blsPublicKeys.map(() => updatedWallet);
		validatorSet.getRoundValidators = () => [makeWallet("0xUpdated", "round-key")];

		validatorRepository.configure([makeValidator("round-key"), makeValidator("new-key")]);

		const info = spy(logger, "info");

		await validatorRepository.printLoadedValidators();

		info.calledWith("Round validators (1): [0xUpdated]");
		info.calledWith("Stand by validators (1): [0xUpdated]");
		info.calledWith("Undefined validators (0): []");
	});

	it("#printLoadedValidators - should count a resigned validator only once", async ({
		validatorRepository,
		validatorSet,
		consensusContractService,
		logger,
	}) => {
		const resignedKey = "resigned-key";
		const resignedWallet = makeWallet("0xResigned", resignedKey, true);

		// The resigned validator is also part of the active round; it must not be double-counted.
		consensusContractService.getValidatorsByBlsPublicKeys = registered(resignedWallet);
		validatorSet.getRoundValidators = () => [resignedWallet];

		validatorRepository.configure([makeValidator(resignedKey)]);

		const info = spy(logger, "info");

		await validatorRepository.printLoadedValidators();

		info.calledWith("Round validators (0): []");
		info.calledWith("Stand by validators (0): []");
		info.calledWith("Resigned validators (1): [0xResigned]");
	});
});
