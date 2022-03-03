import { inject, injectable } from "@arkecosystem/core-container";
import { Identifiers, Kernel } from "@arkecosystem/core-contracts";

import { CacheEvent } from "../../../enums";
import { NotImplemented } from "../../../exceptions/runtime";

@injectable()
export class MemoryCacheStore<K, T> implements Kernel.CacheStore<K, T> {
	@inject(Identifiers.EventDispatcherService)
	private readonly eventDispatcher!: Kernel.EventDispatcher;

	private readonly store: Map<K, T> = new Map<K, T>();

	public async make(): Promise<Kernel.CacheStore<K, T>> {
		return this;
	}

	public async all(): Promise<Array<[K, T]>> {
		return [...this.store.entries()];
	}

	public async keys(): Promise<K[]> {
		return [...this.store.keys()];
	}

	public async values(): Promise<T[]> {
		return [...this.store.values()];
	}

	public async get(key: K): Promise<T | undefined> {
		const value: T | undefined = this.store.get(key);

		value
			? this.eventDispatcher.dispatch(CacheEvent.Hit, { key, value })
			: this.eventDispatcher.dispatch(CacheEvent.Missed, { key });

		return value;
	}

	public async getMany(keys: K[]): Promise<Array<T | undefined>> {
		return keys.map((key: K) => this.store.get(key));
	}

	public async put(key: K, value: T, seconds?: number): Promise<boolean> {
		this.store.set(key, value);

		this.eventDispatcher.dispatch(CacheEvent.Written, { key, seconds, value });

		return this.has(key);
	}

	public async putMany(values: Array<[K, T]>, seconds?: number): Promise<boolean[]> {
		return Promise.all(values.map(async (value: [K, T]) => this.put(value[0], value[1])));
	}

	public async has(key: K): Promise<boolean> {
		return this.store.has(key);
	}

	public async hasMany(keys: K[]): Promise<boolean[]> {
		return Promise.all(keys.map(async (key: K) => this.has(key)));
	}

	public async missing(key: K): Promise<boolean> {
		return !this.store.has(key);
	}

	public async missingMany(keys: K[]): Promise<boolean[]> {
		return Promise.all([...keys].map(async (key: K) => this.missing(key)));
	}

	public async forever(key: K, value: T): Promise<boolean> {
		throw new NotImplemented(this.constructor.name, "forever");
	}

	public async foreverMany(values: Array<[K, T]>): Promise<boolean[]> {
		throw new NotImplemented(this.constructor.name, "foreverMany");
	}

	public async forget(key: K): Promise<boolean> {
		this.store.delete(key);

		this.eventDispatcher.dispatch(CacheEvent.Forgotten, { key });

		return this.missing(key);
	}

	public async forgetMany(keys: K[]): Promise<boolean[]> {
		return Promise.all(keys.map(async (key: K) => this.forget(key)));
	}

	public async flush(): Promise<boolean> {
		this.store.clear();

		this.eventDispatcher.dispatch(CacheEvent.Flushed);

		return this.store.size === 0;
	}

	public async getPrefix(): Promise<string> {
		throw new NotImplemented(this.constructor.name, "getPrefix");
	}
}
