import { get } from "./get.js";
import { has } from "./has.js";
import { sample } from "./sample.js";
import { set } from "./set.js";
import { stringify } from "./stringify.js";
import { unset } from "./unset.js";

export class Collection<T> {
	#collection: Record<string, T> = {};

	public all(): Record<string, T> {
		return this.#collection;
	}

	public entries(): Array<[string, T]> {
		return Object.entries(this.#collection);
	}

	public keys(): string[] {
		return Object.keys(this.#collection);
	}

	public values(): T[] {
		return Object.values(this.#collection);
	}

	public pull(key: string): T | undefined {
		const item = get<Record<string, T>, T>(this.#collection, key);

		this.forget(key);

		return item;
	}

	public get(key: string): T | undefined {
		return get<Record<string, T>, T>(this.#collection, key);
	}

	public set(key: string, value: T): void {
		set(this.#collection, key, value);
	}

	public forget(key: string): void {
		unset(this.#collection, key);
	}

	public flush(): void {
		this.#collection = {};
	}

	public has(key: string): boolean {
		return has(this.#collection, key);
	}

	public missing(key: string): boolean {
		return !this.has(key);
	}

	public count(): number {
		return Object.keys(this.#collection).length;
	}

	public isEmpty(): boolean {
		return this.count() <= 0;
	}

	public isNotEmpty(): boolean {
		return !this.isEmpty();
	}

	public random(): T {
		return sample(this.values());
	}

	public toJson(): string | undefined {
		const collection: Record<string, T> = {};

		for (const [key, value] of this.entries()) {
			collection[key] = value;
		}

		return stringify(collection);
	}
}
