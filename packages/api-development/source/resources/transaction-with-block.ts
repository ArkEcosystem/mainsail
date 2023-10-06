import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Utils as AppUtils } from "@mainsail/kernel";

import { Resource } from "../types";

type TransactionDataWithBlockData = {
	data: Contracts.Crypto.ITransactionData;
	block: Contracts.Crypto.IBlockData;
};

@injectable()
export class TransactionWithBlockResource implements Resource {
	@inject(Identifiers.StateService)
	private readonly stateService!: Contracts.State.Service;

	public raw(resource: TransactionDataWithBlockData): object {
		return JSON.parse(JSON.stringify(resource));
	}

	public async transform(resource: TransactionDataWithBlockData): Promise<object> {
		const transactionData = resource.data;
		const blockData = resource.block;

		AppUtils.assert.defined<string>(transactionData.senderPublicKey);

		const wallet = await this.stateService.getWalletRepository().findByPublicKey(transactionData.senderPublicKey);
		const sender: string = wallet.getAddress();
		const recipient: string = transactionData.recipientId ?? sender;
		const confirmations: number = this.stateService.getStateStore().getLastHeight() - blockData.height + 1;

		return {
			amount: transactionData.amount.toFixed(),
			asset: transactionData.asset,
			blockId: transactionData.blockId,
			confirmations,
			fee: transactionData.fee.toFixed(),
			id: transactionData.id,
			// timestamp: AppUtils.formatTimestamp(blockData.timestamp),
			nonce: transactionData.nonce.toFixed(),

			recipient,

			sender,

			senderPublicKey: transactionData.senderPublicKey,

			signature: transactionData.signature,

			signatures: transactionData.signatures,

			type: transactionData.type,

			typeGroup: transactionData.typeGroup,

			vendorField: transactionData.vendorField,

			version: transactionData.version,
		};
	}
}
