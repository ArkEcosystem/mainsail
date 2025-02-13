import { Models } from "@mainsail/api-database";
import { injectable } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";

// https://stackoverflow.com/a/53742518
type T_AND = Models.Transaction;
type T_OR = Models.Transaction;
type AnyTransaction = Partial<T_AND> & Pick<T_OR, keyof T_OR>;

export interface EnrichedTransaction extends AnyTransaction {
	state: Models.State;
	receipt?: Models.Receipt;
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
			amount: resource.amount,
			blockId: resource.blockId,

			confirmations,
			data: resource.data === "0x" ? "" : resource.data,
			gasLimit: resource.gasLimit,

			gasPrice: resource.gasPrice,
			id: resource.id,
			nonce: resource.nonce,

			recipient: resource.recipientAddress,
			senderAddress: resource.senderAddress,
			senderPublicKey: resource.senderPublicKey,

			signature: resource.signature,
			signatures: resource.signatures,

			timestamp: resource.timestamp ? +resource.timestamp : undefined,

			...(resource.receipt
				? {
						receipt: {
							deployedContractAddress: resource.receipt.deployedContractAddress ?? undefined,
							gasRefunded: resource.receipt.gasRefunded,
							gasUsed: resource.receipt.gasUsed,
							logs: resource.receipt.logs,
							output: resource.receipt.output,
							success: resource.receipt.success,
						},
					}
				: {}),
		};
	}
}
