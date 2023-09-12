import { Contracts } from "@mainsail/contracts";
import { Services } from "@mainsail/kernel";
import { BigNumber } from "@mainsail/utils";

import { BigNumberAttribute, factory, GenericAttribute } from "../attributes";
import { WalletEvent } from "./wallet-event";

export class Wallet implements Contracts.State.Wallet {
	protected publicKey: Contracts.State.IAttribute<string> | undefined = undefined;
	protected balance = new BigNumberAttribute(BigNumber.ZERO);
	protected nonce = new BigNumberAttribute(BigNumber.ZERO);
	protected readonly attributesOld: Services.Attributes.AttributeMap = new Services.Attributes.AttributeMap(
		new Services.Attributes.AttributeSet(),
	);

	protected readonly attributes = new Map<string, Contracts.State.IAttribute<any>>();

	#changed = false;

	public constructor(
		protected readonly address: string,
		protected readonly attributeRepository: Contracts.State.IAttributeRepository,
		protected readonly events?: Contracts.Kernel.EventDispatcher,
	) {}

	public isChanged(): boolean {
		return this.#changed;
	}

	public getAddress(): string {
		return this.address;
	}

	public getPublicKey(): string | undefined {
		return this.publicKey ? this.publicKey.get() : undefined;
	}

	public setPublicKey(publicKey: string): void {
		if (!this.publicKey) {
			this.publicKey = new GenericAttribute<string>("");
		}

		this.publicKey.set(publicKey);
		this.#changed = true;

		this.events?.dispatchSync(WalletEvent.PropertySet, {
			key: "publicKey",
			previousValue: undefined,
			publicKey: this.publicKey,
			value: publicKey,
			wallet: this,
		});
	}

	public getBalance(): BigNumber {
		return this.balance.get();
	}

	public setBalance(balance: BigNumber): void {
		const previousValue = this.balance.get();

		this.balance.set(balance);
		this.#changed = true;

		this.events?.dispatchSync(WalletEvent.PropertySet, {
			key: "balance",
			previousValue,
			publicKey: this.publicKey,
			value: balance,
			wallet: this,
		});
	}

	public getNonce(): BigNumber {
		return this.nonce.get();
	}

	public setNonce(nonce: BigNumber): void {
		const previousValue = this.nonce.get();

		this.nonce.set(nonce);
		this.#changed = true;

		this.events?.dispatchSync(WalletEvent.PropertySet, {
			key: "nonce",
			previousValue,
			publicKey: this.publicKey,
			value: nonce,
			wallet: this,
		});
	}

	public increaseBalance(balance: BigNumber): Contracts.State.Wallet {
		this.setBalance(this.balance.get().plus(balance));

		return this;
	}

	public decreaseBalance(balance: BigNumber): Contracts.State.Wallet {
		this.setBalance(this.balance.get().minus(balance));

		return this;
	}

	public increaseNonce(): void {
		this.setNonce(this.nonce.get().plus(BigNumber.ONE));
	}

	public decreaseNonce(): void {
		this.setNonce(this.nonce.get().minus(BigNumber.ONE));
	}

	public getData(): Contracts.State.WalletData {
		return {
			address: this.address,
			attributes: this.attributesOld,
			balance: this.balance.get(),
			nonce: this.nonce.get(),
			publicKey: this.publicKey?.get(),
		};
	}

	public getAttributes(): Record<string, any> {
		return this.attributesOld.all();
	}

	public getAttribute<T>(key: string, defaultValue?: T): T {
		// return this.attributesOld.get<T>(key, defaultValue);

		const attribute = this.attributes.get(key);

		if (attribute) {
			return attribute.get();
		}

		// Check if attribute name is valid

		if (defaultValue !== undefined) {
			return defaultValue;
		}

		throw new Error(`Attribute "${key}" does not exist.`);
	}

	public setAttribute<T = any>(key: string, value: T): boolean {
		let attribute = this.attributes.get(key);

		if (!attribute) {
			// TODO: Check if attribute name is valid

			attribute = factory(key, value);
			this.attributes.set(key, attribute);
		}

		attribute.set(value);
		return true;

		// const wasSet = this.attributesOld.set<T>(key, value);
		// this.#changed = true;

		// this.events?.dispatchSync(WalletEvent.PropertySet, {
		// 	key: key,
		// 	publicKey: this.publicKey,
		// 	value,
		// 	wallet: this,
		// });

		// return wasSet;
	}

	public forgetAttribute(key: string): boolean {
		const na = Symbol();
		const previousValue = this.attributesOld.get(key, na);
		const wasSet = this.attributesOld.forget(key);
		this.#changed = true;

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

	public isValidator(): boolean {
		return this.hasAttribute("validatorUsername");
	}

	public hasVoted(): boolean {
		return this.hasAttribute("vote");
	}

	public hasMultiSignature(): boolean {
		return this.hasAttribute("multiSignature");
	}

	public clone(): Wallet {
		const cloned = new Wallet(this.address, this.attributeRepository);
		cloned.publicKey = this.publicKey?.clone();
		cloned.balance = this.balance.clone();
		cloned.nonce = this.nonce.clone();
		return cloned;
	}
}
