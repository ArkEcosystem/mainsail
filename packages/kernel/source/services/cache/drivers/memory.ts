import type { Contracts } from "@mainsail/contracts";

import { Events, Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";
import { NotImplemented } from "@mainsail/exceptions";

@injectable()
export class MemoryCacheStore<K, T> implements Contracts.Kernel.CacheStore<K, T> {
	@inject(Identifiers.Services.EventDispatcher.Service)
	private readonly eventDispatcher!: Contracts.Kernel.EventDispatcher;

	readonly #store: Map<K, T> = new Map<K, T>();

	public async make(): Promise<Contracts.Kernel.CacheStore<K, T>> {
		return this;
	}

	public async all(): Promise<Array<[K, T]>> {
		return [...this.#store.entries()];
	}

	public async keys(): Promise<K[]> {
		return [...this.#store.keys()];
	}

	public async values(): Promise<T[]> {
		return [...this.#store.values()];
	}

	public async get(key: K): Promise<T | undefined> {
		if (this.#store.has(key)) {
			const value = this.#store.get(key);

			this.#dispatch(Events.CacheEvent.Hit, { key, value });

			return value;
		}

		this.#dispatch(Events.CacheEvent.Missed, { key });

		return undefined;
	}

	public async getMany(keys: K[]): Promise<Array<T | undefined>> {
		return keys.map((key: K) => this.#store.get(key));
	}

	public async put(key: K, value: T, seconds?: number): Promise<boolean> {
		this.#store.set(key, value);

		this.#dispatch(Events.CacheEvent.Written, { key, seconds, value });

		return this.has(key);
	}

	public async putMany(values: Array<[K, T]>, seconds?: number): Promise<boolean[]> {
		return Promise.all(values.map(async (value: [K, T]) => this.put(value[0], value[1], seconds)));
	}

	public async has(key: K): Promise<boolean> {
		return this.#store.has(key);
	}

	public async hasMany(keys: K[]): Promise<boolean[]> {
		return Promise.all(keys.map(async (key: K) => this.has(key)));
	}

	public async missing(key: K): Promise<boolean> {
		return !this.#store.has(key);
	}

	public async missingMany(keys: K[]): Promise<boolean[]> {
		return Promise.all([...keys].map(async (key: K) => this.missing(key)));
	}

	public async forever(key: K, value: T): Promise<boolean> {
		throw new NotImplemented("forever", this.constructor.name);
	}

	public async foreverMany(values: Array<[K, T]>): Promise<boolean[]> {
		throw new NotImplemented("foreverMany", this.constructor.name);
	}

	public async forget(key: K): Promise<boolean> {
		this.#store.delete(key);

		this.#dispatch(Events.CacheEvent.Forgotten, { key });

		return this.missing(key);
	}

	public async forgetMany(keys: K[]): Promise<boolean[]> {
		return Promise.all(keys.map(async (key: K) => this.forget(key)));
	}

	public async flush(): Promise<boolean> {
		this.#store.clear();

		this.#dispatch(Events.CacheEvent.Flushed);

		return this.#store.size === 0;
	}

	public async getPrefix(): Promise<string> {
		throw new NotImplemented("getPrefix", this.constructor.name);
	}

	// Cache events are fire-and-forget; swallow rejections so a failing
	// listener can never surface as an unhandled promise rejection.
	#dispatch<D>(event: string, data?: D): void {
		void this.eventDispatcher.dispatch(event, data).catch(() => {});
	}
}
