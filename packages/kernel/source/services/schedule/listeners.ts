import type { Contracts } from "@mainsail/contracts";

export class ExecuteCallbackWhenReady implements Contracts.Kernel.EventListener<Contracts.Crypto.BlockData> {
	readonly #blockCount!: number;

	readonly #callback!: () => Promise<void>;

	public constructor(callback: () => Promise<void>, blockCount: number) {
		this.#blockCount = blockCount;
		this.#callback = callback;
	}

	public async handle({ data }: { data: Contracts.Crypto.BlockData }): Promise<void> {
		if (data.number % this.#blockCount === 0) {
			await this.#callback();
		}
	}
}
