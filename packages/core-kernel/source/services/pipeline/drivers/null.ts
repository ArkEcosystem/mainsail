import { injectable } from "@arkecosystem/core-container";
import { Kernel } from "@arkecosystem/core-contracts";

@injectable()
export class NullPipeline implements Kernel.Pipeline {
	public constructor(stages: Array<Function | Kernel.Stage> = []) {}

	public pipe(stage: Function | Kernel.Stage): Kernel.Pipeline {
		return new NullPipeline([]);
	}

	public async process<T>(payload: T): Promise<T | undefined> {
		return undefined;
	}

	public processSync<T>(payload: T): T | undefined {
		return undefined;
	}
}
