import { injectable } from "@mainsail/container";
import { Contracts } from "@mainsail/core-contracts";
import { get, has, set, unset } from "@mainsail/utils";

import { JsonObject, KeyValuePair } from "../../types";
import { assert } from "../../utils";

@injectable()
export class ConfigRepository implements Contracts.Kernel.Repository {
	#items: JsonObject = {};

	public all(): JsonObject {
		return this.#items;
	}

	public get<T>(key: string, defaultValue?: T): T {
		const value: T | undefined = get(this.#items, key, defaultValue);

		assert.defined<string>(value);

		return value;
	}

	public set<T>(key: string, value: T): boolean {
		set(this.#items, key, value);

		return this.has(key);
	}

	public unset(key: string): boolean {
		unset(this.#items, key);

		return this.has(key);
	}

	public has(key: string): boolean {
		return has(this.#items, key);
	}

	public hasAll(keys: string[]): boolean {
		for (const key of keys) {
			if (!has(this.#items, key)) {
				return false;
			}
		}

		return true;
	}

	public merge(items: KeyValuePair): void {
		this.#items = { ...this.#items, ...items };
	}
}
