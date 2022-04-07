import { injectable } from "@arkecosystem/core-container";
import { Contracts, Identifiers } from "@arkecosystem/core-contracts";
import { TransferBuilder } from "@arkecosystem/core-crypto-transaction-transfer";
import { ValidatorRegistrationBuilder } from "@arkecosystem/core-crypto-transaction-validator-registration";
import { VoteBuilder } from "@arkecosystem/core-crypto-transaction-vote";
import { BigNumber } from "@arkecosystem/utils";
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

		let transactions = [];

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

	async #createTransferTransaction(sender: Wallet, recipient: Wallet, amount: string, pubKeyHash: number, nonce = 1) {
		return this.#formatGenesisTransaction(
			(
				await this.app
					.resolve(TransferBuilder)
					.network(pubKeyHash)
					.fee("10000000")
					.nonce(nonce.toFixed(0))
					.recipientId(recipient.address)
					.amount(amount)
					.sign(sender.passphrase)
			).data,
			sender,
		);
	}

	async #createTransferTransactions(sender: Wallet, recipients: Wallet[], totalPremine: string, pubKeyHash: number) {
		const amount: string = BigNumber.make(totalPremine).dividedBy(recipients.length).toString();

		const result = [];

		for (const [index, recipient] of recipients.entries()) {
			result.push(await this.#createTransferTransaction(sender, recipient, amount, pubKeyHash, index + 1));
		}

		return result;
	}

	async #buildValidatorTransactions(senders: Wallet[], pubKeyHash: number) {
		const result = [];

		for (const [index, sender] of senders.entries()) {
			result[index] = await this.#formatGenesisTransaction(
				(
					await this.app
						.resolve(ValidatorRegistrationBuilder)
						.network(pubKeyHash)
						.fee("2500000000")
						.nonce("1") // validator registration tx is always the first one from sender
						.usernameAsset(`genesis_${index + 1}`)
						.fee(`${25 * 1e8}`)
						.sign(sender.passphrase)
				).data,
				sender,
			);
		}

		return result;
	}

	async #buildVoteTransactions(senders: Wallet[], pubKeyHash: number) {
		const result = [];

		for (const [index, sender] of senders.entries()) {
			result[index] = await this.#formatGenesisTransaction(
				(
					await this.app
						.resolve(VoteBuilder)
						.network(pubKeyHash)
						.fee("100000000")
						.nonce("2") // vote transaction is always the 2nd tx from sender (1st one is validator registration)
						.votesAsset([sender.keys.publicKey])
						.fee(`${1 * 1e8}`)
						.sign(sender.passphrase)
				).data,
				sender,
			);
		}

		return result;
	}

	async #formatGenesisTransaction(transaction, wallet: Wallet) {
		Object.assign(transaction, {
			fee: BigNumber.ZERO,
			timestamp: 0,
		});
		transaction.signature = await this.app
			.get<Contracts.Crypto.ITransactionSigner>(Identifiers.Cryptography.Transaction.Signer)
			.sign(transaction, wallet.keys);
		transaction.id = await this.app
			.get<Contracts.Crypto.ITransactionUtils>(Identifiers.Cryptography.Transaction.Utils)
			.getId(transaction);

		return transaction;
	}

	async #createGenesisBlock(
		keys: Contracts.Crypto.IKeyPair,
		transactions,
		options: Contracts.NetworkGenerator.GenesisBlockOptions,
	): Promise<Contracts.Crypto.IBlockData> {
		const totals: { amount: BigNumber; fee: BigNumber } = {
			amount: BigNumber.ZERO,
			fee: BigNumber.ZERO,
		};

		const payloadBuffers: Buffer[] = [];

		const sortedTransactions = transactions.sort((a, b) => {
			if (a.type === b.type) {
				return a.amount - b.amount;
			}

			return a.type - b.type;
		});

		for (const transaction of sortedTransactions) {
			totals.amount = totals.amount.plus(transaction.amount);
			totals.fee = totals.fee.plus(transaction.fee);

			payloadBuffers.push(Buffer.from(transaction.id, "hex"));
		}

		return {
			...(
				await this.app.get<Contracts.Crypto.IBlockFactory>(Identifiers.Cryptography.Block.Factory).make(
					{
						generatorPublicKey: keys.publicKey,
						height: 1,
						numberOfTransactions: transactions.length,
						payloadHash: (
							await this.app
								.get<Contracts.Crypto.IHashFactory>(Identifiers.Cryptography.HashFactory)
								.sha256(payloadBuffers)
						).toString("hex"),
						payloadLength: 32 * transactions.length,
						previousBlock: "0000000000000000000000000000000000000000000000000000000000000000",
						reward: "0",
						timestamp: dayjs(options.epoch).unix(),
						totalAmount: totals.amount.toString(),
						totalFee: totals.fee.toString(),
						transactions,
						version: 1,
					},
					keys,
				)
			).data,
			transactions,
		};
	}
}
