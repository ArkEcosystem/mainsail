import { EventListener } from "../../contracts/kernel";

export class ExecuteCallbackWhenReady implements EventListener {
	private blockCount!: number;

	private callback!: Function;

	public constructor(callback: Function, blockCount: number) {
		this.blockCount = blockCount;
		this.callback = callback;
	}

	public async handle({ data }): Promise<void> {
		if (data.height % this.blockCount === 0) {
			await this.callback();
		}
	}
}
