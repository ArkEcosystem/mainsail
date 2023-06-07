import { injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { TransferBuilder } from "@mainsail/crypto-transaction-transfer";
import { ValidatorRegistrationBuilder } from "@mainsail/crypto-transaction-validator-registration";
import { VoteBuilder } from "@mainsail/crypto-transaction-vote";
import { BigNumber } from "@mainsail/utils";
import dayjs from "dayjs";

import { Wallet } from "../contracts";
import { Generator } from "./generator";

@injectable()
export class GenesisBlockGenerator extends Generator {
	async generate(
		genesisMnemonic: string,
		validatorsMnemonics: string[],
		options: Contracts.NetworkGenerator.GenesisBlockOptions,
	): Promise<Contracts.Crypto.IBlockData> {
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

		return this.#createGenesisBlock(premineWallet.keys, transactions, options);
	}

	async #createTransferTransaction(sender: Wallet, recipient: Wallet, amount: string, pubKeyHash: number, nonce = 1): Promise<Contracts.Crypto.ITransaction> {
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

	async #createTransferTransactions(sender: Wallet, recipients: Wallet[], totalPremine: string, pubKeyHash: number): Promise<Contracts.Crypto.ITransaction[]> {
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

	async #formatGenesisTransaction(transaction: Contracts.Crypto.ITransaction, wallet: Wallet): Promise<Contracts.Crypto.ITransaction> {
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

	async #createGenesisBlock(
		keys: Contracts.Crypto.IKeyPair,
		transactions: Contracts.Crypto.ITransaction[],
		options: Contracts.NetworkGenerator.GenesisBlockOptions,
	): Promise<Contracts.Crypto.IBlockData> {
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

		let payloadLength = transactions.length * 4;

		for (const { serialized, data } of sortedTransactions) {
			totals.amount = totals.amount.plus(data.amount);
			totals.fee = totals.fee.plus(data.fee);

			payloadBuffers.push(Buffer.from(data.id!, "hex"));
			payloadLength += serialized.length;
		}

		return {
			...(
				await this.app.get<Contracts.Crypto.IBlockFactory>(Identifiers.Cryptography.Block.Factory).make({
					generatorPublicKey: keys.publicKey,
					height: 1,
					numberOfTransactions: transactions.length,
					payloadHash: (
						await this.app
							.get<Contracts.Crypto.IHashFactory>(Identifiers.Cryptography.HashFactory)
							.sha256(payloadBuffers)
					).toString("hex"),
					payloadLength,
					previousBlock: "0000000000000000000000000000000000000000000000000000000000000000",
					reward: BigNumber.ZERO,
					timestamp: dayjs(options.epoch).unix(),
					totalAmount: totals.amount,
					totalFee: totals.fee,
					transactions: transactions.map(tx => tx.data),
					version: 1,
				})
			).data,
			transactions: transactions.map(tx => tx.data),
		};
	}
}
