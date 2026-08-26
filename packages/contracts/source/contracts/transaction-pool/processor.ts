

export type ProcessorError = {
	type: string;
	message: string;
};

export type ProcessorResult = {
	accept: number[];
	broadcast: number[];
	invalid: number[];
	excess: number[];
	errors?: { [index: string]: ProcessorError };
};

export interface Processor {
	process(data: Buffer[]): Promise<ProcessorResult>;
}

export type ProcessorFactory = () => Processor;
