import { Contracts } from "@mainsail/contracts";

export abstract class GenericAttribute<T> implements Contracts.State.IAttribute<T> {
	protected value!: T;

	constructor(value: T) {
		this.set(value);
	}

	public get(): T {
		return this.value;
	}

	public set(value: T): void {
		if (this.check(value)) {
			this.value = value;
			return;
		}

		throw new Error(`Value [${value}] is not valid for attribute [${this.constructor.name}].`);
	}

	public abstract clone(): Contracts.State.IAttribute<T>;

	public abstract check(value: unknown): value is T;
}
