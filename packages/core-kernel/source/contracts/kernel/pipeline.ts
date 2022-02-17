export interface Stage {
	process(payload: any);
}

export interface Pipeline {
	pipe(stage: Function | Stage): Pipeline;

	process<T>(payload: T): Promise<T | undefined>;

	processSync<T>(payload: T): T | undefined;
}
