import { Contracts } from "@mainsail/contracts";

export abstract class GenericAttribute<T extends {}> implements Contracts.State.Attribute<T> {
	protected value!: T;

	constructor(value: unknown) {
		if (value !== undefined) {
			this.set(value);
		}
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

	public fromJson(value: Contracts.Types.JsonValue): Contracts.State.Attribute<T> {
		this.check(value);
		this.set(value);

		return this;
	}

	public abstract clone(): Contracts.State.Attribute<T>;

	public abstract check(value: unknown): value is T;
}
