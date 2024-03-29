import { Contracts } from "@mainsail/contracts";

export class Lock implements Contracts.Kernel.Lock {
	#exclusivePromise?: Promise<unknown>;

	readonly #nonExclusivePromises: Set<Promise<unknown>> = new Set<Promise<unknown>>();

	public async runNonExclusive<T>(callback: () => Promise<T>): Promise<T> {
		while (this.#exclusivePromise) {
			try {
				await this.#exclusivePromise;
			} catch {}
		}

		const nonExclusivePromise = callback();

		try {
			this.#nonExclusivePromises.add(nonExclusivePromise);
			return await nonExclusivePromise;
		} finally {
			this.#nonExclusivePromises.delete(nonExclusivePromise);
		}
	}

	public async runExclusive<T>(callback: () => Promise<T>): Promise<T> {
		while (this.#exclusivePromise) {
			try {
				await this.#exclusivePromise;
			} catch {}
		}

		const exclusivePromise = (async () => {
			await Promise.all(
				[...this.#nonExclusivePromises].map(async (nonExclusivePromise) => {
					try {
						await nonExclusivePromise;
					} catch {}
				}),
			);

			return await callback();
		})();

		try {
			this.#exclusivePromise = exclusivePromise;
			return await exclusivePromise;
		} finally {
			this.#exclusivePromise = undefined;
		}
	}
}
