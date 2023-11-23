import { Contracts as ApiContracts } from "@mainsail/api-common";
import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Utils as AppUtils } from "@mainsail/kernel";

@injectable()
export class TransactionResource implements ApiContracts.Resource {
	@inject(Identifiers.StateService)
	private readonly stateService!: Contracts.State.Service;

	public raw(resource: Contracts.Crypto.ITransactionData): object {
		return JSON.parse(JSON.stringify(resource));
	}

	public async transform(resource: Contracts.Crypto.ITransactionData): Promise<object> {
		AppUtils.assert.defined<string>(resource.senderPublicKey);

		const wallet = await this.stateService.getWalletRepository().findByPublicKey(resource.senderPublicKey);
		const sender: string = wallet.getAddress();

		return {
			amount: resource.amount.toFixed(),
			asset: resource.asset,
			blockId: resource.blockId,
			fee: resource.fee.toFixed(),
			id: resource.id,
			nonce: resource.nonce?.toFixed(),
			recipient: resource.recipientId || sender,

			sender,

			senderPublicKey: resource.senderPublicKey,

			signature: resource.signature,

			signatures: resource.signatures,

			timestamp: resource.timestamp,

			type: resource.type,

			typeGroup: resource.typeGroup,

			vendorField: resource.vendorField,

			version: resource.version,
		};
	}
}
