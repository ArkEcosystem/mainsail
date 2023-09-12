import { Contracts } from "@mainsail/contracts";
import { BigNumber } from "@mainsail/utils";

import { factory } from "../attributes";

export class Wallet implements Contracts.State.Wallet {
	protected readonly attributes = new Map<string, Contracts.State.IAttribute<any>>();
	#changed = false;

	public constructor(
		protected readonly address: string,
		protected readonly attributeRepository: Contracts.State.IAttributeRepository,
		protected readonly events?: Contracts.Kernel.EventDispatcher,
	) {
		this.setAttribute("nonce", BigNumber.ZERO);
	}

	public isChanged(): boolean {
		return this.#changed;
	}

	public getAddress(): string {
		return this.address;
	}

	public getPublicKey(): string | undefined {
		return this.getAttribute<string>("publicKey");
	}

	public setPublicKey(publicKey: string): void {
		this.setAttribute("publicKey", publicKey);
	}

	public getBalance(): BigNumber {
		return this.getAttribute("balance");
	}

	public setBalance(balance: BigNumber): void {
		this.setAttribute("balance", balance);
	}

	public getNonce(): BigNumber {
		return this.getAttribute<BigNumber>("nonce");
	}

	public setNonce(nonce: BigNumber): void {
		this.setAttribute("nonce", nonce);
	}

	public increaseBalance(balance: BigNumber): Contracts.State.Wallet {
		this.setBalance(this.getBalance().plus(balance));

		return this;
	}

	public decreaseBalance(balance: BigNumber): Contracts.State.Wallet {
		this.setBalance(this.getBalance().minus(balance));

		return this;
	}

	public increaseNonce(): void {
		this.setNonce(this.getNonce().plus(BigNumber.ONE));
	}

	public decreaseNonce(): void {
		this.setNonce(this.getNonce().minus(BigNumber.ONE));
	}

	public getAttributes(): Record<string, any> {
		const result = {};

		for (const [key, value] of this.attributes.entries()) {
			result[key] = value.get();
		}

		return result;
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
		return true;
		// const na = Symbol();
		// const previousValue = this.attributesOld.get(key, na);
		// const wasSet = this.attributesOld.forget(key);
		// this.#changed = true;
		// this.events?.dispatchSync(WalletEvent.PropertySet, {
		// 	key,
		// 	previousValue: previousValue === na ? undefined : previousValue,
		// 	publicKey: this.publicKey,
		// 	wallet: this,
		// });
		// return wasSet;
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
		return new Wallet(this.address, this.attributeRepository);
	}
}
