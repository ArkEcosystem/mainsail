export class StringAttribute {
	#changed = false;
	#value: string;

	constructor(value: string) {
		this.#value = value;
	}

	public isChanged(): boolean {
		return this.#changed;
	}

	public get(): string {
		return this.#value;
	}

	public set(value: string): void {
		this.#value = value;
		this.#changed = true;
	}

	public clone(): StringAttribute {
		return new StringAttribute(this.#value);
	}
}
