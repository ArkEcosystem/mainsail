import { inject, injectable, tagged } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { TransferBuilder } from "@mainsail/crypto-transaction-transfer";
import { ValidatorRegistrationBuilder } from "@mainsail/crypto-transaction-validator-registration";
import { VoteBuilder } from "@mainsail/crypto-transaction-vote";
import { Utils } from "@mainsail/kernel";
import { BigNumber } from "@mainsail/utils";
import dayjs from "dayjs";

import { Wallet } from "../contracts";
import { Generator } from "./generator";

@injectable()
export class GenesisBlockGenerator extends Generator {
	@inject(Identifiers.Cryptography.Signature)
	@tagged("type", "consensus")
	private readonly signatureFactory!: Contracts.Crypto.ISignature;

	@inject(Identifiers.Cryptography.Block.Serializer)
	private readonly blockSerializer!: Contracts.Crypto.IBlockSerializer;

	async generate(
		genesisMnemonic: string,
		validatorsMnemonics: string[],
		options: Contracts.NetworkGenerator.GenesisBlockOptions,
	): Promise<Contracts.Crypto.ICommittedBlockData> {
		const premineWallet = await this.createWallet();

		const genesisWallet = await this.createWallet(genesisMnemonic);

		const validators = await Promise.all(
			validatorsMnemonics.map(async (mnemonic) => await this.createWallet(mnemonic)),
		);

		let transactions: Contracts.Crypto.ITransaction[] = [];

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

		transactions = transactions.concat(
			...(await this.#buildValidatorTransactions(validators, options.pubKeyHash)),
			...(await this.#buildVoteTransactions(validators, options.pubKeyHash)),
		);

		const genesis = await this.#createCommittedGenesisBlock(validators, premineWallet.keys, transactions, options);

		return {
			block: genesis.block.data,
			commit: genesis.commit,
			serialized: genesis.serialized,
		};
	}

	async #createTransferTransaction(
		sender: Wallet,
		recipient: Wallet,
		amount: string,
		pubKeyHash: number,
		nonce = 1,
	): Promise<Contracts.Crypto.ITransaction> {
		return this.#formatGenesisTransaction(
			await (
				await this.app
					.resolve(TransferBuilder)
					.network(pubKeyHash)
					.fee("10000000")
					.nonce(nonce.toFixed(0))
					.recipientId(recipient.address)
					.amount(amount)
					.sign(sender.passphrase)
			).build(),
			sender,
		);
	}

	async #createTransferTransactions(
		sender: Wallet,
		recipients: Wallet[],
		totalPremine: string,
		pubKeyHash: number,
	): Promise<Contracts.Crypto.ITransaction[]> {
		const amount: string = BigNumber.make(totalPremine).dividedBy(recipients.length).toString();

		const result: Contracts.Crypto.ITransaction[] = [];

		for (const [index, recipient] of recipients.entries()) {
			result.push(await this.#createTransferTransaction(sender, recipient, amount, pubKeyHash, index + 1));
		}

		return result;
	}

	async #buildValidatorTransactions(senders: Wallet[], pubKeyHash: number): Promise<Contracts.Crypto.ITransaction[]> {
		const result: Contracts.Crypto.ITransaction[] = [];

		for (const [index, sender] of senders.entries()) {
			result[index] = await this.#formatGenesisTransaction(
				await (
					await this.app
						.resolve(ValidatorRegistrationBuilder)
						.network(pubKeyHash)
						.fee("2500000000")
						.nonce("1") // validator registration tx is always the first one from sender
						.usernameAsset(`genesis_${index + 1}`)
						.publicKeyAsset(sender.consensusKeys.publicKey)
						.fee(`${25 * 1e8}`)
						.sign(sender.passphrase)
				).build(),
				sender,
			);
		}

		return result;
	}

	async #buildVoteTransactions(senders: Wallet[], pubKeyHash: number): Promise<Contracts.Crypto.ITransaction[]> {
		const result: Contracts.Crypto.ITransaction[] = [];

		for (const [index, sender] of senders.entries()) {
			result[index] = await this.#formatGenesisTransaction(
				await (
					await this.app
						.resolve(VoteBuilder)
						.network(pubKeyHash)
						.fee("100000000")
						.nonce("2") // vote transaction is always the 2nd tx from sender (1st one is validator registration)
						.votesAsset([sender.keys.publicKey])
						.fee(`${1 * 1e8}`)
						.sign(sender.passphrase)
				).build(),
				sender,
			);
		}

		return result;
	}

	async #formatGenesisTransaction(
		transaction: Contracts.Crypto.ITransaction,
		wallet: Wallet,
	): Promise<Contracts.Crypto.ITransaction> {
		Object.assign(transaction.data, {
			fee: BigNumber.ZERO,
			timestamp: 0,
		});

		transaction.data.signature = await this.app
			.get<Contracts.Crypto.ITransactionSigner>(Identifiers.Cryptography.Transaction.Signer)
			.sign(transaction.data, wallet.keys);
		transaction.data.id = await this.app
			.get<Contracts.Crypto.ITransactionUtils>(Identifiers.Cryptography.Transaction.Utils)
			.getId(transaction.data);

		return transaction;
	}

	async #createCommittedGenesisBlock(
		validators: Wallet[],
		premineKeys: Contracts.Crypto.IKeyPair,
		transactions: Contracts.Crypto.ITransaction[],
		options: Contracts.NetworkGenerator.GenesisBlockOptions,
	): Promise<Contracts.Crypto.ICommittedBlock> {
		const genesisBlock = await this.#createGenesisBlock(premineKeys, transactions, options);

		const proof = await this.#createCommitProof(validators, genesisBlock.block.data);
		const commitBlock: Contracts.Crypto.ICommittedBlockSerializable = {
			block: genesisBlock.block,
			commit: proof,
		};

		const serialized = await this.blockSerializer.serializeFull(commitBlock);

		return {
			...commitBlock,
			serialized: serialized.toString("hex"),
		};
	}

	async #createGenesisBlock(
		keys: Contracts.Crypto.IKeyPair,
		transactions: Contracts.Crypto.ITransaction[],
		options: Contracts.NetworkGenerator.GenesisBlockOptions,
	): Promise<{ block: Contracts.Crypto.IBlock; transactions: Contracts.Crypto.ITransactionData[] }> {
		const totals: { amount: BigNumber; fee: BigNumber } = {
			amount: BigNumber.ZERO,
			fee: BigNumber.ZERO,
		};

		const payloadBuffers: Buffer[] = [];

		const sortedTransactions = transactions.sort((a, b) => {
			if (a.type === b.type) {
				return a.data.amount.comparedTo(b.data.amount);
			}

			return a.type - b.type;
		});

		// The initial payload length takes the overhead for each serialized transaction into account
		// which is a uint32 per transaction to store the individual length.
		let payloadLength = transactions.length * 4;

		const transactionData: Contracts.Crypto.ITransactionData[] = [];
		for (const { serialized, data } of sortedTransactions) {
			Utils.assert.defined<string>(data.id);

			totals.amount = totals.amount.plus(data.amount);
			totals.fee = totals.fee.plus(data.fee);

			payloadBuffers.push(Buffer.from(data.id, "hex"));
			transactionData.push(data);
			payloadLength += serialized.length;
		}

		return {
			block: await this.app.get<Contracts.Crypto.IBlockFactory>(Identifiers.Cryptography.Block.Factory).make({
				generatorPublicKey: keys.publicKey,
				height: 0,
				numberOfTransactions: transactions.length,
				payloadHash: (
					await this.app
						.get<Contracts.Crypto.IHashFactory>(Identifiers.Cryptography.HashFactory)
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

	async #createCommitProof(
		validators: Wallet[],
		genesisBlock: Contracts.Crypto.IBlockData,
	): Promise<Contracts.Crypto.IBlockCommit> {
		const signatures: Buffer[] = [];
		const serialized = await this.blockSerializer.serializeWithTransactions(genesisBlock);

		for (const wallet of validators) {
			const message = Buffer.concat([Buffer.from(wallet.keys.publicKey, "hex"), serialized]);
			const signature = await this.signatureFactory.sign(
				message,
				Buffer.from(wallet.consensusKeys.privateKey, "hex"),
			);
			signatures.push(Buffer.from(signature, "hex"));
		}

		return {
			round: 0,
			signature: await this.signatureFactory.aggregate(signatures),
			validators: validators.map((v) => true),
		};
	}
}
