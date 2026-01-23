import { Events, Identifiers } from "@mainsail/constants";
import type { Contracts } from "@mainsail/contracts";
import { sleep } from "@mainsail/utils";

import type { Validator, ValidatorsJson } from "./contracts.js";

export const prepareNodeValidators = (validators: ValidatorsJson, nodeIndex: number, totalNodes: number) => {
	const secrets = validators.secrets;
	const sliceSize = Math.ceil(secrets.length / totalNodes);
	const nodeSecrets = secrets.slice(sliceSize * nodeIndex, sliceSize * (nodeIndex + 1));

	return {
		secrets: nodeSecrets,
	};
};

export const getValidators = async (app: Contracts.Kernel.Application, validators: ValidatorsJson): Promise<Validator[]> => {
	const result: Validator[] = [];

	const addressFactory = app.get<Contracts.Crypto.AddressFactory>(
		Identifiers.Cryptography.Identity.Address.Factory,
	);
	const keyPairFactory = app.getTagged<Contracts.Crypto.KeyPairFactory>(
		Identifiers.Cryptography.Identity.KeyPair.Factory,
		"type",
		"wallet",
	);

	const consensusKeyPairFactory = app.getTagged<Contracts.Crypto.KeyPairFactory>(
		Identifiers.Cryptography.Identity.KeyPair.Factory,
		"type",
		"consensus",
	);

	for (const mnemonic of validators.secrets) {
		const keyPair = await keyPairFactory.fromMnemonic(mnemonic);
		const consensusKeyPair = await consensusKeyPairFactory.fromMnemonic(mnemonic);

		result.push({
			address: await addressFactory.fromMnemonic(mnemonic),
			consensusPrivateKey: consensusKeyPair.privateKey,
			consensusPublicKey: consensusKeyPair.publicKey,
			mnemonic,
			privateKey: keyPair.privateKey,
			publicKey: keyPair.publicKey,
		});
	}

	return result;
};

export const makeProposal = async (
	app: Contracts.Kernel.Application,
	validator: Validator,
	blockNumber: number,
	round: number,
	timestamp: number,
): Promise<Contracts.Crypto.Proposal> => {
	const proposer = app
		.get<Contracts.Validator.ValidatorRepository>(Identifiers.Validator.Repository)
		.getValidator(validator.consensusPublicKey);

	if (!proposer) {
		throw new Error(`Validator ${validator.consensusPublicKey} not found`);
	}

	await sleep(1); // Sleep to avoid same timestamp

	const block = await proposer.prepareBlock(validator.address, round, timestamp);
	const proposal = await proposer.propose(0, round, undefined, block);

	await proposal.deserializeData();
	return proposal;
};

export const makePrevote = async (
	app: Contracts.Kernel.Application,
	validator: Validator,
	blockNumber: number,
	round: number,
	blockHash?: string,
): Promise<Contracts.Crypto.Message> => {
	const proposer = app
		.get<Contracts.Validator.ValidatorRepository>(Identifiers.Validator.Repository)
		.getValidator(validator.consensusPublicKey);

	if (!proposer) {
		throw new Error(`Validator ${validator.consensusPublicKey} not found`);
	}

	return await proposer.prevote(
		app
			.get<Contracts.ValidatorSet.Service>(Identifiers.ValidatorSet.Service)
			.getValidatorIndexByWalletAddress(validator.address),
		blockNumber,
		round,
		blockHash,
	);
};

export const makePrecommit = async (
	app: Contracts.Kernel.Application,
	validator: Validator,
	blockNumber: number,
	round: number,
	blockHash?: string,
): Promise<Contracts.Crypto.Message> => {
	const proposer = app
		.get<Contracts.Validator.ValidatorRepository>(Identifiers.Validator.Repository)
		.getValidator(validator.consensusPublicKey);

	if (!proposer) {
		throw new Error(`Validator ${validator.consensusPublicKey} not found`);
	}

	return await proposer.precommit(
		app
			.get<Contracts.ValidatorSet.Service>(Identifiers.ValidatorSet.Service)
			.getValidatorIndexByWalletAddress(validator.address),
		blockNumber,
		round,
		blockHash,
	);
};

export const snoozeForBlock = async (app: Contracts.Kernel.Application | Contracts.Kernel.Application[], blockNumber?: number): Promise<void> => {
	const function_ = async (app: Contracts.Kernel.Application): Promise<void> =>
		new Promise((resolve) => {
			const event = Events.BlockEvent.Applied;
			const eventDispatcher = app.get<Contracts.Kernel.EventDispatcher<Contracts.Crypto.BlockData>>(
				Identifiers.Services.EventDispatcher.Service,
			);

			const listener = {
				handle: ({ data }: { data: Contracts.Crypto.BlockData }) => {
					if (!blockNumber || data.number >= blockNumber) {
						eventDispatcher.forget(event, listener);
						resolve();
					}
				},
			};

			eventDispatcher.listen(event, listener);
		});

	if (Array.isArray(app)) {
		await Promise.all(app.map((s) => function_(s)));
	} else {
		await function_(app);
	}
};

export const snoozeForRound = async (app: Contracts.Kernel.Application | Contracts.Kernel.Application[], round?: number): Promise<void> => {
	const function_ = async (app: Contracts.Kernel.Application): Promise<void> =>
		new Promise((resolve) => {
			const event = Events.ConsensusEvent.RoundStarted;
			const eventDispatcher = app.get<Contracts.Kernel.EventDispatcher<Contracts.Consensus.State>>(
				Identifiers.Services.EventDispatcher.Service,
			);

			const listener = {
				handle: ({ data: state }: { data: Contracts.Consensus.State }) => {
					if (!round || state.round >= round) {
						eventDispatcher.forget(event, listener);
						resolve();
					}
				},
			};

			eventDispatcher.listen(event, listener);
		});

	if (Array.isArray(app)) {
		await Promise.all(app.map((s) => function_(s)));
	} else {
		await function_(app);
	}
};

export interface InvalidBlock {
	block: Contracts.Crypto.BlockData;
	error: Error;
}
export async function snoozeForInvalidBlock(app: Contracts.Kernel.Application, blockNumber?: number): Promise<InvalidBlock>;
export async function snoozeForInvalidBlock(app: Contracts.Kernel.Application[], blockNumber?: number): Promise<InvalidBlock[]>;
export async function snoozeForInvalidBlock(
	app: Contracts.Kernel.Application | Contracts.Kernel.Application[],
	blockNumber?: number,
): Promise<InvalidBlock | InvalidBlock[]> {
	const function_ = async (app: Contracts.Kernel.Application): Promise<InvalidBlock> =>
		new Promise((resolve) => {
			const event = Events.BlockEvent.Invalid;
			const eventDispatcher = app.get<Contracts.Kernel.EventDispatcher<InvalidBlock>>(
				Identifiers.Services.EventDispatcher.Service,
			);

			const listener = {
				handle: ({ data: { block, error } }: { data: InvalidBlock }) => {
					if (!blockNumber || block.number >= blockNumber) {
						eventDispatcher.forget(event, listener);
						resolve({ block, error });
					}
				},
			};

			eventDispatcher.listen(event, listener);
		});

	if (Array.isArray(app)) {
		return Promise.all(app.map((s) => function_(s)));
	} else {
		return function_(app);
	}
}

export const getLastCommit = async (app: Contracts.Kernel.Application): Promise<Contracts.Crypto.Commit> => {
	const databaseService = app.get<Contracts.Database.DatabaseService>(Identifiers.Database.Service);

	const lasCommit = await databaseService.getLastCommit();
	const [serialized] = await databaseService.findCommitBuffers(
		lasCommit.block.header.number,
		lasCommit.block.header.number,
	);

	return app
		.get<Contracts.Crypto.CommitFactory>(Identifiers.Cryptography.Commit.Factory)
		.fromBytes(serialized);
};
