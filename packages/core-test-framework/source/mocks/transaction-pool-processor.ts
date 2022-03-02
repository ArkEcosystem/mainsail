import Contracts, { Crypto } from "@arkecosystem/core-contracts";

let accept: string[] = [];
let broadcast: string[] = [];
let invalid: string[] = [];
let excess: string[] = [];
let errors: { [id: string]: Contracts.TransactionPool.ProcessorError } | undefined;

export const setProcessorState = (state: any): void => {
	accept = state.accept ? state.accept : [];
	broadcast = state.broadcast ? state.broadcast : [];
	broadcast = state.broadcast ? state.broadcast : [];
	invalid = state.invalid ? state.invalid : [];
	excess = state.excess ? state.excess : [];
	errors = state.errors ? state.errors : undefined;
};

class TransactionPoolProcessorMock implements Partial<Contracts.TransactionPool.Processor> {
	public async process(data: Crypto.ITransactionData[] | Buffer[]): Promise<{
		accept: string[];
		broadcast: string[];
		invalid: string[];
		excess: string[];
		errors?: { [id: string]: Contracts.TransactionPool.ProcessorError };
	}> {
		return {
			accept,
			broadcast,
			errors,
			excess,
			invalid,
		};
	}
}

export const instance = new TransactionPoolProcessorMock();
