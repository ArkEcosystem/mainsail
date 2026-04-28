import type { Contracts } from "@mainsail/contracts";

import { type TransactionBuilder } from "@mainsail/crypto-transaction";

import type { EvmCallOptions, TransferOptions } from "../factories/types.js";

import { registerTransactionFactory } from "../factories/factories/transaction.js";
import { FactoryBuilder } from "../factories/factory-builder.js";

export class Signer {
	#config: Contracts.Crypto.NetworkConfig;
	#nonce: bigint;
	#factoryBuilder: FactoryBuilder;
	#initialized = false;

	public constructor(config: Contracts.Crypto.NetworkConfig, nonce: string) {
		this.#config = config;

		this.#nonce = BigInt(nonce || 0);

		this.#factoryBuilder = new FactoryBuilder();
	}

	public async makeTransfer(options: TransferOptions): Promise<Contracts.Crypto.Transaction> {
		await this.#initialize();

		options = { ...options, nonce: this.#nonce.toString() };

		const states = ["sign"];

		const builder = await this.#factoryBuilder
			.get<TransactionBuilder>("Transfer")
			.withOptions(options)
			.withStates(...states)
			.make();

		this.#incrementNonce();
		return builder.build();
	}

	public async makeEvmCall(options: EvmCallOptions): Promise<Contracts.Crypto.Transaction> {
		await this.#initialize();

		options = { nonce: this.#nonce.toString(), ...options };

		const builder = await this.#factoryBuilder
			.get<TransactionBuilder>("EvmCall")
			.withOptions(options)
			.withStates("sign")
			.make();

		this.#incrementNonce();
		return builder.build();
	}

	#incrementNonce(): void {
		this.#nonce += 1n;
	}

	async #initialize() {
		if (!this.#initialized) {
			await registerTransactionFactory(this.#factoryBuilder, this.#config);
			this.#initialized = true;
		}
	}
}
