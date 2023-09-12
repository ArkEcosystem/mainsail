import { Contracts } from "@mainsail/contracts";

export class GenericAttribute<T> implements Contracts.State.IAttribute<T> {
	#changed = false;
	#value: T;

	constructor(value: T) {
		this.#value = value;
	}

	public isChanged(): boolean {
		return this.#changed;
	}

	public get(): T {
		return this.#value;
	}

	public set(value: T): void {
		this.#value = value;
		this.#changed = true;
	}

	public clone(): Contracts.State.IAttribute<T> {
		return new GenericAttribute(this.#value);
	}
}
