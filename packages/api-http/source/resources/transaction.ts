import { Models } from "@mainsail/api-database";
import { injectable } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";

@injectable()
export class TransactionResource implements Contracts.Api.Resource {
	public raw(resource: Models.Transaction): object {
		return JSON.parse(JSON.stringify(resource));
	}

	public async transform(resource: Models.Transaction): Promise<object> {
		// TODO: address can be calculated from public key, no need to lookup the wallet
		// const wallet = await this.walletRepository.findByPublicKey(transactionData.senderPublicKey);
		// const sender: string = wallet.getAddress();
		const recipient = resource.recipientId; // ?? sender;
		// const confirmations: number = this.stateStore.getLastHeight() - blockData.height + 1;

		return {
			amount: resource.amount,
			asset: resource.asset,
			blockId: resource.blockId,
			fee: resource.fee,
			id: resource.id,
			nonce: resource.nonce,

			recipient,
			senderPublicKey: resource.senderPublicKey,

			signature: resource.signature,
			// TODO
			// sender,
			// timestamp: AppUtils.formatTimestamp(blockData.timestamp),
			//confirmations,
			//signatures: resource.signatures,

			type: resource.type,
			typeGroup: resource.typeGroup,
			vendorField: resource.vendorField,
			version: resource.version,
		};
	}
}
