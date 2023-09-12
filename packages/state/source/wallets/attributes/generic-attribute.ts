export class GenericAttribute<T> {
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

	public clone(): GenericAttribute<T> {
		return new GenericAttribute(this.#value);
	}
}
