import { Contracts } from "@mainsail/contracts";

export abstract class GenericAttribute<T> implements Contracts.State.IAttribute<T> {
	protected value: T;

	constructor(value: T) {
		this.value = value;
	}

	public get(): T {
		return this.value;
	}

	public set(value: T): void {
		this.value = value;
	}

	public abstract clone(): Contracts.State.IAttribute<T>;

	// public abstract check(value: unknown): value is T;
}
