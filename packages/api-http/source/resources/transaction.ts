import { Models } from "@mainsail/api-database";
import { injectable } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";

export interface TransactionModel extends Models.Transaction {
	state: Models.State;
}

@injectable()
export class TransactionResource implements Contracts.Api.Resource {
	public raw(resource: TransactionModel): object {
		return { ...resource, state: undefined };
	}

	public async transform(resource: TransactionModel): Promise<object> {
		const confirmations: number = +resource.state.height - +resource.blockHeight + 1;

		return {
			amount: resource.amount,
			asset: resource.asset,
			blockId: resource.blockId,
			confirmations,

			fee: resource.fee,
			id: resource.id,
			nonce: resource.nonce,

			recipient: resource.recipientId,
			senderPublicKey: resource.senderPublicKey,

			signature: resource.signature,
			signatures: resource.signatures,

			timestamp: +resource.timestamp,

			type: resource.type,
			typeGroup: resource.typeGroup,
			vendorField: resource.vendorField,
			version: resource.version,
		};
	}
}
