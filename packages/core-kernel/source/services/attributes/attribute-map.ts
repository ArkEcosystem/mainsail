import { get, has, set, unset, cloneDeep } from "@arkecosystem/utils";
import { strictEqual } from "assert";

import { assert } from "../../utils";
import { AttributeSet } from "./attribute-set";

export class AttributeMap {
	#attributes: object = {};

	public constructor(private readonly knownAttributes: AttributeSet) {}

	public all(): object {
		return this.#attributes;
	}

	public get<T>(key: string, defaultValue?: T): T {
		this.#assertKnown(key);

		const value: T | undefined = get(this.#attributes, key) ?? defaultValue;

		assert.defined<T>(value);

		return value;
	}

	public set<T>(key: string, value: T): boolean {
		this.#assertKnown(key);

		set(this.#attributes, key, value);

		return this.has(key);
	}

	public forget(key: string): boolean {
		this.#assertKnown(key);

		unset(this.#attributes, key);

		return !this.has(key);
	}

	public flush(): boolean {
		this.#attributes = {};

		return Object.keys(this.#attributes).length === 0;
	}

	public has(key: string): boolean {
		this.#assertKnown(key);

		return has(this.#attributes, key);
	}

	public clone(): AttributeMap {
		const cloned = new AttributeMap(this.knownAttributes);
		cloned.#attributes = cloneDeep(this.#attributes);
		return cloned;
	}

	#assertKnown(key: string): void {
		strictEqual(this.knownAttributes.has(key), true, `Unknown attribute: ${key}`);
	}
}
