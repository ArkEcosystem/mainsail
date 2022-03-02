import { Kernel } from "@arkecosystem/core-contracts";

import { injectable } from "../../../ioc";

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
