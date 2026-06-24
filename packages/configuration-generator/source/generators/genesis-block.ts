import type { Contracts } from "@mainsail/contracts";

import { Enums, Identifiers } from "@mainsail/constants";
import { inject, injectable, optional, tagged } from "@mainsail/container";
import { buildProofOfPossession } from "@mainsail/crypto-key-pair-bls12-381";
import { TransactionBuilder } from "@mainsail/crypto-transaction";
import { Deployer, Identifiers as EvmConsensusIdentifiers } from "@mainsail/evm-consensus";
import { ConsensusAbi } from "@mainsail/evm-contracts";
import { assert } from "@mainsail/utils";
import dayjs from "dayjs";
import { bytesToHex, encodeFunctionData } from "viem";

import { Wallet } from "../contracts.js";
import { Generator } from "./generator.js";

@injectable()
export class GenesisBlockGenerator extends Generator {
	@inject(Identifiers.Cryptography.Commit.Serializer)
	private readonly commitSerializer!: Contracts.Crypto.CommitSerializer;

	@inject(Identifiers.Cryptography.Transaction.Verifier)
	private readonly transactionVerifier!: Contracts.Crypto.TransactionVerifier;

	@inject(Identifiers.Snapshot.Legacy.Importer)
	@optional()
	private readonly snapshotLegacyImporter?: Contracts.Snapshot.LegacyImporter;

	@inject(Identifiers.Cryptography.Hash.Factory)
	private readonly hashFactory!: Contracts.Crypto.HashFactory;

	@inject(Identifiers.Evm.Instance)
	@tagged("instance", "evm")
	private readonly evm!: Contracts.Evm.Instance;

	#consensusProxyContractAddress!: string;

	async generate(
		genesisMnemonic: string,
		validatorsMnemonics: string[],
		options: Contracts.NetworkGenerator.InternalOptions,
	): Promise<Contracts.Crypto.CommitData> {
		const genesisWallet = await this.createWallet(genesisMnemonic);

		await this.#prepareEvm(genesisWallet.address, validatorsMnemonics.length, options);

		let transactions: Contracts.Crypto.Transaction[] = [];

		if (options.snapshot) {
			await this.#buildFromLegacySnapshot(options);
		} else {
			const validators = await Promise.all(
				validatorsMnemonics.map(async (mnemonic) => await this.createWallet(mnemonic)),
			);

			if (options.distribute) {
				transactions = transactions.concat(
					...(await this.#createTransferTransactions(
						genesisWallet,
						validators,
						options.premine,
						options.chainId,
					)),
				);

				options.premine = transactions
					.reduce((accumulator, current) => accumulator + current.value, 0n)
					.toString();
			} else {
				transactions = transactions.concat(
					await this.#createTransferTransaction(
						genesisWallet,
						genesisWallet,
						options.premine,
						options.chainId,
					),
				);
			}

			const validatorTransactions = [
				...(await this.#buildValidatorTransactions(
					validators,
					options.chainId,
					options.validatorRegistrationFee,
				)),
				...(await this.#buildVoteTransactions(validators, options.chainId)),
			];

			transactions = [...transactions, ...validatorTransactions];
		}

		const genesis = await this.#createGenesisCommit(genesisWallet.keys, validatorsMnemonics, transactions, options);

		return {
			block: { ...genesis.block, transactions: genesis.block.transactions.map((tx) => tx.toData()) },
			proof: genesis.proof,
			serialized: genesis.serialized,
		};
	}

	async #prepareEvm(
		genesisWalletAddress: string,
		validatorsCount: number,
		options: Contracts.NetworkGenerator.InternalOptions,
	) {
		if (options.snapshot) {
			options.premine = "0";
			options.distribute = false;
		}

		await this.app.resolve(Deployer).deploy({
			generatorAddress: genesisWalletAddress,
			initialBlockNumber: options.snapshot
				? Number(this.snapshotLegacyImporter!.genesisBlockNumber)
				: options.initialBlockNumber,
			initialSupply: (options.distribute
				? // Ensure no left over remains when distributing funds from the genesis address (see `#createTransferTransactions`)
					(BigInt(options.premine) / BigInt(validatorsCount)) * BigInt(validatorsCount)
				: BigInt(options.premine)
			).toString(),
			timestamp: dayjs(options.epoch).valueOf(),
		});

		this.#consensusProxyContractAddress = this.app.get<string>(
			EvmConsensusIdentifiers.Contracts.Addresses.Consensus,
		);
	}

	async #createTransferTransaction(
		sender: Wallet,
		recipient: Wallet,
		amount: string,
		chainId: number,
		nonce: number = 0,
	): Promise<Contracts.Crypto.Transaction> {
		return await (
			await this.app
				.resolve(TransactionBuilder)
				.network(chainId)
				.recipientAddress(recipient.address)
				.nonce(nonce.toFixed(0))
				.value(amount)
				.payload("")
				.gasPrice(0)
				.gasLimit(21_000)
				.sign(sender.passphrase)
		).build();
	}

	async #createTransferTransactions(
		sender: Wallet,
		recipients: Wallet[],
		totalPremine: string,
		chainId: number,
	): Promise<Contracts.Crypto.Transaction[]> {
		const amount: string = (BigInt(totalPremine) / BigInt(recipients.length)).toString();

		const result: Contracts.Crypto.Transaction[] = [];

		for (const [index, recipient] of recipients.entries()) {
			result.push(await this.#createTransferTransaction(sender, recipient, amount, chainId, index));
		}

		return result;
	}

	async #buildValidatorTransactions(
		senders: Wallet[],
		chainId: number,
		value: string,
	): Promise<Contracts.Crypto.Transaction[]> {
		const result: Contracts.Crypto.Transaction[] = [];

		for (const [index, sender] of senders.entries()) {
			const { pop } = buildProofOfPossession(Buffer.from(sender.consensusKeys.privateKey, "hex"));
			const data = encodeFunctionData({
				abi: ConsensusAbi.abi,
				args: [`0x${sender.consensusKeys.publicKey}`, bytesToHex(pop)],
				functionName: "registerValidator",
			});

			result[index] = await (
				await this.app
					.resolve(TransactionBuilder)
					.network(chainId)
					.recipientAddress(this.#consensusProxyContractAddress)
					.nonce("0") // validator registration tx is always the first one from sender
					.payload(data)
					.value(value)
					.gasPrice(0)
					.gasLimit(500_000)
					.sign(sender.passphrase)
			).build();
		}

		return result;
	}

	async #buildVoteTransactions(senders: Wallet[], chainId: number): Promise<Contracts.Crypto.Transaction[]> {
		const result: Contracts.Crypto.Transaction[] = [];

		for (const [index, sender] of senders.entries()) {
			const data = encodeFunctionData({
				abi: ConsensusAbi.abi,
				args: [sender.address],
				functionName: "vote",
			});

			result[index] = await (
				await this.app
					.resolve(TransactionBuilder)
					.network(chainId)
					.recipientAddress(this.#consensusProxyContractAddress)
					.nonce("1") // vote transaction is always the 3rd tx from sender (1st one is validator registration)
					.payload(data)
					.gasPrice(0)
					.gasLimit(200_000)
					.sign(sender.passphrase)
			).build();
		}

		return result;
	}

	async #createGenesisCommit(
		premineKeys: Contracts.Crypto.KeyPair,
		validatorsMnemonics: string[],
		transactions: Contracts.Crypto.Transaction[],
		options: Contracts.NetworkGenerator.InternalOptions,
	): Promise<Contracts.Crypto.Commit> {
		const genesisBlock = await this.#createGenesisBlock(premineKeys, validatorsMnemonics, transactions, options);

		const commit: Contracts.Crypto.CommitSerializable = {
			block: genesisBlock.block,
			proof: { round: 0, signature: "0".repeat(192), validators: [] },
		};

		const serialized = await this.commitSerializer.serializeCommit(commit);

		const genesis = {
			...commit,
			serialized: serialized.toString("hex"),
		};

		await this.#ensureValidGenesisBlock(genesis);

		return genesis;
	}

	async #createGenesisBlock(
		keys: Contracts.Crypto.KeyPair,
		validatorsMnemonics: string[],
		transactions: Contracts.Crypto.Transaction[],
		options: Contracts.NetworkGenerator.InternalOptions,
	): Promise<{ block: Contracts.Crypto.Block; transactions: Contracts.Crypto.TransactionData[] }> {
		const totals: { fee: bigint; gasUsed: number } = {
			fee: 0n,
			gasUsed: 0,
		};

		const payloadBuffers: Buffer[] = [];
		const commitKey = {
			blockNumber: BigInt(options.initialBlockNumber),
			round: BigInt(0),
		};
		const timestamp = BigInt(dayjs(options.epoch).valueOf());
		const proposer = await this.app
			.getTagged<Contracts.Crypto.AddressFactory>(
				Identifiers.Cryptography.Identity.Address.Factory,
				"type",
				"wallet",
			)
			.fromPublicKey(keys.publicKey);

		// The initial payload length takes the overhead for each serialized transaction into account
		// which is a uint32 per transaction to store the individual length.
		let payloadSize = transactions.length * 4;

		await this.evm.prepareNextCommit({
			blockContext: {
				commitKey,
				gasLimit: BigInt(30_000_000),
				timestamp,
				validatorAddress: proposer,
			},
		});

		if (options.createLegacyColdWallets) {
			await this.#createLegacyColdWallets(validatorsMnemonics);
		}

		const transactionData: Contracts.Crypto.TransactionData[] = [];
		for (const transaction of transactions) {
			assert.string(transaction.hash);

			const { receipt } = await this.evm.process({
				commitKey,
				data: Buffer.from(transaction.data.slice(2), "hex"),
				from: transaction.from,
				gasLimit: BigInt(transaction.gasLimit),
				gasPrice: BigInt(transaction.gasPrice),
				nonce: transaction.nonce,
				specId: Enums.Evm.SpecId.SHANGHAI,
				to: transaction.to,
				txHash: transaction.hash,
				value: transaction.value,
			});

			totals.fee += BigInt(transaction.gasPrice);
			totals.gasUsed += Number(receipt.gasUsed);

			payloadBuffers.push(Buffer.from(transaction.hash, "hex"));
			transactionData.push(transaction);
			payloadSize += transaction.serialized.length;
		}

		await this.evm.updateRewardsAndVotes({
			blockReward: 0n,
			commitKey,
			specId: Enums.Evm.SpecId.SHANGHAI,
			timestamp,
			validatorAddress: proposer,
		});

		await this.evm.calculateRoundValidators({
			commitKey,
			roundValidators: BigInt(options.validators),
			specId: Enums.Evm.SpecId.SHANGHAI,
			timestamp,
			validatorAddress: proposer,
		});

		return {
			block: await this.app.get<Contracts.Crypto.BlockFactory>(Identifiers.Cryptography.Block.Factory).make(
				{
					fee: totals.fee,
					gasUsed: totals.gasUsed,
					logsBloom: await this.evm.logsBloom(commitKey),
					number: options.initialBlockNumber ?? 0,
					parentHash:
						options.snapshot?.previousGenesisBlockHash ??
						"0000000000000000000000000000000000000000000000000000000000000000",
					payloadSize,
					proposer,
					reward: 0n,
					round: 0,
					stateRoot: await this.evm.stateRoot(
						commitKey,
						options.snapshot?.snapshotHash ??
							"0000000000000000000000000000000000000000000000000000000000000000",
					),
					timestamp: dayjs(options.epoch).valueOf(),
					transactionsCount: transactions.length,
					transactionsRoot: this.hashFactory.sha256(payloadBuffers).toString("hex"),
					version: 1,
				},
				transactions,
			),
			transactions: transactionData,
		};
	}

	async #ensureValidGenesisBlock(genesis: Contracts.Crypto.Commit): Promise<void> {
		const verifiedTransactions = await Promise.all(
			genesis.block.transactions.map((transaction) => this.transactionVerifier.verifyHash(transaction)),
		);

		if (verifiedTransactions.includes(false)) {
			throw new Error("genesis block contains invalid transactions");
		}
	}

	async #buildFromLegacySnapshot(options: Contracts.NetworkGenerator.GenesisBlockOptions) {
		assert.defined(options.snapshot);
		assert.defined(this.snapshotLegacyImporter);

		// Load snapshot into EVM
		const result = await this.snapshotLegacyImporter.import({
			commitKey: {
				blockNumber: this.snapshotLegacyImporter.genesisBlockNumber,
				round: 0n,
			},
			mockFakeValidatorBlsKeys: options.mockFakeValidatorBlsKeys,
			timestamp: dayjs(options.epoch).valueOf(),
		});

		options.initialBlockNumber = Number(this.snapshotLegacyImporter.genesisBlockNumber);

		options.snapshot.snapshotHash = this.snapshotLegacyImporter.snapshotHash;
		options.snapshot.previousGenesisBlockHash = this.snapshotLegacyImporter.previousGenesisBlockHash;
		options.premine = "0";

		this.app
			.get<Contracts.Crypto.Configuration>(Identifiers.Cryptography.Configuration)
			.set("genesisBlock.block.number", options.initialBlockNumber);

		console.log(result);
	}

	async #createLegacyColdWallets(validatorMnemonics: string[]) {
		const legacyColdWallets = await this.#getLegacyColdWallets(validatorMnemonics);
		await this.evm.importLegacyColdWallets(legacyColdWallets.map(({ legacyColdWallet }) => legacyColdWallet));
	}

	async #getLegacyColdWallets(validatorMnemonics: string[]): Promise<
		{
			keyPair: Contracts.Crypto.KeyPair;
			mainsailAddress: string;
			legacyColdWallet: Contracts.Evm.LegacyColdWallet;
		}[]
	> {
		const walletKeyPairFactory = this.app.getTagged<Contracts.Crypto.KeyPairFactory>(
			Identifiers.Cryptography.Identity.KeyPair.Factory,
			"type",
			"wallet",
		);

		const mainsailAddressFactory = this.app.get<Contracts.Crypto.AddressFactory>(
			Identifiers.Cryptography.Identity.Address.Factory,
		);

		const legacyAddressFactory = this.app.get<Contracts.Crypto.AddressFactory>(
			Identifiers.Cryptography.Legacy.Identity.AddressFactory,
		);

		const legacyColdWallets: {
			keyPair: Contracts.Crypto.KeyPair;
			mainsailAddress: string;
			legacyColdWallet: Contracts.Evm.LegacyColdWallet;
		}[] = [];
		for (const secret of validatorMnemonics.values()) {
			// use reversed secret as seed to not conflict with validators
			const reversed = secret.split(" ").reverse().join(" ");

			const walletKeyPair = await walletKeyPairFactory.fromMnemonic(reversed);

			const mainsailAddress = await mainsailAddressFactory.fromPublicKey(walletKeyPair.publicKey);
			const legacyAddress = await legacyAddressFactory.fromPublicKey(walletKeyPair.publicKey);
			legacyColdWallets.push({
				keyPair: walletKeyPair,
				legacyColdWallet: {
					address: legacyAddress,
					balance: 1_000_000_000_000_000_000n,
					legacyAttributes: {},
				},
				mainsailAddress,
			});
		}

		return legacyColdWallets;
	}
}
