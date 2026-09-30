import type { Contracts } from "@mainsail/contracts";

import { injectable } from "@mainsail/container";
import { assert, get, has, set, unset } from "@mainsail/utils";

@injectable()
export class ConfigRepository implements Contracts.Kernel.Repository {
	#items: Contracts.Types.JsonObject = {};

	public all(): Contracts.Types.JsonObject {
		return this.#items;
	}

	public get<T>(key: string, defaultValue?: T): T {
		const value: T | undefined = get(this.#items, key, defaultValue);

		assert.defined(value);

		return value;
	}

	public set<T>(key: string, value: T): boolean {
		set(this.#items, key, value);

		return this.has(key);
	}

	// Returns true if the key existed and was removed, false if it did not exist.
	public unset(key: string): boolean {
		const exists: boolean = this.has(key);

		unset(this.#items, key);

		return exists;
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

	public merge(items: Contracts.Types.JsonObject): void {
		this.#items = { ...this.#items, ...items };
	}
}
