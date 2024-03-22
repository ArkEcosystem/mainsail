import { Models } from "@mainsail/api-database";
import { injectable } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";

type T_AND = Models.Transaction & Models.MempoolTransaction;
type T_OR = Models.Transaction | Models.MempoolTransaction;
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

			timestamp: resource.timestamp ? +resource.timestamp : undefined,

			type: resource.type,
			typeGroup: resource.typeGroup,
			vendorField: resource.vendorField,
			version: resource.version,
		};
	}
}
