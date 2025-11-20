import type { Contracts } from "@mainsail/contracts";

let accept: number[] = [];
let broadcast: number[] = [];
let invalid: number[] = [];
let excess: number[] = [];
let errors: { [id: string]: Contracts.TransactionPool.ProcessorError } | undefined;

class TransactionPoolProcessorMock implements Partial<Contracts.TransactionPool.Processor> {
	public async process(data: Contracts.Crypto.TransactionJson[] | Buffer[]): Promise<{
		accept: number[];
		broadcast: number[];
		invalid: number[];
		excess: number[];
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

export const setProcessorState = (state: {
	accept: number[];
	broadcast: number[];
	invalid: number[];
	excess: number[];
	errors?: { [id: string]: Contracts.TransactionPool.ProcessorError };
}): void => {
	accept = state.accept ? state.accept : [];
	broadcast = state.broadcast ? state.broadcast : [];
	broadcast = state.broadcast ? state.broadcast : [];
	invalid = state.invalid ? state.invalid : [];
	excess = state.excess ? state.excess : [];
	errors = state.errors ? state.errors : undefined;
};

export const instance = new TransactionPoolProcessorMock();
