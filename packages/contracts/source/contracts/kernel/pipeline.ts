export interface Stage<T> {
	process(payload: T): Promise<T>;
}

export type PipelineFunction<T> = (parameter: T) => Promise<T>;

export interface Pipeline<T> {
	pipe(stage: PipelineFunction<T> | Stage<T>): Pipeline<T>;

	process(payload: T): Promise<T | undefined>;
}
