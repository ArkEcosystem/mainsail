import { inject, injectable, tagged } from "@arkecosystem/core-container";
import { Contracts, Identifiers } from "@arkecosystem/core-contracts";
import { Utils as AppUtils } from "@arkecosystem/core-kernel";

// import { Interfaces } from "@arkecosystem/crypto";
import { Resource } from "../interfaces";

@injectable()
export class TransactionResource implements Resource {
	@inject(Identifiers.WalletRepository)
	@tagged("state", "blockchain")
	protected readonly walletRepository!: Contracts.State.WalletRepository;

	public raw(resource: Contracts.Crypto.ITransactionData): object {
		return JSON.parse(JSON.stringify(resource));
	}

	public async transform(resource: Contracts.Crypto.ITransactionData): Promise<object> {
		AppUtils.assert.defined<string>(resource.senderPublicKey);

		const wallet = await this.walletRepository.findByPublicKey(resource.senderPublicKey);
		const sender: string = wallet.getAddress();

		return {
			amount: resource.amount.toFixed(),
			asset: resource.asset,
			blockId: resource.blockId,
			confirmations: 0,
			fee: resource.fee.toFixed(),
			id: resource.id,
			// ! resource.block ? lastBlock.data.height - resource.block.height + 1 : 0
			// timestamp:
			// 	typeof resource.timestamp !== "undefined" ? AppUtils.formatTimestamp(resource.timestamp) : undefined,
			nonce: resource.nonce?.toFixed(),

			recipient: resource.recipientId || sender,

			sender,

			senderPublicKey: resource.senderPublicKey,

			signature: resource.signature,

			signatures: resource.signatures,

			type: resource.type,

			typeGroup: resource.typeGroup,

			vendorField: resource.vendorField,

			version: resource.version,
		};
	}
}
