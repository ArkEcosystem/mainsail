import { injectable } from "@arkecosystem/core-container";
import { Contracts } from "@arkecosystem/core-contracts";

@injectable()
export class MemoryPipeline implements Contracts.Kernel.Pipeline {
	public constructor(private readonly stages: Array<Function | Contracts.Kernel.Stage> = []) {}

	public pipe(stage: Function | Contracts.Kernel.Stage): Contracts.Kernel.Pipeline {
		const stages: Array<Function | Contracts.Kernel.Stage> = [...this.stages];

		stages.push(stage);

		return new MemoryPipeline(stages);
	}

	public async process<T>(payload: T): Promise<T | undefined> {
		for (const stage of this.stages) {
			if (typeof stage === "function") {
				payload = await stage(payload);
			} else {
				payload = await stage.process(payload);
			}
		}

		return payload;
	}

	public processSync<T>(payload: T): T | undefined {
		for (const stage of this.stages) {
			if (typeof stage === "function") {
				payload = stage(payload);
			} else {
				payload = stage.process(payload);
			}
		}

		return payload;
	}
}
