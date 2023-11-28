import { ITransaction } from "../crypto";

export type ProcessorError = {
	type: string;
	message: string;
};

export type ProcessorResult = {
	accept: string[];
	broadcast: string[];
	invalid: string[];
	excess: string[];
	errors?: { [id: string]: ProcessorError };
};

export interface ProcessorExtension {
	throwIfCannotBroadcast(transaction: ITransaction): Promise<void>;
}

export interface Processor {
	process(data: Buffer[]): Promise<ProcessorResult>;
}

export type ProcessorFactory = () => Processor;
