import { injectable } from "@arkecosystem/core-container";
import { strictEqual } from "assert";

@injectable()
export class AttributeSet {
	readonly #attributes: Set<string> = new Set<string>();

	public all(): string[] {
		return [...this.#attributes];
	}

	public set(attribute: string): boolean {
		strictEqual(this.#attributes.has(attribute), false, `Duplicated attribute: ${attribute}`);

		this.#attributes.add(attribute);

		return this.has(attribute);
	}

	public forget(attribute: string): boolean {
		strictEqual(this.#attributes.has(attribute), true, `Unknown attribute: ${attribute}`);

		this.#attributes.delete(attribute);

		return !this.has(attribute);
	}

	public flush(): boolean {
		this.#attributes.clear();

		return this.#attributes.size === 0;
	}

	public has(attribute: string): boolean {
		return this.#attributes.has(attribute);
	}
}
