import { Contracts } from "@mainsail/contracts";
import { TransactionBuilder } from "@mainsail/crypto-transaction";
import { BigNumber } from "@mainsail/utils";

import { registerTransactionFactory } from "../factories/factories/transaction";
import { FactoryBuilder } from "../factories/factory-builder";
import {
	EvmCallOptions,
	MultiPaymentOptions,
	MultiSignatureOptions,
	TransferOptions,
	ValidatorRegistrationOptions,
	VoteOptions,
} from "../factories/types";

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

		if (options.vendorField) {
			states.unshift("vendorField");
		}

		const builder = await this.#factoryBuilder
			.get("Transfer")
			.withOptions(options)
			.withStates(...states)
			.make<TransactionBuilder<any>>();

		this.#incrementNonce();
		return builder.build();
	}

	public async makeValidator(options: ValidatorRegistrationOptions): Promise<Contracts.Crypto.Transaction> {
		await this.#initialize();

		options = { ...options, nonce: this.#nonce.toFixed() };

		const builder = await this.#factoryBuilder
			.get("ValidatorRegistration")
			.withOptions(options)
			.withStates("sign")
			.make<TransactionBuilder<any>>();

		this.#incrementNonce();
		return await builder.build();
	}

	public async makeVote(options: VoteOptions): Promise<Contracts.Crypto.Transaction> {
		await this.#initialize();

		options = { ...options, nonce: this.#nonce.toFixed() };

		const builder = await this.#factoryBuilder
			.get("Vote")
			.withOptions(options)
			.withStates("sign")
			.make<TransactionBuilder<any>>();

		this.#incrementNonce();
		return builder.build();
	}

	public async makeMultiSignatureRegistration(options: MultiSignatureOptions): Promise<Contracts.Crypto.Transaction> {
		await this.#initialize();

		options = { ...options, nonce: this.#nonce.toFixed() };

		const builder = await this.#factoryBuilder
			.get("MultiSignature")
			.withOptions(options)
			.withStates("sign", "multiSign")
			.make<TransactionBuilder<any>>();

		this.#incrementNonce();
		return builder.build();
	}

	public async makeMultipayment(options: MultiPaymentOptions): Promise<Contracts.Crypto.Transaction> {
		await this.#initialize();

		options = { ...options, nonce: this.#nonce.toFixed() };

		const builder = await this.#factoryBuilder
			.get("MultiPayment")
			.withOptions(options)
			.withStates("sign")
			.make<TransactionBuilder<any>>();

		this.#incrementNonce();
		return builder.build();
	}

	public async makeEvmCall(options: EvmCallOptions): Promise<Contracts.Crypto.Transaction> {
		await this.#initialize();

		options = { nonce: this.#nonce.toFixed(), ...options };

		const builder = await this.#factoryBuilder
			.get("EvmCall")
			.withOptions(options)
			.withStates("sign")
			.make<TransactionBuilder<any>>();

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
