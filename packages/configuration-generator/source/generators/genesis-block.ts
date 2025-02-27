import { inject, injectable, optional, tagged } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { EvmCallBuilder } from "@mainsail/crypto-transaction-evm-call";
import { Deployer, Identifiers as EvmConsensusIdentifiers } from "@mainsail/evm-consensus";
import { ConsensusAbi } from "@mainsail/evm-contracts";
import { Utils } from "@mainsail/kernel";
import { BigNumber } from "@mainsail/utils";
import dayjs from "dayjs";
import { ethers } from "ethers";

import { Wallet } from "../contracts.js";
import { Generator } from "./generator.js";

@injectable()
export class GenesisBlockGenerator extends Generator {
	@inject(Identifiers.Cryptography.Commit.Serializer)
	private readonly commitSerializer!: Contracts.Crypto.CommitSerializer;

	@inject(Identifiers.Cryptography.Block.Verifier)
	private readonly blockVerifier!: Contracts.Crypto.BlockVerifier;

	@inject(Identifiers.Cryptography.Transaction.Verifier)
	private readonly transactionVerifier!: Contracts.Crypto.TransactionVerifier;

	@inject(Identifiers.Snapshot.Legacy.Importer)
	@optional()
	private readonly snapshotLegacyImporter?: Contracts.Snapshot.LegacyImporter;

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
					.reduce((accumulator, current) => accumulator.plus(current.data.value), BigNumber.ZERO)
					.toFixed();
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
				...(await this.#buildValidatorTransactions(validators, options.chainId)),
				...(await this.#buildVoteTransactions(validators, options.chainId)),
			];

			transactions = [...transactions, ...validatorTransactions];
		}

		const genesis = await this.#createGenesisCommit(genesisWallet.keys, transactions, options);

		return {
			block: genesis.block.data,
			proof: genesis.proof,
			serialized: genesis.serialized,
		};
	}

	async #prepareEvm(
		genesisWalletAddress: string,
		validatorsCount: number,
		options: Contracts.NetworkGenerator.InternalOptions,
	) {
		await this.app.resolve(Deployer).deploy({
			generatorAddress: genesisWalletAddress,
			timestamp: dayjs(options.epoch).valueOf(),
			totalAmount: (options.distribute
				? // Ensure no left over remains when distributing funds from the genesis address (see `#createTransferTransactions`)
					BigNumber.make(options.premine).dividedBy(validatorsCount).times(validatorsCount)
				: BigNumber.make(options.premine)
			).toString(),
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
		nonce = 0,
	): Promise<Contracts.Crypto.Transaction> {
		return await (
			await this.app
				.resolve(EvmCallBuilder)
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
		const amount: string = BigNumber.make(totalPremine).dividedBy(recipients.length).toString();

		const result: Contracts.Crypto.Transaction[] = [];

		for (const [index, recipient] of recipients.entries()) {
			result.push(await this.#createTransferTransaction(sender, recipient, amount, chainId, index));
		}

		return result;
	}

	async #buildValidatorTransactions(senders: Wallet[], chainId: number): Promise<Contracts.Crypto.Transaction[]> {
		const result: Contracts.Crypto.Transaction[] = [];

		const iface = new ethers.Interface(ConsensusAbi.abi);

		for (const [index, sender] of senders.entries()) {
			const data = iface
				.encodeFunctionData("registerValidator", [Buffer.from(sender.consensusKeys.publicKey, "hex")])
				.slice(2);

			result[index] = await (
				await this.app
					.resolve(EvmCallBuilder)
					.network(chainId)
					.recipientAddress(this.#consensusProxyContractAddress)
					.nonce("0") // validator registration tx is always the first one from sender
					.payload(data)
					.gasPrice(0)
					.gasLimit(500_000)
					.sign(sender.passphrase)
			).build();
		}

		return result;
	}

	async #buildVoteTransactions(senders: Wallet[], chainId: number): Promise<Contracts.Crypto.Transaction[]> {
		const result: Contracts.Crypto.Transaction[] = [];

		const iface = new ethers.Interface(ConsensusAbi.abi);

		for (const [index, sender] of senders.entries()) {
			const data = iface.encodeFunctionData("vote", [sender.address]).slice(2);

			result[index] = await (
				await this.app
					.resolve(EvmCallBuilder)
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
		transactions: Contracts.Crypto.Transaction[],
		options: Contracts.NetworkGenerator.InternalOptions,
	): Promise<Contracts.Crypto.Commit> {
		const genesisBlock = await this.#createGenesisBlock(premineKeys, transactions, options);

		const commit: Contracts.Crypto.CommitSerializable = {
			block: genesisBlock.block,
			proof: { round: 0, signature: "", validators: [] },
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
		transactions: Contracts.Crypto.Transaction[],
		options: Contracts.NetworkGenerator.InternalOptions,
	): Promise<{ block: Contracts.Crypto.Block; transactions: Contracts.Crypto.TransactionData[] }> {
		const totals: { amount: BigNumber; fee: BigNumber; gasUsed: number } = {
			amount: BigNumber.ZERO,
			fee: BigNumber.ZERO,
			gasUsed: 0,
		};

		const payloadBuffers: Buffer[] = [];
		const commitKey = {
			height: BigInt(0),
			round: BigInt(0),
		};
		const timestamp = BigInt(dayjs(options.epoch).valueOf());
		const generatorAddress = await this.app
			.getTagged<Contracts.Crypto.AddressFactory>(
				Identifiers.Cryptography.Identity.Address.Factory,
				"type",
				"wallet",
			)
			.fromPublicKey(keys.publicKey);

		// The initial payload length takes the overhead for each serialized transaction into account
		// which is a uint32 per transaction to store the individual length.
		let payloadLength = transactions.length * 4;

		await this.evm.prepareNextCommit({ commitKey });

		const transactionData: Contracts.Crypto.TransactionData[] = [];
		for (const transaction of transactions) {
			const { serialized, data } = transaction;

			Utils.assert.defined<string>(data.id);

			const { receipt } = await this.evm.process({
				blockContext: {
					commitKey,
					gasLimit: BigInt(30_000_000),
					timestamp,
					validatorAddress: generatorAddress,
				},
				caller: transaction.data.senderAddress,
				data: Buffer.from(transaction.data.data, "hex"),
				gasLimit: BigInt(transaction.data.gasLimit),
				gasPrice: BigInt(transaction.data.gasPrice),
				nonce: transaction.data.nonce.toBigInt(),
				recipient: transaction.data.recipientAddress,
				sequence: transaction.data.sequence,
				specId: Contracts.Evm.SpecId.SHANGHAI,
				txHash: transaction.id,
				value: transaction.data.value.toBigInt(),
			});

			totals.amount = totals.amount.plus(data.value);
			totals.fee = totals.fee.plus(data.gasPrice);
			totals.gasUsed += Number(receipt.gasUsed);

			payloadBuffers.push(Buffer.from(data.id, "hex"));
			transactionData.push(data);
			payloadLength += serialized.length;
		}

		await this.evm.updateRewardsAndVotes({
			blockReward: 0n,
			commitKey,
			specId: Contracts.Evm.SpecId.SHANGHAI,
			timestamp,
			validatorAddress: generatorAddress,
		});

		await this.evm.calculateActiveValidators({
			activeValidators: Utils.BigNumber.make(options.validators).toBigInt(),
			commitKey,
			specId: Contracts.Evm.SpecId.SHANGHAI,
			timestamp,
			validatorAddress: generatorAddress,
		});

		return {
			block: await this.app.get<Contracts.Crypto.BlockFactory>(Identifiers.Cryptography.Block.Factory).make(
				{
					generatorAddress,
					height: 0,
					logsBloom: await this.evm.logsBloom(commitKey),
					numberOfTransactions: transactions.length,
					payloadHash: (
						await this.app
							.get<Contracts.Crypto.HashFactory>(Identifiers.Cryptography.Hash.Factory)
							.sha256(payloadBuffers)
					).toString("hex"),
					payloadLength,
					previousBlock:
						options.snapshot?.snapshotHash ??
						"0000000000000000000000000000000000000000000000000000000000000000",
					reward: BigNumber.ZERO,
					round: 0,
					stateHash:
						options.snapshot?.stateHash ??
						(await this.evm.stateHash(
							commitKey,
							"0000000000000000000000000000000000000000000000000000000000000000",
						)),
					timestamp: dayjs(options.epoch).valueOf(),
					totalAmount: options.snapshot ? Utils.BigNumber.make(options.premine) : totals.amount,
					totalFee: totals.fee,
					totalGasUsed: totals.gasUsed,
					transactions: transactionData,
					version: 1,
				},
				transactions,
			),
			transactions: transactionData,
		};
	}

	async #ensureValidGenesisBlock(genesis: Contracts.Crypto.Commit): Promise<void> {
		const verifiedTransactions = await Promise.all(
			genesis.block.transactions.map((transaction) => this.transactionVerifier.verifyHash(transaction.data)),
		);

		if (verifiedTransactions.includes(false)) {
			throw new Error("genesis block contains invalid transactions");
		}

		const verified = await this.blockVerifier.verify(genesis.block);
		if (!verified.verified) {
			throw new Error(`failed to generate genesis block: ${JSON.stringify(verified.errors)}`);
		}
	}

	async #buildFromLegacySnapshot(options: Contracts.NetworkGenerator.GenesisBlockOptions) {
		Utils.assert.defined(options.snapshot);
		Utils.assert.defined(this.snapshotLegacyImporter);

		// Load snapshot into EVM
		const result = await this.snapshotLegacyImporter.import({
			commitKey: {
				height: 0n,
				round: 0n,
			},
			timestamp: dayjs(options.epoch).valueOf(),
		});

		options.snapshot.snapshotHash = this.snapshotLegacyImporter.snapshotHash;
		options.snapshot.stateHash = result.stateHash;
		options.premine = result.initialTotalSupply.toString();

		console.log(result);
	}
}
