// A Set that is capped in size and acts like a FIFO.
export class CappedSet<T> {
	readonly #data: Set<T> = new Set<T>();
	#maxSize: number;

	public constructor(maxSize = 16_384) {
		this.#maxSize = maxSize;
	}

	public add(newElement: T): void {
		if (this.#data.size >= this.#maxSize) {
			const oldest: T = this.#data.values().next().value;

			this.#data.delete(oldest);
		}

		this.#data.add(newElement);
	}

	public has(element: T): boolean {
		return this.#data.has(element);
	}
}
