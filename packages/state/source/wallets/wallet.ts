import { Contracts } from "@mainsail/contracts";
import { Utils } from "@mainsail/kernel";
import { BigNumber } from "@mainsail/utils";

import { factory, jsonFactory } from "../attributes";

export class Wallet implements Contracts.State.Wallet {
	protected readonly attributes = new Map<string, Contracts.State.IAttribute<unknown>>();
	#setAttributes = new Set<string>();
	#forgetAttributes = new Set<string>();

	public constructor(
		protected readonly address: string,
		protected readonly attributeRepository: Contracts.State.IAttributeRepository,
		protected walletRepository: Contracts.State.WalletRepository,
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

		for (const name of this.attributeRepository.getAttributeNames()) {
			if (this.hasAttribute(name)) {
				result[name] = this.getAttribute(name);
			}
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
			return this.getAttributeHolder<T>(key).get();
		}

		if (defaultValue !== undefined) {
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
		this.walletRepository.setDirtyWallet(this);

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
		this.walletRepository.setDirtyWallet(this);

		return !!attribute;
	}

	public isValidator(): boolean {
		return this.hasAttribute("validatorPublicKey");
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

	public commitChanges(walletRepository: Contracts.State.WalletRepository): void {
		if (this.originalWallet) {
			for (const attributeName of this.#forgetAttributes) {
				this.originalWallet.forgetAttribute(attributeName);
			}

			for (const attributeName of this.#setAttributes) {
				this.originalWallet.setAttribute(attributeName, this.attributes.get(attributeName)!.get());
			}
		} else {
			this.walletRepository = walletRepository;
		}
	}

	public toJson(): Contracts.Types.JsonObject {
		const result = {
			address: this.address,
		};

		for (const name of this.attributeRepository.getAttributeNames()) {
			if (this.hasAttribute(name)) {
				result[name] = this.getAttributeHolder(name).toJson();
			}
		}

		return result;
	}

	public fromJson(json: Contracts.Types.JsonObject): Wallet {
		this.attributes.clear();
		this.#setAttributes.clear();

		for (const [key, value] of Object.entries(json)) {
			if (key === "address") {
				continue;
			}

			Utils.assert.defined<Contracts.Types.JsonValue>(value);
			const attribute = jsonFactory(this.attributeRepository.getAttributeType(key), value);
			this.attributes.set(key, attribute);
		}

		if (!this.attributes.has("balance")) {
			throw new Error(`Attribute "balance" is not set for wallet: ${this.address}`);
		}

		if (!this.attributes.has("nonce")) {
			throw new Error(`Attribute "nonce" is not set for wallet: ${this.address}`);
		}

		return this;
	}

	protected getAttributeHolder<T>(key: string): Contracts.State.IAttribute<T> {
		const attribute = this.attributes.get(key) as Contracts.State.IAttribute<T>;

		if (attribute) {
			return attribute;
		}

		Utils.assert.defined<Wallet>(this.originalWallet);
		return this.originalWallet?.getAttributeHolder<T>(key);
	}

	#checkAttributeName(name: string): void {
		if (!this.attributeRepository.has(name)) {
			throw new Error(`Attribute name "${name}" is not registered.`);
		}
	}
}
