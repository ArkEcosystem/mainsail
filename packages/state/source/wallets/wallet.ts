import { Contracts } from "@mainsail/contracts";
import { Utils } from "@mainsail/kernel";
import { BigNumber } from "@mainsail/utils";

import { factory } from "../attributes";

export class Wallet implements Contracts.State.Wallet {
	protected readonly attributes = new Map<string, Contracts.State.IAttribute<unknown>>();
	#setAttributes = new Set<string>();
	#forgetAttributes = new Set<string>();

	public constructor(
		protected readonly address: string,
		protected readonly attributeRepository: Contracts.State.IAttributeRepository,
		protected readonly walletRepository: Contracts.State.WalletRepository,
		protected readonly originalWallet?: Wallet,
	) {
		if (!originalWallet) {
			this.setAttribute("nonce", BigNumber.ZERO);
			this.setAttribute("balance", BigNumber.ZERO);
			this.#setAttributes.clear();
		}
	}

	public isChanged(): boolean {
		return this.#setAttributes.size > 0 || this.#forgetAttributes.size > 0;
	}

	public getAddress(): string {
		return this.address;
	}

	public getPublicKey(): string | undefined {
		if (!this.hasAttribute("publicKey")) {
			return undefined;
		}

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

	public hasAttribute(key: string): boolean {
		if (this.attributes.has(key)) {
			return true;
		}

		if (this.originalWallet?.hasAttribute(key) && !this.#forgetAttributes.has(key)) {
			return true;
		}
		return false;
	}

	public getAttribute<T>(key: string, defaultValue?: T): T {
		if (this.hasAttribute(key)) {
			const attribute = this.attributes.get(key);

			if (attribute) {
				return attribute.get() as T;
			}

			Utils.assert.defined<Wallet>(this.originalWallet);
			return this.originalWallet.getAttribute<T>(key);
		}

		if (defaultValue) {
			return defaultValue;
		}

		throw new Error(`Attribute "${key}" is not set.`);
	}

	public setAttribute<T>(key: string, value: T): boolean {
		let attribute = this.attributes.get(key);
		const wasSet = this.hasAttribute(key);

		if (!attribute) {
			attribute = factory(this.attributeRepository.getAttributeType(key), value);
			this.attributes.set(key, attribute);
		} else {
			attribute.set(value);
		}

		this.#setAttributes.add(key);
		this.#forgetAttributes.delete(key);

		return wasSet;
	}

	public forgetAttribute(key: string): boolean {
		if (!this.hasAttribute(key)) {
			return false;
		}

		const attribute = this.attributes.get(key);

		if (!attribute) {
			this.#checkAttributeName(key);
		}

		this.attributes.delete(key);
		this.#setAttributes.delete(key);
		this.#forgetAttributes.add(key);

		return !!attribute;
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

	public clone(walletRepository: Contracts.State.WalletRepository): Contracts.State.Wallet {
		return new Wallet(this.address, this.attributeRepository, walletRepository, this);
	}

	public isClone(): boolean {
		return !!this.originalWallet;
	}

	public getOriginal(): Contracts.State.Wallet {
		if (this.originalWallet) {
			return this.originalWallet;
		}

		throw new Error("This is not a clone wallet");
	}

	public commitChanges(): void {
		if (this.originalWallet) {
			for (const attributeName of this.#forgetAttributes) {
				this.originalWallet.forgetAttribute(attributeName);
			}

			for (const attributeName of this.#setAttributes) {
				this.originalWallet.setAttribute(attributeName, this.attributes.get(attributeName)!.get());
			}
		}
	}

	#checkAttributeName(name: string): void {
		if (!this.attributeRepository.has(name)) {
			throw new Error(`Attribute name "${name}" is not registered.`);
		}
	}
}
