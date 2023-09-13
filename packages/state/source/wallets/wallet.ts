import { Contracts } from "@mainsail/contracts";
import { BigNumber } from "@mainsail/utils";

import { factory } from "../attributes";
import { WalletEvent } from "./wallet-event";

export class Wallet implements Contracts.State.Wallet {
	protected readonly attributes = new Map<string, Contracts.State.IAttribute<unknown>>();
	#changedAttributes = new Set<string>();

	public constructor(
		protected readonly address: string,
		protected readonly attributeRepository: Contracts.State.IAttributeRepository,
		protected readonly events?: Contracts.Kernel.EventDispatcher,
	) {
		this.setAttribute("nonce", BigNumber.ZERO);
		this.setAttribute("balance", BigNumber.ZERO);
	}

	public isChanged(): boolean {
		return this.#changedAttributes.size > 0;
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

	public getAttribute<T>(key: string, defaultValue?: T): T {
		const attribute = this.attributes.get(key);

		if (attribute) {
			return attribute.get() as T;
		}

		this.#checkAttributeName(key);

		if (defaultValue !== undefined) {
			return defaultValue;
		}

		throw new Error(`Attribute "${key}" is not set.`);
	}

	public setAttribute<T>(key: string, value: T): boolean {
		let attribute = this.attributes.get(key);
		const wasSet = !!attribute;
		const previousValue = attribute ? attribute.get() : undefined;

		if (!attribute) {
			attribute = factory(this.attributeRepository.getAttributeType(key), value);
			this.attributes.set(key, attribute);
		} else {
			attribute.set(value);
		}
		this.#changedAttributes.add(key);

		this.events?.dispatchSync(WalletEvent.PropertySet, {
			key: key,
			previousValue,
			publicKey: this.getPublicKey(),
			value,

			wallet: this,
		});

		return wasSet;
	}

	public forgetAttribute(key: string): boolean {
		const attribute = this.attributes.get(key);
		const previousValue = attribute ? attribute.get() : undefined;

		if (!attribute) {
			this.#checkAttributeName(key);
		}

		this.attributes.delete(key);
		this.#changedAttributes.add(key);

		this.events?.dispatchSync(WalletEvent.PropertySet, {
			key,
			previousValue: previousValue,
			publicKey: this.getPublicKey(),
			wallet: this,
		});

		return !!attribute;
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
		const clone = new Wallet(this.address, this.attributeRepository);

		for (const [key, value] of this.attributes.entries()) {
			clone.attributes.set(key, value.clone());
		}

		return clone;
	}

	#checkAttributeName(name: string): void {
		if (!this.attributeRepository.has(name)) {
			throw new Error(`Attribute name "${name}" is not registered.`);
		}
	}
}
