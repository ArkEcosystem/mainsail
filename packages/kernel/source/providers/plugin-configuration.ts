import type { Contracts } from "@mainsail/contracts";

import { injectable } from "@mainsail/container";
import { ensureError, get, has, set, unset } from "@mainsail/utils";
import deepmerge from "deepmerge";

@injectable()
export class PluginConfiguration implements Contracts.Kernel.PluginConfiguration {
	#items: Contracts.Types.JsonObject = {};

	public from(name: string, config: Contracts.Types.JsonObject): this {
		this.#items = deepmerge({}, config);

		return this;
	}

	public async discover(name: string, packageId: string): Promise<this> {
		try {
			// Clone so we never mutate the cached module export via later set()/unset()/merge() calls.
			this.#items = deepmerge({}, (await import(`${packageId}/distribution/defaults.js`)).defaults ?? {});
		} catch (rawError) {
			const error = ensureError(rawError);

			// A missing defaults file can be intentional; anything else (e.g. a broken module) is a real error.
			if ((error as NodeJS.ErrnoException).code !== "ERR_MODULE_NOT_FOUND") {
				throw error;
			}
		}

		return this;
	}

	public merge(values: Contracts.Types.JsonObject | undefined): this {
		if (values) {
			this.#items = deepmerge(this.#items, values, {
				arrayMerge: (destination, source) => source,
			});
		}

		return this;
	}

	public all(): Contracts.Types.JsonObject {
		return this.#items;
	}

	public getRequired<T>(key: string): T {
		const item: T | undefined = get(this.#items, key);

		if (item === undefined) {
			throw new Error(`Missing required ${key} configuration value`);
		}

		return item;
	}

	public getOptional<T>(key: string, defaultValue: T): T {
		const item: T | undefined = get(this.#items, key);

		if (item === undefined) {
			return defaultValue;
		}

		return item;
	}

	public set<T>(key: string, value: T): boolean {
		set(this.#items, key, value);

		return this.has(key);
	}

	public unset<T>(key: string): boolean {
		unset(this.#items, key);

		return this.has(key);
	}

	public has(key: string): boolean {
		return has(this.#items, key);
	}
}
