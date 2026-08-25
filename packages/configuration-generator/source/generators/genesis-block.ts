import type { Contracts } from "@mainsail/contracts";

import { Enums, Identifiers } from "@mainsail/constants";
import { inject, injectable, tagged } from "@mainsail/container";
import { buildProofOfPossession } from "@mainsail/crypto-key-pair-bls12-381";
import { TransactionBuilder } from "@mainsail/crypto-transaction";
import { ConsensusAbi, FunctionSigs } from "@mainsail/evm-contracts";
import { Application } from "@mainsail/kernel";
import { assert, ensureError } from "@mainsail/utils";
import dayjs from "dayjs";
import { bytesToHex, encodeFunctionData } from "viem";

import { Wallet } from "../contracts.js";
import { Identifiers as InternalIdentifiers } from "../identifiers.js";
import { WalletGenerator } from "./wallet.js";

@injectable()
export class GenesisBlockGenerator {
	@inject(InternalIdentifiers.Application)
	protected app!: Application;

	@inject(Identifiers.Cryptography.Commit.Serializer)
	private readonly commitSerializer!: Contracts.Crypto.CommitSerializer;

	@inject(Identifiers.Cryptography.Transaction.Verifier)
	private readonly transactionVerifier!: Contracts.Crypto.TransactionVerifier;

	@inject(Identifiers.Cryptography.Transaction.Factory)
	private readonly transactionFactory!: Contracts.Crypto.TransactionFactory;

	@inject(Identifiers.Snapshot.Legacy.Importer)
	private readonly snapshotLegacyImporter!: Contracts.Snapshot.LegacyImporter;

	@inject(Identifiers.Cryptography.Hash.Factory)
	private readonly hashFactory!: Contracts.Crypto.HashFactory;

	@inject(InternalIdentifiers.Generator.Wallet)
	private readonly walletGenerator!: WalletGenerator;

	@inject(Identifiers.Cryptography.Block.Factory)
	private readonly blockFactory!: Contracts.Crypto.BlockFactory;

	@tagged("type", "wallet")
	@inject(Identifiers.Cryptography.Identity.KeyPair.Factory)
	private readonly keyPairFactoryWallet!: Contracts.Crypto.KeyPairFactory;

	@inject(Identifiers.Cryptography.Identity.Address.Factory)
	private readonly addressFactory!: Contracts.Crypto.AddressFactory;

	@inject(Identifiers.Cryptography.Legacy.Identity.AddressFactory)
	private readonly legacyAddressFactory!: Contracts.Crypto.AddressFactory;

	@inject(Identifiers.Evm.Instance)
	@tagged("instance", "evm")
	private readonly evm!: Contracts.Evm.Instance;

	@inject(Identifiers.Services.Log.Service)
	private readonly logger!: Contracts.Kernel.Logger;

	async generate(
		genesisMnemonic: string,
		validatorsMnemonics: string[],
		options: Contracts.NetworkGenerator.InternalOptions,
	): Promise<Contracts.Crypto.CommitData> {
		const genesisWallet = await this.walletGenerator.generate(genesisMnemonic);

		const presignedRegistrations = options.validatorRegistrations
			? await this.#parsePresignedRegistrations(options.validatorRegistrations)
			: undefined;

		const validators = await Promise.all(
			validatorsMnemonics.map(async (mnemonic) => await this.walletGenerator.generate(mnemonic)),
		);

		const premineRecipients = presignedRegistrations
			? [...new Set(presignedRegistrations.map(({ from }) => from))]
			: validators.map(({ address }) => address);

		await this.#prepareEvm(genesisWallet.address, premineRecipients.length, options);

		let transactions: Contracts.Crypto.Transaction[] = [];

		const proposer = await this.app
			.getTagged<Contracts.Crypto.AddressFactory>(
				Identifiers.Cryptography.Identity.Address.Factory,
				"type",
				"wallet",
			)
			.fromPublicKey(genesisWallet.keys.publicKey);

		const commitKey = {
			blockNumber: BigInt(options.initialBlockNumber),
			round: BigInt(0),
		};

		const blockContext = {
			commitKey,
			gasLimit: BigInt(30_000_000),
			timestamp: BigInt(dayjs(options.epoch).valueOf()),
			validatorAddress: proposer,
		};

		const premine = BigInt(options.premine);
		if (premine > 0n) {
			// The premine is always distributed evenly across validators; this also ensures
			// each validator holds enough balance to pay the (payable) registration fee.
			transactions = transactions.concat(
				...(await this.#createTransferTransactions(genesisWallet, premineRecipients, premine, options.chainId)),
			);

			options.premine = transactions.reduce((accumulator, current) => accumulator + current.value, 0n).toString();
		}

		const validatorTransactions = presignedRegistrations ?? [
			...(await this.#buildValidatorTransactions(validators, options.chainId, "0")),
			...(await this.#buildVoteTransactions(validators, options.chainId)),
		];

		transactions = [...transactions, ...validatorTransactions];

		if (options.snapshot) {
			await this.#importLegacySnapshotData(options);
		}

		if (options.createLegacyColdWallets) {
			await this.#createLegacyColdWallets(blockContext, validatorsMnemonics);
		}

		const genesis = await this.#createGenesisCommit(blockContext, transactions, options);

		return {
			block: { ...genesis.block, transactions: genesis.block.transactions.map((tx) => tx.toData()) },
			proof: genesis.proof,
			serialized: genesis.serialized,
		};
	}

	async #prepareEvm(
		genesisWalletAddress: string,
		premineRecipientsCount: number,
		options: Contracts.NetworkGenerator.InternalOptions,
	) {
		const genesisInfo: Contracts.Evm.GenesisInfo = {
			account: genesisWalletAddress,
			deployerAccount: this.app.get<string>(Identifiers.EvmConsensus.DeployerAddress),
			initialBlockNumber: BigInt(options.initialBlockNumber),
			// Ensure no left over remains when distributing funds from the genesis address (see `#createTransferTransactions`).
			// In snapshot mode premine is "0", so this mints nothing and the snapshot importer supplies the state.
			initialSupply: options.snapshot
				? 0n
				: (BigInt(options.premine) / BigInt(premineRecipientsCount)) * BigInt(premineRecipientsCount),

			usernameContract: this.app.get<string>(Identifiers.EvmConsensus.Contracts.Usernames), // PROXY Uses nonce 3
			validatorContract: this.app.get<string>(Identifiers.EvmConsensus.Contracts.Consensus), // PROXY Uses nonce 1
		};

		this.app.rebind(Identifiers.EvmConsensus.GenesisInfo).toConstantValue(genesisInfo);

		await this.app.get<Contracts.EvmConsensus.Deployer>(Identifiers.EvmConsensus.Deployer).deploy();
	}

	async #createTransferTransaction(
		sender: Wallet,
		recipientAddress: string,
		amount: bigint,
		chainId: number,
		nonce: number = 0,
	): Promise<Contracts.Crypto.Transaction> {
		return await (
			await this.app
				.resolve(TransactionBuilder)
				.network(chainId)
				.recipientAddress(recipientAddress)
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
		recipientAddresses: string[],
		totalPremine: bigint,
		chainId: number,
	): Promise<Contracts.Crypto.Transaction[]> {
		const amount = totalPremine / BigInt(recipientAddresses.length);

		const result: Contracts.Crypto.Transaction[] = [];

		for (const [index, recipientAddress] of recipientAddresses.entries()) {
			result.push(await this.#createTransferTransaction(sender, recipientAddress, amount, chainId, index));
		}

		return result;
	}

	async #parsePresignedRegistrations(serialized: string[]): Promise<Contracts.Crypto.Transaction[]> {
		const consensusContractAddress = this.app.get<string>(Identifiers.EvmConsensus.Contracts.Consensus);

		const transactions: Contracts.Crypto.Transaction[] = [];

		for (const [index, serializedTransaction] of serialized.entries()) {
			let transaction: Contracts.Crypto.Transaction;
			try {
				transaction = await this.transactionFactory.fromHex(serializedTransaction);
			} catch (error) {
				throw new Error(`validatorRegistrations[${index}] is invalid: ${ensureError(error).message}`);
			}

			if (
				transaction.to !== consensusContractAddress ||
				!transaction.data.startsWith(FunctionSigs.ConsensusV1.RegisterValidator)
			) {
				throw new Error(
					`validatorRegistrations[${index}] is not a registerValidator call to the consensus contract.`,
				);
			}

			transactions.push(transaction);
		}

		return transactions;
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
					.recipientAddress(this.app.get<string>(Identifiers.EvmConsensus.Contracts.Consensus))
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
					.recipientAddress(this.app.get<string>(Identifiers.EvmConsensus.Contracts.Consensus))
					.nonce("1") // vote transaction is always the 2nd tx from sender (1st one is validator registration)
					.payload(data)
					.gasPrice(0)
					.gasLimit(200_000)
					.sign(sender.passphrase)
			).build();
		}

		return result;
	}

	async #createGenesisCommit(
		blockContext: Contracts.Evm.BlockContext,
		transactions: Contracts.Crypto.Transaction[],
		options: Contracts.NetworkGenerator.InternalOptions,
	): Promise<Contracts.Crypto.Commit> {
		const genesisBlock = await this.#createGenesisBlock(blockContext, transactions, options);

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
		blockContext: Contracts.Evm.BlockContext,
		transactions: Contracts.Crypto.Transaction[],
		options: Contracts.NetworkGenerator.InternalOptions,
	): Promise<{ block: Contracts.Crypto.Block; transactions: Contracts.Crypto.TransactionData[] }> {
		const totals: { fee: bigint; gasUsed: number } = {
			fee: 0n,
			gasUsed: 0,
		};

		const payloadBuffers: Buffer[] = [];

		// The initial payload length takes the overhead for each serialized transaction into account
		// which is a uint32 per transaction to store the individual length.
		let payloadSize = transactions.length * 4;

		await this.evm.prepareNextCommit({
			blockContext,
		});

		const transactionData: Contracts.Crypto.TransactionData[] = [];
		for (const transaction of transactions) {
			assert.string(transaction.hash);

			const { receipt } = await this.evm.process({
				commitKey: blockContext.commitKey,
				data: Buffer.from(transaction.data.slice(2), "hex"),
				from: transaction.from,
				gasLimit: BigInt(transaction.gasLimit),
				gasPrice: BigInt(transaction.gasPrice),
				nonce: transaction.nonce,
				specId: Enums.Evm.SpecId.OSAKA,
				to: transaction.to,
				txHash: transaction.hash,
				value: transaction.value,
			});

			if (!receipt.status) {
				throw new Error(
					`genesis transaction ${transaction.hash} (from ${transaction.from} to ${transaction.to}) reverted during EVM execution`,
				);
			}

			totals.fee += BigInt(transaction.gasPrice);
			totals.gasUsed += Number(receipt.gasUsed);

			payloadBuffers.push(Buffer.from(transaction.hash, "hex"));
			transactionData.push(transaction);
			payloadSize += transaction.serialized.length;
		}

		await this.evm.updateRewardsAndVotes({
			blockReward: 0n,
			commitKey: blockContext.commitKey,
			specId: Enums.Evm.SpecId.OSAKA,
			timestamp: blockContext.timestamp,
			validatorAddress: blockContext.validatorAddress,
		});

		await this.evm.updateValidatorRegistrationFee({
			commitKey: blockContext.commitKey,
			fee: BigInt(options.validatorRegistrationFee),
			specId: Enums.Evm.SpecId.OSAKA,
			timestamp: blockContext.timestamp,
			validatorAddress: blockContext.validatorAddress,
		});

		await this.evm.calculateRoundValidators({
			commitKey: blockContext.commitKey,
			roundValidators: BigInt(options.validators),
			specId: Enums.Evm.SpecId.OSAKA,
			timestamp: blockContext.timestamp,
			validatorAddress: blockContext.validatorAddress,
		});

		return {
			block: await this.blockFactory.make(
				{
					fee: totals.fee,
					gasUsed: totals.gasUsed,
					logsBloom: await this.evm.logsBloom(blockContext.commitKey),
					number: options.initialBlockNumber ?? 0,
					parentHash:
						options.snapshot?.previousGenesisBlockHash ??
						"0000000000000000000000000000000000000000000000000000000000000000",
					payloadSize,
					proposer: blockContext.validatorAddress,
					randaoReveal: "00".repeat(96),
					reward: 0n,
					round: 0,
					stateRoot: await this.evm.stateRoot(
						blockContext.commitKey,
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

	async #importLegacySnapshotData(options: Contracts.NetworkGenerator.GenesisBlockOptions) {
		assert.defined(options.snapshot);

		// Load snapshot into EVM
		const result = await this.snapshotLegacyImporter.import({
			commitKey: {
				blockNumber: this.snapshotLegacyImporter.genesisBlockNumber,
				round: 0n,
			},
			timestamp: dayjs(options.epoch).valueOf(),
		});

		options.snapshot.snapshotHash = this.snapshotLegacyImporter.snapshotHash;
		options.snapshot.previousGenesisBlockHash = this.snapshotLegacyImporter.previousGenesisBlockHash;

		this.app
			.get<Contracts.Crypto.Configuration>(Identifiers.Cryptography.Configuration)
			.set("genesisBlock.block.number", options.initialBlockNumber);

		this.logger.info(
			`Imported legacy snapshot: ${result.importedValidators} dormant validators, ${result.importedUsernames} usernames, ${result.importedVoters} voters (initial total supply ${result.initialTotalSupply})`,
		);
	}

	async #createLegacyColdWallets(blockContext: Contracts.Evm.BlockContext, validatorMnemonics: string[]) {
		await this.evm.prepareNextCommit({
			blockContext,
		});

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
		const legacyColdWallets: {
			keyPair: Contracts.Crypto.KeyPair;
			mainsailAddress: string;
			legacyColdWallet: Contracts.Evm.LegacyColdWallet;
		}[] = [];
		for (const secret of validatorMnemonics.values()) {
			// use reversed secret as seed to not conflict with validators
			const reversed = secret.split(" ").reverse().join(" ");

			const walletKeyPair = await this.keyPairFactoryWallet.fromMnemonic(reversed);

			const mainsailAddress = await this.addressFactory.fromPublicKey(walletKeyPair.publicKey);
			const legacyAddress = await this.legacyAddressFactory.fromPublicKey(walletKeyPair.publicKey);
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
