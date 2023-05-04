import { injectable } from "inversify";

import { ITransaction, ITransactionData } from "../crypto";

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

@injectable()
export abstract class ProcessorExtension {
	public async throwIfCannotBroadcast(transaction: ITransaction): Promise<void> {
		// override me
	}
}

export interface Processor {
	process(data: ITransactionData[] | Buffer[]): Promise<ProcessorResult>;
}

export type ProcessorFactory = () => Processor;
