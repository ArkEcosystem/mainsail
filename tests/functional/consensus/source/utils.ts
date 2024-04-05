import { Contracts, Identifiers } from "@mainsail/contracts";
import { Enums } from "@mainsail/kernel";
import { Sandbox } from "@mainsail/test-framework";
import { sleep } from "@mainsail/utils";

import { Validator, ValidatorsJson } from "./contracts.js";

export const prepareNodeValidators = (validators: ValidatorsJson, nodeIndex: number, totalNodes: number) => {
	const secrets = validators.secrets;
	const sliceSize = Math.ceil(secrets.length / totalNodes);
	const nodeSecrets = secrets.slice(sliceSize * nodeIndex, sliceSize * (nodeIndex + 1));

	return {
		secrets: nodeSecrets,
	};
};

export const getValidators = async (sandbox: Sandbox, validators: ValidatorsJson): Promise<Validator[]> => {
	const result: Validator[] = [];

	const addressFactory = sandbox.app.get<Contracts.Crypto.AddressFactory>(
		Identifiers.Cryptography.Identity.Address.Factory,
	);
	const keyPairFactory = sandbox.app.getTagged<Contracts.Crypto.KeyPairFactory>(
		Identifiers.Cryptography.Identity.KeyPair.Factory,
		"type",
		"wallet",
	);

	const consensusKeyPairFactory = sandbox.app.getTagged<Contracts.Crypto.KeyPairFactory>(
		Identifiers.Cryptography.Identity.KeyPair.Factory,
		"type",
		"consensus",
	);

	for (const mnemonic of validators.secrets) {
		const keyPair = await keyPairFactory.fromMnemonic(mnemonic);
		const consensusKeyPair = await consensusKeyPairFactory.fromMnemonic(mnemonic);

		result.push({
			address: await addressFactory.fromMnemonic(mnemonic),
			publicKey: keyPair.publicKey,
			privateKey: keyPair.privateKey,
			consensusPublicKey: consensusKeyPair.publicKey,
			consensusPrivateKey: consensusKeyPair.privateKey,
			mnemonic,
		});
	}

	return result;
};

export const makeProposal = async (
	node: Sandbox,
	validator: Validator,
	height: number,
	round: number,
): Promise<Contracts.Crypto.Proposal> => {
	const proposer = node.app
		.get<Contracts.Validator.ValidatorRepository>(Identifiers.Validator.Repository)
		.getValidator(validator.consensusPublicKey);

	if (!proposer) {
		throw new Error(`Validator ${validator.consensusPublicKey} not found`);
	}

	await sleep(1); // Sleep to avoid same timestamp

	const block = await proposer.prepareBlock(validator.publicKey, round);
	return await proposer.propose(
		node.app
			.get<Contracts.ValidatorSet.Service>(Identifiers.ValidatorSet.Service)
			.getValidatorIndexByWalletPublicKey(validator.publicKey),
		round,
		undefined,
		block,
	);
};

export const makePrevote = async (
	node: Sandbox,
	validator: Validator,
	height: number,
	round: number,
	blockId?: string,
): Promise<Contracts.Crypto.Prevote> => {
	const proposer = node.app
		.get<Contracts.Validator.ValidatorRepository>(Identifiers.Validator.Repository)
		.getValidator(validator.consensusPublicKey);

	if (!proposer) {
		throw new Error(`Validator ${validator.consensusPublicKey} not found`);
	}

	return await proposer.prevote(
		node.app
			.get<Contracts.ValidatorSet.Service>(Identifiers.ValidatorSet.Service)
			.getValidatorIndexByWalletPublicKey(validator.publicKey),
		height,
		round,
		blockId,
	);
};

export const snoozeForBlock = async (sandbox: Sandbox | Sandbox[], height?: number): Promise<void> => {
	const function_ = async (sandbox: Sandbox): Promise<void> =>
		new Promise((resolve) => {
			const event = Enums.BlockEvent.Applied;
			const eventDispatcher = sandbox.app.get<Contracts.Kernel.EventDispatcher>(
				Identifiers.Services.EventDispatcher.Service,
			);

			const listener = {
				handle: ({ data: commit }: { data: Contracts.Crypto.Commit }) => {
					if (!height || commit.block.data.height >= height) {
						eventDispatcher.forget(event, listener);
						resolve();
					}
				},
			};

			eventDispatcher.listen(event, listener);
		});

	if (Array.isArray(sandbox)) {
		await Promise.all(sandbox.map((s) => function_(s)));
	} else {
		await function_(sandbox);
	}
};

export const snoozeForRound = async (sandbox: Sandbox | Sandbox[], round?: number): Promise<void> => {
	const function_ = async (sandbox: Sandbox): Promise<void> =>
		new Promise((resolve) => {
			const event = Enums.ConsensusEvent.RoundStarted;
			const eventDispatcher = sandbox.app.get<Contracts.Kernel.EventDispatcher>(
				Identifiers.Services.EventDispatcher.Service,
			);

			const listener = {
				handle: ({ data: state }: { data: Contracts.Consensus.ConsensusState }) => {
					if (!round || state.round >= round) {
						eventDispatcher.forget(event, listener);
						resolve();
					}
				},
			};

			eventDispatcher.listen(event, listener);
		});

	if (Array.isArray(sandbox)) {
		await Promise.all(sandbox.map((s) => function_(s)));
	} else {
		await function_(sandbox);
	}
};

export const getLastCommit = async (sandbox: Sandbox): Promise<Contracts.Crypto.Commit> =>
	sandbox.app.get<Contracts.Database.DatabaseService>(Identifiers.Database.Service).getLastCommit();
