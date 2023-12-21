import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { TransferBuilder } from "@mainsail/crypto-transaction-transfer";
import { UsernameRegistrationBuilder } from "@mainsail/crypto-transaction-username-registration";
import { ValidatorRegistrationBuilder } from "@mainsail/crypto-transaction-validator-registration";
import { VoteBuilder } from "@mainsail/crypto-transaction-vote";
import { Utils } from "@mainsail/kernel";
import { BigNumber } from "@mainsail/utils";
import dayjs from "dayjs";

import { Wallet } from "../contracts";
import { Generator } from "./generator";

@injectable()
export class GenesisBlockGenerator extends Generator {
	@inject(Identifiers.Cryptography.Commit.Serializer)
	private readonly commitSerializer!: Contracts.Crypto.CommitSerializer;

	@inject(Identifiers.Cryptography.Block.Verifier)
	private readonly blockVerifier!: Contracts.Crypto.BlockVerifier;

	@inject(Identifiers.Cryptography.Transaction.Verifier)
	private readonly transactionVerifier!: Contracts.Crypto.TransactionVerifier;

	async generate(
		genesisMnemonic: string,
		validatorsMnemonics: string[],
		options: Contracts.NetworkGenerator.GenesisBlockOptions,
	): Promise<Contracts.Crypto.CommitData> {
		const premineWallet = await this.createWallet();

		const genesisWallet = await this.createWallet(genesisMnemonic);

		const validators = await Promise.all(
			validatorsMnemonics.map(async (mnemonic) => await this.createWallet(mnemonic)),
		);

		let transactions: Contracts.Crypto.Transaction[] = [];

		if (options.distribute) {
			transactions = transactions.concat(
				...(await this.#createTransferTransactions(
					premineWallet,
					validators,
					options.premine,
					options.pubKeyHash,
				)),
			);
		} else {
			transactions = transactions.concat(
				await this.#createTransferTransaction(
					premineWallet,
					genesisWallet,
					options.premine,
					options.pubKeyHash,
				),
			);
		}

		const validatorTransactions = [
			...(await this.#buildValidatorTransactions(validators, options.pubKeyHash)),
			...(await this.#buildUsernameTransactions(validators, options.pubKeyHash)),
			...(await this.#buildVoteTransactions(validators, options.pubKeyHash)),
		];

		transactions = [...transactions, ...validatorTransactions];

		const genesis = await this.#createGenesisCommit(premineWallet.keys, transactions, options);

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
				.resolve(TransferBuilder)
				.network(pubKeyHash)
				.nonce(nonce.toFixed(0))
				.recipientId(recipient.address)
				.amount(amount)
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

		for (const [index, sender] of senders.entries()) {
			result[index] = await (
				await this.app
					.resolve(ValidatorRegistrationBuilder)
					.network(pubKeyHash)
					.nonce("1") // validator registration tx is always the first one from sender
					.publicKeyAsset(sender.consensusKeys.publicKey)
					.sign(sender.passphrase)
			).build();
		}

		return result;
	}

	async #buildUsernameTransactions(senders: Wallet[], pubKeyHash: number): Promise<Contracts.Crypto.Transaction[]> {
		const result: Contracts.Crypto.Transaction[] = [];

		for (const [index, sender] of senders.entries()) {
			result[index] = await (
				await this.app
					.resolve(UsernameRegistrationBuilder)
					.network(pubKeyHash)
					.nonce("2") // username registration tx is always the 2nd one from sender
					.usernameAsset(`genesis_${index + 1}`)
					.sign(sender.passphrase)
			).build();
		}

		return result;
	}

	async #buildVoteTransactions(senders: Wallet[], pubKeyHash: number): Promise<Contracts.Crypto.Transaction[]> {
		const result: Contracts.Crypto.Transaction[] = [];

		for (const [index, sender] of senders.entries()) {
			result[index] = await (
				await this.app
					.resolve(VoteBuilder)
					.network(pubKeyHash)
					.nonce("3") // vote transaction is always the 3rd tx from sender (1st one is validator registration)
					.votesAsset([sender.keys.publicKey])
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
		const totals: { amount: BigNumber; fee: BigNumber } = {
			amount: BigNumber.ZERO,
			fee: BigNumber.ZERO,
		};

		const payloadBuffers: Buffer[] = [];

		// The initial payload length takes the overhead for each serialized transaction into account
		// which is a uint32 per transaction to store the individual length.
		let payloadLength = transactions.length * 4;

		const transactionData: Contracts.Crypto.TransactionData[] = [];
		for (const { serialized, data } of transactions) {
			Utils.assert.defined<string>(data.id);

			totals.amount = totals.amount.plus(data.amount);
			totals.fee = totals.fee.plus(data.fee);

			payloadBuffers.push(Buffer.from(data.id, "hex"));
			transactionData.push(data);
			payloadLength += serialized.length;
		}

		return {
			block: await this.app.get<Contracts.Crypto.BlockFactory>(Identifiers.Cryptography.Block.Factory).make({
				generatorPublicKey: keys.publicKey,
				height: 0,
				numberOfTransactions: transactions.length,
				payloadHash: (
					await this.app
						.get<Contracts.Crypto.HashFactory>(Identifiers.Cryptography.HashFactory)
						.sha256(payloadBuffers)
				).toString("hex"),
				payloadLength,
				previousBlock: "0000000000000000000000000000000000000000000000000000000000000000",
				reward: BigNumber.ZERO,
				timestamp: dayjs(options.epoch).valueOf(),
				totalAmount: totals.amount,
				totalFee: totals.fee,
				transactions: transactionData,
				version: 1,
			}),
			transactions: transactionData,
		};
	}

	async #ensureValidGenesisBlock(genesis: Contracts.Crypto.Commit): Promise<void> {
		if (!await Promise.all(genesis.block.transactions.map(transaction => this.transactionVerifier.verifyHash(transaction.data)))) {
			throw new Error("genesis block contains invalid transactions");
		}

		const verified = await this.blockVerifier.verify(genesis.block);
		if (!verified.verified) {
			throw new Error("failed to generate genesis block");
		}
	}
}
