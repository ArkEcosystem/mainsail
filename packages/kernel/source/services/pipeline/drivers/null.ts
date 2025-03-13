import { injectable } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";

@injectable()
export class NullPipeline<T> implements Contracts.Kernel.Pipeline<T> {
	public constructor(stages: Array<() => void | Contracts.Kernel.Stage<T>> = []) {}

	public pipe(stage: Contracts.Kernel.PipelineFunction<T> | Contracts.Kernel.Stage<T>): Contracts.Kernel.Pipeline<T> {
		return new NullPipeline([]);
	}

	public async process<T>(payload: T): Promise<T | undefined> {
		return undefined;
	}
}
