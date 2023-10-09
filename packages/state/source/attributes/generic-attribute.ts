import { Contracts } from "@mainsail/contracts";

export abstract class GenericAttribute<T> implements Contracts.State.IAttribute<T> {
	protected value!: T;

	constructor(value: unknown) {
		this.set(value);
	}

	public get(): T {
		return this.value;
	}

	public set(value: unknown): void {
		if (this.check(value)) {
			this.value = value;
			return;
		}

		throw new Error(`Value ${value} is not valid for attribute [${this.constructor.name}].`);
	}

	public toJson(): Contracts.Types.JsonValue {
		return this.value;
	}

	public abstract clone(): Contracts.State.IAttribute<T>;

	public abstract check(value: unknown): value is T;
}
