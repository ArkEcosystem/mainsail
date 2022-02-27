import { Contracts, Services } from "@arkecosystem/core-kernel";
import { BigNumber } from "@arkecosystem/utils";

import { WalletEvent } from "./wallet-event";

export class Wallet implements Contracts.State.Wallet {
	protected publicKey: string | undefined;
	protected balance: BigNumber = BigNumber.ZERO;
	protected nonce: BigNumber = BigNumber.ZERO;

	public constructor(
		protected readonly address: string,
		protected readonly attributes: Services.Attributes.AttributeMap,
		protected readonly events?: Contracts.Kernel.EventDispatcher,
	) {}

	public getAddress(): string {
		return this.address;
	}

	public getPublicKey(): string | undefined {
		return this.publicKey;
	}

	public setPublicKey(publicKey: string): void {
		const previousValue = this.publicKey;

		this.publicKey = publicKey;

		this.events?.dispatchSync(WalletEvent.PropertySet, {
			key: "publicKey",
			previousValue,
			publicKey: this.publicKey,
			value: publicKey,
			wallet: this,
		});
	}

	public getBalance(): BigNumber {
		return this.balance;
	}

	public setBalance(balance: BigNumber): void {
		const previousValue = this.balance;

		this.balance = balance;

		this.events?.dispatchSync(WalletEvent.PropertySet, {
			key: "balance",
			previousValue,
			publicKey: this.publicKey,
			value: balance,
			wallet: this,
		});
	}

	public getNonce(): BigNumber {
		return this.nonce;
	}

	public setNonce(nonce: BigNumber): void {
		const previousValue = this.nonce;

		this.nonce = nonce;

		this.events?.dispatchSync(WalletEvent.PropertySet, {
			key: "nonce",
			previousValue,
			publicKey: this.publicKey,
			value: nonce,
			wallet: this,
		});
	}

	public increaseBalance(balance: BigNumber): Contracts.State.Wallet {
		this.setBalance(this.balance.plus(balance));

		return this;
	}

	public decreaseBalance(balance: BigNumber): Contracts.State.Wallet {
		this.setBalance(this.balance.minus(balance));

		return this;
	}

	public increaseNonce(): void {
		this.setNonce(this.nonce.plus(BigNumber.ONE));
	}

	public decreaseNonce(): void {
		this.setNonce(this.nonce.minus(BigNumber.ONE));
	}

	public getData(): Contracts.State.WalletData {
		return {
			address: this.address,
			attributes: this.attributes,
			balance: this.balance,
			nonce: this.nonce,
			publicKey: this.publicKey,
		};
	}

	public getAttributes(): Record<string, any> {
		return this.attributes.all();
	}

	public getAttribute<T>(key: string, defaultValue?: T): T {
		return this.attributes.get<T>(key, defaultValue);
	}

	public setAttribute<T = any>(key: string, value: T): boolean {
		const wasSet = this.attributes.set<T>(key, value);

		this.events?.dispatchSync(WalletEvent.PropertySet, {
			key: key,
			publicKey: this.publicKey,
			value,
			wallet: this,
		});

		return wasSet;
	}

	public forgetAttribute(key: string): boolean {
		const na = Symbol();
		const previousValue = this.attributes.get(key, na);
		const wasSet = this.attributes.forget(key);

		this.events?.dispatchSync(WalletEvent.PropertySet, {
			key,
			previousValue: previousValue === na ? undefined : previousValue,
			publicKey: this.publicKey,
			wallet: this,
		});

		return wasSet;
	}

	public hasAttribute(key: string): boolean {
		return this.attributes.has(key);
	}

	public isDelegate(): boolean {
		return this.hasAttribute("delegate");
	}

	public hasVoted(): boolean {
		return this.hasAttribute("vote");
	}

	public hasMultiSignature(): boolean {
		return this.hasAttribute("multiSignature");
	}

	public clone(): Contracts.State.Wallet {
		const cloned = new Wallet(this.address, this.attributes.clone());
		cloned.publicKey = this.publicKey;
		cloned.balance = this.balance;
		cloned.nonce = this.nonce;
		return cloned;
	}
}
