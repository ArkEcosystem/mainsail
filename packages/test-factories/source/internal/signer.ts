import type { Contracts } from "@mainsail/contracts";
import { type TransactionBuilder } from "@mainsail/crypto-transaction";
import { BigNumber } from "@mainsail/utils";

import { registerTransactionFactory } from "../factories/factories/transaction.js";
import { FactoryBuilder } from "../factories/factory-builder.js";
import type { EvmCallOptions, TransferOptions } from "../factories/types.js";

export class Signer {
	#config: Contracts.Crypto.NetworkConfig;
	#nonce: BigNumber;
	#factoryBuilder: FactoryBuilder;
	#initialized = false;

	public constructor(config: Contracts.Crypto.NetworkConfig, nonce: string) {
		this.#config = config;

		this.#nonce = BigNumber.make(nonce || 0);

		this.#factoryBuilder = new FactoryBuilder();
	}

	public async makeTransfer(options: TransferOptions): Promise<Contracts.Crypto.Transaction> {
		await this.#initialize();

		options = { ...options, nonce: this.#nonce.toFixed() };

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

		options = { nonce: this.#nonce.toFixed(), ...options };

		const builder = await this.#factoryBuilder
			.get<TransactionBuilder>("EvmCall")
			.withOptions(options)
			.withStates("sign")
			.make();

		this.#incrementNonce();
		return builder.build();
	}

	#incrementNonce(): void {
		this.#nonce = this.#nonce.plus(1);
	}

	async #initialize() {
		if (!this.#initialized) {
			await registerTransactionFactory(this.#factoryBuilder, this.#config);
			this.#initialized = true;
		}
	}
}
