import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { EvmCallBuilder } from "@mainsail/crypto-transaction-evm-call";
import { ContractAbis } from "@mainsail/evm-consensus";
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

	@inject(Identifiers.Evm.Gas.Limits)
	private readonly gasLimits!: Contracts.Evm.GasLimits;

	async generate(
		genesisMnemonic: string,
		validatorsMnemonics: string[],
		options: Contracts.NetworkGenerator.GenesisBlockOptions,
	): Promise<Contracts.Crypto.CommitData> {
		const genesisWallet = await this.createWallet(genesisMnemonic);

		const validators = await Promise.all(
			validatorsMnemonics.map(async (mnemonic) => await this.createWallet(mnemonic)),
		);

		let transactions: Contracts.Crypto.Transaction[] = [];

		if (options.distribute) {
			transactions = transactions.concat(
				...(await this.#createTransferTransactions(
					genesisWallet,
					validators,
					options.premine,
					options.pubKeyHash,
				)),
			);
		} else {
			transactions = transactions.concat(
				await this.#createTransferTransaction(
					genesisWallet,
					genesisWallet,
					options.premine,
					options.pubKeyHash,
				),
			);
		}

		const validatorTransactions = [
			...(await this.#buildValidatorTransactions(validators, options.pubKeyHash)),
			// ...(await this.#buildUsernameTransactions(validators, options.pubKeyHash)),
			...(await this.#buildVoteTransactions(validators, options.pubKeyHash)),
		];

		transactions = [...transactions, ...validatorTransactions];

		const genesis = await this.#createGenesisCommit(genesisWallet.keys, transactions, options);

		return {
			block: genesis.block.data,
			proof: genesis.proof,
			serialized: genesis.serialized,
		};
	}

	async #createTransferTransaction(
		sender: Wallet,
		recipient: Wallet,
		amount: string,
		pubKeyHash: number,
		nonce = 1,
	): Promise<Contracts.Crypto.Transaction> {
		return await (
			await this.app
				.resolve(EvmCallBuilder)
				.network(pubKeyHash)
				.recipientId(recipient.address)
				.nonce(nonce.toFixed(0))
				.amount(amount)
				.payload("")
				.gasLimit(21_000)
				.sign(sender.passphrase)
		).build();
	}

	async #createTransferTransactions(
		sender: Wallet,
		recipients: Wallet[],
		totalPremine: string,
		pubKeyHash: number,
	): Promise<Contracts.Crypto.Transaction[]> {
		const amount: string = BigNumber.make(totalPremine).dividedBy(recipients.length).toString();

		const result: Contracts.Crypto.Transaction[] = [];

		for (const [index, recipient] of recipients.entries()) {
			result.push(await this.#createTransferTransaction(sender, recipient, amount, pubKeyHash, index + 1));
		}

		return result;
	}

	async #buildValidatorTransactions(senders: Wallet[], pubKeyHash: number): Promise<Contracts.Crypto.Transaction[]> {
		const result: Contracts.Crypto.Transaction[] = [];

		const iface = new ethers.Interface(ContractAbis.CONSENSUS.abi.abi);

		// TODO: move to constant (can be calculated based on deployer address + nonce)
		const consensusContractAddress = "0x522B3294E6d06aA25Ad0f1B8891242E335D3B459";

		for (const [index, sender] of senders.entries()) {
			const data = iface
				.encodeFunctionData("registerValidator", [Buffer.from(sender.consensusKeys.publicKey, "hex")])
				.slice(2);

			result[index] = await (
				await this.app
					.resolve(EvmCallBuilder)
					.network(pubKeyHash)
					.recipientId(consensusContractAddress)
					.nonce("1") // validator registration tx is always the first one from sender
					.payload(data)
					.gasLimit(500_000)
					.sign(sender.passphrase)
			).build();
		}

		return result;
	}

	async #buildVoteTransactions(senders: Wallet[], pubKeyHash: number): Promise<Contracts.Crypto.Transaction[]> {
		const result: Contracts.Crypto.Transaction[] = [];

		const iface = new ethers.Interface(ContractAbis.CONSENSUS.abi.abi);

		// TODO: move to constant (can be calculated based on deployer address + nonce)
		const consensusContractAddress = "0x522B3294E6d06aA25Ad0f1B8891242E335D3B459";

		for (const [index, sender] of senders.entries()) {
			const data = iface.encodeFunctionData("vote", [sender.address]).slice(2);

			result[index] = await (
				await this.app
					.resolve(EvmCallBuilder)
					.network(pubKeyHash)
					.recipientId(consensusContractAddress)
					.nonce("2") // vote transaction is always the 3rd tx from sender (1st one is validator registration)
					.payload(data)
					.gasLimit(200_000)
					.sign(sender.passphrase)
			).build();
		}

		return result;
	}

	async #createGenesisCommit(
		premineKeys: Contracts.Crypto.KeyPair,
		transactions: Contracts.Crypto.Transaction[],
		options: Contracts.NetworkGenerator.GenesisBlockOptions,
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
		options: Contracts.NetworkGenerator.GenesisBlockOptions,
	): Promise<{ block: Contracts.Crypto.Block; transactions: Contracts.Crypto.TransactionData[] }> {
		const totals: { amount: BigNumber; fee: BigNumber; gasUsed: number } = {
			amount: BigNumber.ZERO,
			fee: BigNumber.ZERO,
			gasUsed: 0,
		};

		const payloadBuffers: Buffer[] = [];

		// The initial payload length takes the overhead for each serialized transaction into account
		// which is a uint16 per transaction to store the individual length.
		let payloadLength = transactions.length * 2;

		const transactionData: Contracts.Crypto.TransactionData[] = [];
		for (const transaction of transactions) {
			const { serialized, data } = transaction;

			Utils.assert.defined<string>(data.id);

			totals.amount = totals.amount.plus(data.amount);
			totals.fee = totals.fee.plus(data.fee);
			totals.gasUsed += this.gasLimits.of(transaction);

			payloadBuffers.push(Buffer.from(data.id, "hex"));
			transactionData.push(data);
			payloadLength += serialized.length;
		}

		return {
			block: await this.app.get<Contracts.Crypto.BlockFactory>(Identifiers.Cryptography.Block.Factory).make(
				{
					generatorPublicKey: await this.app
						.getTagged<Contracts.Crypto.AddressFactory>(
							Identifiers.Cryptography.Identity.Address.Factory,
							"type",
							"wallet",
						)
						.fromPublicKey(keys.publicKey),
					height: 0,
					numberOfTransactions: transactions.length,
					payloadHash: (
						await this.app
							.get<Contracts.Crypto.HashFactory>(Identifiers.Cryptography.Hash.Factory)
							.sha256(payloadBuffers)
					).toString("hex"),
					payloadLength,
					previousBlock: "0000000000000000000000000000000000000000000000000000000000000000",
					reward: BigNumber.ZERO,
					round: 0,
					stateHash: "0000000000000000000000000000000000000000000000000000000000000000",
					timestamp: dayjs(options.epoch).valueOf(),
					totalAmount: totals.amount,
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
		if (
			!(await Promise.all(
				genesis.block.transactions.map((transaction) => this.transactionVerifier.verifyHash(transaction.data)),
			))
		) {
			throw new Error("genesis block contains invalid transactions");
		}

		const verified = await this.blockVerifier.verify(genesis.block);
		if (!verified.verified) {
			throw new Error(`failed to generate genesis block: ${JSON.stringify(verified.errors)}`);
		}
	}
}
