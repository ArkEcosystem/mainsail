export class CappedMap<K, V> {
	protected store: Map<K, V> = new Map<K, V>();
	#maxSize: number;

	public constructor(maxSize: number) {
		this.#maxSize = maxSize;
	}

	public get(key: K): V | undefined {
		return this.store.get(key);
	}

	public set(key: K, value: V): void {
		if (this.store.size >= this.#maxSize) {
			this.store.delete([...this.store][0][0]);
		}

		this.store = this.store.set(key, value);
	}

	public has(key: K): boolean {
		return this.store.has(key);
	}

	public delete(key: K): boolean {
		if (!this.store.has(key)) {
			return false;
		}

		this.store.delete(key);

		return !this.store.has(key);
	}

	public clear(): void {
		this.store.clear();
	}

	public resize(maxSize: number): void {
		this.#maxSize = maxSize;

		if (this.store.size > this.#maxSize) {
			this.store = new Map<K, V>([...this.store].slice(-Math.max(0, this.#maxSize)));
		}
	}

	public first(): V {
		return [...this.store][0][1];
	}

	public last(): V {
		return [...this.store][this.store.size - 1][1];
	}

	public keys(): K[] {
		return [...this.store.keys()];
	}

	public values(): V[] {
		return [...this.store.values()];
	}

	public count(): number {
		return this.store.size;
	}
}
