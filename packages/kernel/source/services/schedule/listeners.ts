import { Contracts } from "@mainsail/contracts";

export class ExecuteCallbackWhenReady implements Contracts.Kernel.EventListener {
	readonly #blockCount!: number;

	readonly #callback!: () => Promise<void>;

	public constructor(callback: () => Promise<void>, blockCount: number) {
		this.#blockCount = blockCount;
		this.#callback = callback;
	}

	public async handle({ data }): Promise<void> {
		if (data.height % this.#blockCount === 0) {
			await this.#callback();
		}
	}
}
