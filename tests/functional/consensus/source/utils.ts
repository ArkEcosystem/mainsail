import { Contracts, Identifiers } from "@mainsail/contracts";
import { Enums } from "@mainsail/kernel";
import { Sandbox } from "@mainsail/test-framework";

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
