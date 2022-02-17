import { Pipeline, Stage } from "../../../contracts/kernel";
import { injectable } from "../../../ioc";

@injectable()
export class NullPipeline implements Pipeline {
	public constructor(stages: Array<Function | Stage> = []) {}

	public pipe(stage: Function | Stage): Pipeline {
		return new NullPipeline([]);
	}

	public async process<T>(payload: T): Promise<T | undefined> {
		return undefined;
	}

	public processSync<T>(payload: T): T | undefined {
		return undefined;
	}
}
