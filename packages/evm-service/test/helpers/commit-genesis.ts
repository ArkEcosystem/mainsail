import type { Contracts } from "@mainsail/contracts";
import type { Application } from "@mainsail/kernel";

import { Enums, Identifiers } from "@mainsail/constants";
import { ServiceProvider as CoreCryptoKeyPairBls } from "@mainsail/crypto-key-pair-bls12-381";
import { ServiceProvider as CoreCryptoSignatureBls } from "@mainsail/crypto-signature-bls12-381";

// Applies the real devnet genesis commit to an EVM instance: deserializes the genesis Commit,
// initializes genesis state, processes every genesis transaction and commits the block (with a
// unit that exposes getCommit(), so the full commit storage path runs). Returns the Commit so
// callers can assert against its block/transactions/proof.
export const commitGenesis = async (
	app: Application,
	instance: Contracts.Evm.Instance,
): Promise<Contracts.Crypto.Commit> => {
	// The genesis proof carries BLS validator signatures, so the commit deserializer needs the
	// BLS signature/key-pair providers (not part of the shared sandbox).
	await app.resolve(CoreCryptoSignatureBls).register();
	await app.resolve(CoreCryptoKeyPairBls).register();

	const configuration = app.get<Contracts.Crypto.Configuration>(Identifiers.Cryptography.Configuration);
	const commitFactory = app.get<Contracts.Crypto.CommitFactory>(Identifiers.Cryptography.Commit.Factory);

	const genesisCommit = await commitFactory.fromJson(configuration.getGenesisCommit());
	const { block } = genesisCommit;

	const commitKey = { blockHash: block.hash, blockNumber: BigInt(block.number), round: BigInt(block.round) };

	await instance.initializeGenesis({
		account: block.proposer,
		deployerAccount: "0x0000000000000000000000000000000000000001",
		initialBlockNumber: 0n,
		initialSupply: 10_000_000_000_000_000_000_000_000_000n,
		usernameContract: "0x0000000000000000000000000000000000000001",
		validatorContract: "0x0000000000000000000000000000000000000001",
	});

	await instance.prepareNextCommit({ commitKey });

	for (const transaction of block.transactions) {
		const { receipt } = await instance.process({
			blockContext: {
				commitKey,
				gasLimit: BigInt(10_000_000),
				timestamp: BigInt(block.timestamp),
				validatorAddress: block.proposer,
			},
			data: Buffer.from(transaction.data.slice(2), "hex"),
			from: transaction.from,
			gasLimit: BigInt(transaction.gasLimit),
			gasPrice: BigInt(transaction.gasPrice),
			nonce: transaction.nonce,
			specId: Enums.Evm.SpecId.LATEST,
			to: transaction.to,
			txHash: transaction.hash,
			value: transaction.value,
		});

		if (receipt.status !== 1) {
			throw new Error(`Genesis transaction ${transaction.hash} failed to process`);
		}
	}

	await instance.onCommit({
		blockNumber: block.number,
		getAccountUpdates: () => [],
		getBlock: () => block,
		getCommit: async () => genesisCommit,
		getProcessorResult: () => ({
			feeUsed: 0n,
			gasUsed: 0,
			receipts: new Map(),
			success: false,
		}),
		hasProcessorResult: () => false,
		round: block.round,
		setAccountUpdates: () => {},
		setProcessorResult: () => {},
	});

	return genesisCommit;
};
