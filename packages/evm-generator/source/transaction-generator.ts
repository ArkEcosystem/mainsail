import { Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";
import { Application } from "@mainsail/kernel";
import { EvmCalls, Utils } from "@mainsail/test-transaction-builders";
import { assert, randomNumber, sample } from "@mainsail/utils";

import { Identifiers as InternalIdentifiers } from "./identifiers.js";

export interface TransactionGeneratorOptions {
	readonly minPerBlock: number;
	readonly maxPerBlock: number;
}

@injectable()
export class TransactionGenerator {
	@inject(InternalIdentifiers.Application)
	private app!: Application;

	#validatorWallets!: Contracts.Crypto.KeyPair[];
	#preparedTransactions: Contracts.Crypto.Transaction[] = [];
	#senderNonceOffsets: Map<string, number> = new Map();
	//#tokenContracts: string[];
	#recipientWallets: {
		keyPair: Contracts.Crypto.KeyPair;
		address: string;
	}[] = [];

	public async initialize(): Promise<void> {
		const walletKeyPairFactory = this.app.getTagged<Contracts.Crypto.KeyPairFactory>(
			Identifiers.Cryptography.Identity.KeyPair.Factory,
			"type",
			"wallet",
		);

		const secrets = this.app.config<string[]>("validators.secrets");
		assert.defined(secrets);

		const wallets: Contracts.Crypto.KeyPair[] = [];
		for (const secret of secrets.values()) {
			const walletKeyPair = await walletKeyPairFactory.fromMnemonic(secret);
			wallets.push(walletKeyPair);
		}

		this.#validatorWallets = wallets;
	}

	public async prepare(options: TransactionGeneratorOptions): Promise<void> {
		const numberOfTransactions = randomNumber(options.minPerBlock, options.maxPerBlock);

		const transactions: Contracts.Crypto.Transaction[] = Array.from({ length: numberOfTransactions });

		for (let index = 0; index < transactions.length; index++) {
			const randomRecipient = await Utils.getRandomColdWallet({ app: this.app });
			this.#recipientWallets.push(randomRecipient);

			const sender = sample(this.#validatorWallets);
			const value = randomNumber(0, 1_000_000); // WEI to not run out of funds
			const transaction = await EvmCalls.makeEvmCall(
				{
					app: this.app,
					wallets: this.#validatorWallets,
				},
				{
					nonceOffset: this.#getAndIncrementNonceOffset(sender.publicKey),
					recipient: randomRecipient.address,
					sender,
					value,
				},
			);

			transactions[index] = transaction;
		}

		this.#preparedTransactions = transactions;
	}

	[Symbol.asyncIterator](): AsyncIterator<Contracts.Crypto.Transaction> {
		return this;
	}

	public async next(): Promise<IteratorResult<Contracts.Crypto.Transaction>> {
		const transaction = this.#preparedTransactions.shift();
		if (!transaction) {
			return { done: true, value: undefined };
		}

		this.#decrementNonceOffset(transaction.senderPublicKey);
		return { done: false, value: transaction };
	}

	#getAndIncrementNonceOffset(sender: string): number {
		let nonceOffset = 0;
		if (this.#senderNonceOffsets.has(sender)) {
			// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
			nonceOffset = this.#senderNonceOffsets.get(sender)!;
		}

		this.#senderNonceOffsets.set(sender, nonceOffset + 1);
		return nonceOffset;
	}

	#decrementNonceOffset(sender: string): void {
		const nonceOffset = this.#senderNonceOffsets.get(sender);
		assert.defined(nonceOffset);

		if (nonceOffset <= 0) {
			throw new Error("nonce mismatch");
		}

		this.#senderNonceOffsets.set(sender, nonceOffset - 1);
	}
}
