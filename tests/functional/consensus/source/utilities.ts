import { Events, Identifiers } from "@mainsail/constants";
import type { Contracts } from "@mainsail/contracts";
import { sleep } from "@mainsail/utils";

import type { Validator, ValidatorsJson } from "./contracts.js";
import type { P2PRegistry } from "./p2p.js";

export const prepareNodeValidators = (validators: ValidatorsJson, nodeIndex: number, totalNodes: number) => {
	const secrets = validators.secrets;
	const sliceSize = Math.ceil(secrets.length / totalNodes);
	const nodeSecrets = secrets.slice(sliceSize * nodeIndex, sliceSize * (nodeIndex + 1));

	return {
		secrets: nodeSecrets,
	};
};

export const getValidators = async (
	app: Contracts.Kernel.Application,
	validators: ValidatorsJson,
): Promise<Validator[]> => {
	const result: Validator[] = [];

	const addressFactory = app.get<Contracts.Crypto.AddressFactory>(Identifiers.Cryptography.Identity.Address.Factory);
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

export const getValidatorsInSlotOrder = async (
	app: Contracts.Kernel.Application,
	validators: ValidatorsJson,
): Promise<Validator[]> => {
	const parsed = await getValidators(app, validators);
	const validatorSet = app.get<Contracts.ValidatorSet.Service>(Identifiers.ValidatorSet.Service);

	const inSlotOrder = Array.from<Validator>({ length: parsed.length });
	for (const validator of parsed) {
		inSlotOrder[validatorSet.getValidatorIndexByWalletAddress(validator.address)] = validator;
	}

	return inSlotOrder;
};

export const getNodeForValidator = (
	nodes: Contracts.Kernel.Application[],
	validator: Validator,
): Contracts.Kernel.Application => {
	const node = nodes.find((node) => node.config<string[]>("validators.secrets")?.includes(validator.mnemonic));

	if (!node) {
		throw new Error(`No node validator ${validator.address} found`);
	}

	return node;
};

export const getValidatorIndex = (app: Contracts.Kernel.Application, validator: Validator): number =>
	app
		.get<Contracts.ValidatorSet.Service>(Identifiers.ValidatorSet.Service)
		.getValidatorIndexByWalletAddress(validator.address);

// The signing validator that `app` hosts for `validator`.
export const getSigner = (app: Contracts.Kernel.Application, validator: Validator): Contracts.Validator.Validator => {
	const signer = app
		.get<Contracts.Validator.ValidatorRepository>(Identifiers.Validator.Repository)
		.getValidator(validator.consensusPublicKey);

	if (!signer) {
		throw new Error(`Validator ${validator.consensusPublicKey} not found`);
	}

	return signer;
};

export const makeProposal = async (
	app: Contracts.Kernel.Application,
	validator: Validator,
	blockNumber: number,
	round: number,
	timestamp: number,
): Promise<Contracts.Crypto.Proposal> => {
	const forger = app.get<Contracts.Forger.BlockForger>(Identifiers.Forger.Block);
	const proposer = getSigner(app, validator);

	await sleep(1); // Sleep to avoid same timestamp

	const block = await forger.forgeBlock(
		validator.address,
		round,
		timestamp,
		await proposer.getRandaoReveal(blockNumber),
	);
	const proposal = await proposer.propose(getValidatorIndex(app, validator), round, undefined, block);

	await proposal.deserializePayload();
	return proposal;
};

export const makePrevote = async (
	app: Contracts.Kernel.Application,
	validator: Validator,
	blockNumber: number,
	round: number,
	blockHash?: string,
): Promise<Contracts.Crypto.Message> => {
	const proposer = getSigner(app, validator);

	return await proposer.prevote(getValidatorIndex(app, validator), blockNumber, round, blockHash);
};

export const makePrecommit = async (
	app: Contracts.Kernel.Application,
	validator: Validator,
	blockNumber: number,
	round: number,
	blockHash?: string,
): Promise<Contracts.Crypto.Message> => {
	const proposer = getSigner(app, validator);

	return await proposer.precommit(getValidatorIndex(app, validator), blockNumber, round, blockHash);
};

// The lock proof for `blockHash` in `round`: the prevotes for it that the network saw there, aggregated. With
// +2/3 of them it is what a re-proposal of the block has to carry.
export const makeLockProof = async (
	app: Contracts.Kernel.Application,
	p2p: P2PRegistry,
	round: number,
	blockHash: string,
): Promise<Contracts.Crypto.AggregatedSignature> => {
	const signatures = new Map<number, { signature: string }>();
	for (const prevote of p2p.prevotes.getMessages(1, round)) {
		if (prevote.blockHash === blockHash) {
			signatures.set(prevote.validatorIndex, { signature: prevote.signature });
		}
	}

	const { roundValidators } = app
		.get<Contracts.Crypto.Configuration>(Identifiers.Cryptography.Configuration)
		.getMilestone(1);

	return app
		.get<Contracts.Consensus.Aggregator>(Identifiers.Consensus.Aggregator)
		.aggregate(signatures, roundValidators);
};

// The proposal a proposer whose valid value dates from `validRound` sends in `round`: the block of that round
// again, proven by the +2/3 prevotes it gathered there. Built from the messages the network saw, so that a test
// can stand in for the rotating proposer the pinned harness lacks. Signed by `validator` on `app`.
export const makeReProposal = async (
	app: Contracts.Kernel.Application,
	validator: Validator,
	p2p: P2PRegistry,
	round: number,
	validRound: number,
): Promise<Contracts.Crypto.Proposal> => {
	const [proposal] = p2p.proposals.getMessages(1, validRound);
	if (!proposal.isDataDeserialized) {
		await proposal.deserializePayload();
	}
	const block = proposal.getPayload().block;

	return getSigner(app, validator).propose(
		getValidatorIndex(app, validator),
		round,
		validRound,
		block,
		await makeLockProof(app, p2p, validRound, block.hash),
	);
};

export const snoozeUntil = async (predicate: () => boolean, timeout = 10_000, interval = 10): Promise<void> => {
	const deadline = Date.now() + timeout;

	while (!predicate() && Date.now() < deadline) {
		await sleep(interval);
	}
};

export const getLastBlockNumber = async (app: Contracts.Kernel.Application): Promise<number> => {
	try {
		const commit = await app.get<Contracts.Database.DatabaseService>(Identifiers.Database.Service).getLastCommit();
		return commit.block.number;
	} catch {
		return -1;
	}
};

export const snoozeForBlock = async (
	app: Contracts.Kernel.Application | Contracts.Kernel.Application[],
	blockNumber?: number,
): Promise<void> => {
	const function_ = async (app: Contracts.Kernel.Application): Promise<void> => {
		const eventDispatcher = app.get<Contracts.Kernel.EventDispatcher<Contracts.Crypto.BlockData>>(
			Identifiers.Services.EventDispatcher.Service,
		);

		let stopListening: (() => void) | undefined;
		const applied = new Promise<void>((resolve) => {
			stopListening = eventDispatcher.listen(Events.BlockEvent.Applied, {
				handle: async ({ data }: { data: Contracts.Crypto.BlockData }): Promise<void> => {
					if (!blockNumber || data.number >= blockNumber) {
						resolve();
					}
				},
			});
		});

		try {
			// The target block may already have been applied before the listener existed (its Applied event
			// fired while the caller was still asserting on the previous block); without this check the wait
			// would only resolve at the NEXT applied block.
			if (blockNumber && (await getLastBlockNumber(app)) >= blockNumber) {
				return;
			}

			await applied;
		} finally {
			stopListening?.();
		}
	};

	if (Array.isArray(app)) {
		await Promise.all(app.map((s) => function_(s)));
	} else {
		await function_(app);
	}
};

export const snoozeForRound = async (
	app: Contracts.Kernel.Application | Contracts.Kernel.Application[],
	round?: number,
): Promise<void> => {
	const function_ = async (app: Contracts.Kernel.Application): Promise<void> =>
		new Promise((resolve) => {
			const event = Events.ConsensusEvent.RoundStarted;
			const eventDispatcher = app.get<Contracts.Kernel.EventDispatcher<Contracts.Consensus.State>>(
				Identifiers.Services.EventDispatcher.Service,
			);

			const listener = {
				handle: async ({ data: state }: { data: Contracts.Consensus.State }): Promise<void> => {
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
export async function snoozeForInvalidBlock(
	app: Contracts.Kernel.Application,
	blockNumber?: number,
): Promise<InvalidBlock>;
export async function snoozeForInvalidBlock(
	app: Contracts.Kernel.Application[],
	blockNumber?: number,
): Promise<InvalidBlock[]>;
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
				handle: async ({ data: { block, error } }: { data: InvalidBlock }): Promise<void> => {
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

export const getCommits = async (
	app: Contracts.Kernel.Application,
	start: number,
	end: number,
): Promise<Contracts.Crypto.Commit[]> => {
	const commits: Contracts.Crypto.Commit[] = [];

	for await (const commit of app
		.get<Contracts.Database.DatabaseService>(Identifiers.Database.Service)
		.readCommits(start, end)) {
		commits.push(commit);
	}

	return commits;
};

export const getLastCommit = async (app: Contracts.Kernel.Application): Promise<Contracts.Crypto.Commit> => {
	const databaseService = app.get<Contracts.Database.DatabaseService>(Identifiers.Database.Service);

	const lastCommit = await databaseService.getLastCommit();
	const [serialized] = await databaseService.findCommitBuffers(
		lastCommit.block.number,
		lastCommit.block.number,
		Number.MAX_SAFE_INTEGER,
	);

	return app.get<Contracts.Crypto.CommitFactory>(Identifiers.Cryptography.Commit.Factory).fromBytes(serialized);
};
