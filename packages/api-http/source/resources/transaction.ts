import { Models } from "@mainsail/api-database";
import { injectable } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";

// https://stackoverflow.com/a/53742518
type T_AND = Models.Transaction;
type T_OR = Models.Transaction;
type AnyTransaction = Partial<T_AND> & Pick<T_OR, keyof T_OR>;

export interface EnrichedTransaction extends AnyTransaction {
	state: Models.State;
}

@injectable()
export class TransactionResource implements Contracts.Api.Resource {
	public raw(resource: EnrichedTransaction): object {
		return { ...resource, state: undefined };
	}

	public async transform(resource: EnrichedTransaction): Promise<object> {
		let confirmations: number | undefined;
		if (resource.blockHeight) {
			confirmations = +resource.state.height - +resource.blockHeight + 1;
		}

		return {
			id: resource.id,
			nonce: resource.nonce,

			amount: resource.amount,
			blockId: resource.blockId,
			confirmations,

			recipient: resource.recipientAddress,
			senderPublicKey: resource.senderPublicKey,
			senderAddress: resource.senderAddress,

			gasPrice: resource.gasPrice,
			gasLimit: resource.gasLimit,
			data: resource.data,

			signature: resource.signature,
			signatures: resource.signatures,

			timestamp: resource.timestamp ? +resource.timestamp : undefined,
		};
	}
}
