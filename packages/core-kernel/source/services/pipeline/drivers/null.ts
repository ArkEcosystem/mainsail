import { injectable } from "@arkecosystem/core-container";
import { Contracts } from "@arkecosystem/core-contracts";

@injectable()
export class NullPipeline implements Contracts.Kernel.Pipeline {
	public constructor(stages: Array<Function | Contracts.Kernel.Stage> = []) {}

	public pipe(stage: Function | Contracts.Kernel.Stage): Contracts.Kernel.Pipeline {
		return new NullPipeline([]);
	}

	public async process<T>(payload: T): Promise<T | undefined> {
		return undefined;
	}

	public processSync<T>(payload: T): T | undefined {
		return undefined;
	}
}
