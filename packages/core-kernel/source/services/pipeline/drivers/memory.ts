import { Kernel } from "@arkecosystem/core-contracts";

import { injectable } from "../../../ioc";

@injectable()
export class MemoryPipeline implements Kernel.Pipeline {
	public constructor(private readonly stages: Array<Function | Kernel.Stage> = []) {}

	public pipe(stage: Function | Kernel.Stage): Kernel.Pipeline {
		const stages: Array<Function | Kernel.Stage> = [...this.stages];

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
