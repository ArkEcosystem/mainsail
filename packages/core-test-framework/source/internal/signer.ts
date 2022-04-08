import { Contracts } from "@arkecosystem/core-contracts";
import { TransactionBuilder } from "@arkecosystem/core-crypto-transaction";
import { BigNumber } from "@arkecosystem/utils";

import { registerTransactionFactory } from "../factories/factories/transaction";
import { FactoryBuilder } from "../factories/factory-builder";
import {
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

	public async makeTransfer(options: TransferOptions): Promise<Contracts.Crypto.ITransactionData> {
		await this.#initialize();

		options = { ...options, nonce: this.#nonce.toFixed() };

		const states = ["sign"];

		if (options.vendorField) {
			states.unshift("vendorField");
		}

		const transferBuilder = await this.#factoryBuilder
			.get("Transfer")
			.withOptions(options)
			.withStates(...states)
			.make<TransactionBuilder<any>>();

		this.#incrementNonce();
		return transferBuilder.getStruct();
	}

	public async makeValidator(options: ValidatorRegistrationOptions): Promise<Contracts.Crypto.ITransactionData> {
		await this.#initialize();

		options = { ...options, nonce: this.#nonce.toFixed() };

		const transferBuilder = await this.#factoryBuilder
			.get("ValidatorRegistration")
			.withOptions(options)
			.withStates("sign")
			.make<TransactionBuilder<any>>();

		this.#incrementNonce();
		return transferBuilder.getStruct();
	}

	public async makeVote(options: VoteOptions): Promise<Contracts.Crypto.ITransactionData> {
		await this.#initialize();

		options = { ...options, nonce: this.#nonce.toFixed() };

		const transferBuilder = await this.#factoryBuilder
			.get("Vote")
			.withOptions(options)
			.withStates("sign")
			.make<TransactionBuilder<any>>();

		this.#incrementNonce();
		return transferBuilder.getStruct();
	}

	public async makeMultiSignatureRegistration(
		options: MultiSignatureOptions,
	): Promise<Contracts.Crypto.ITransactionData> {
		await this.#initialize();

		options = { ...options, nonce: this.#nonce.toFixed() };

		const transferBuilder = await this.#factoryBuilder
			.get("MultiSignature")
			.withOptions(options)
			.withStates("sign", "multiSign")
			.make<TransactionBuilder<any>>();

		this.#incrementNonce();
		return transferBuilder.getStruct();
	}

	public async makeMultipayment(options: MultiPaymentOptions): Promise<Contracts.Crypto.ITransactionData> {
		await this.#initialize();

		options = { ...options, nonce: this.#nonce.toFixed() };

		const transferBuilder = await this.#factoryBuilder
			.get("MultiPayment")
			.withOptions(options)
			.withStates("sign")
			.make<TransactionBuilder<any>>();

		this.#incrementNonce();
		return transferBuilder.getStruct();
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
