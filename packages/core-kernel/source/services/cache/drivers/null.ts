import { Kernel } from "@arkecosystem/core-contracts";

import { injectable } from "../../../ioc";

@injectable()
export class NullCacheStore<K, T> implements Kernel.CacheStore<K, T> {
	public async make(): Promise<Kernel.CacheStore<K, T>> {
		return this;
	}

	public async all(): Promise<Array<[K, T]>> {
		return [];
	}

	public async keys(): Promise<K[]> {
		return [];
	}

	public async values(): Promise<T[]> {
		return [];
	}

	public async get(key: K): Promise<T | undefined> {
		return undefined;
	}

	public async getMany(keys: K[]): Promise<Array<T | undefined>> {
		// @ts-ignore
		return new Array(keys.length).fill();
	}

	public async put(key: K, value: T, seconds?: number): Promise<boolean> {
		return false;
	}

	public async putMany(values: Array<[K, T]>, seconds?: number): Promise<boolean[]> {
		return new Array(values.length).fill(false);
	}

	public async has(key: K): Promise<boolean> {
		return false;
	}

	public async hasMany(keys: K[]): Promise<boolean[]> {
		return new Array(keys.length).fill(false);
	}

	public async missing(key: K): Promise<boolean> {
		return true;
	}

	public async missingMany(keys: K[]): Promise<boolean[]> {
		return new Array(keys.length).fill(true);
	}

	public async forever(key: K, value: T): Promise<boolean> {
		return false;
	}

	public async foreverMany(values: Array<[K, T]>): Promise<boolean[]> {
		return new Array(values.length).fill(false);
	}

	public async forget(key: K): Promise<boolean> {
		return false;
	}

	public async forgetMany(keys: K[]): Promise<boolean[]> {
		return new Array(keys.length).fill(false);
	}

	public async flush(): Promise<boolean> {
		return false;
	}

	public async getPrefix(): Promise<string> {
		return "";
	}
}
