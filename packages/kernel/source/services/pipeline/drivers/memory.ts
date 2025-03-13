import { injectable } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";

@injectable()
export class MemoryPipeline<T> implements Contracts.Kernel.Pipeline<T> {
	public constructor(
		private readonly stages: Array<Contracts.Kernel.PipelineFunction<T> | Contracts.Kernel.Stage<T>> = [],
	) {}

	public pipe(stage: Contracts.Kernel.PipelineFunction<T> | Contracts.Kernel.Stage<T>): Contracts.Kernel.Pipeline<T> {
		const stages: Array<Contracts.Kernel.PipelineFunction<T> | Contracts.Kernel.Stage<T>> = [...this.stages];

		stages.push(stage);

		return new MemoryPipeline<T>(stages);
	}

	public async process(payload: T): Promise<T | undefined> {
		for (const stage of this.stages) {
			if (this.#isPipelineFunction(stage)) {
				payload = await stage(payload);
			} else {
				payload = await stage.process(payload);
			}
		}

		return payload;
	}

	#isPipelineFunction<T>(
		value: Contracts.Kernel.PipelineFunction<T> | Contracts.Kernel.Stage<T>,
	): value is Contracts.Kernel.PipelineFunction<T> {
		return typeof value === "function";
	}
}
