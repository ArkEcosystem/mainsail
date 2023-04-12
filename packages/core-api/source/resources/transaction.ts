import { inject, injectable, tagged } from "@arkecosystem/core-container";
import { Contracts, Identifiers } from "@arkecosystem/core-contracts";
import { Utils as AppUtils } from "@arkecosystem/core-kernel";

// import { Interfaces } from "@arkecosystem/crypto";
import { Resource } from "../interfaces";

@injectable()
export class TransactionResource implements Resource {
	/**
	 * @protected
	 * @type {Contracts.State.WalletRepository}
	 * @memberof TransactionResource
	 */
	@inject(Identifiers.WalletRepository)
	@tagged("state", "blockchain")
	protected readonly walletRepository!: Contracts.State.WalletRepository;

	/**
	 * Return the raw representation of the resource.
	 *
	 * @param {Interfaces.ITransactionData} resource
	 * @returns {object}
	 * @memberof Resource
	 */
	public raw(resource: Contracts.Crypto.ITransactionData): object {
		return JSON.parse(JSON.stringify(resource));
	}

	/**
	 * Return the transformed representation of the resource.
	 *
	 * @param {Interfaces.ITransactionData} resource
	 * @returns {object}
	 * @memberof Resource
	 */
	public async transform(resource: Contracts.Crypto.ITransactionData): Promise<object> {
		AppUtils.assert.defined<string>(resource.senderPublicKey);

		const wallet = await this.walletRepository.findByPublicKey(resource.senderPublicKey);
		const sender: string = wallet.getAddress();

		return {
			amount: resource.amount.toFixed(),
			blockId: resource.blockId,
			asset: resource.asset,
			fee: resource.fee.toFixed(),
			confirmations: 0,
			id: resource.id,
			// ! resource.block ? lastBlock.data.height - resource.block.height + 1 : 0
			// timestamp:
			// 	typeof resource.timestamp !== "undefined" ? AppUtils.formatTimestamp(resource.timestamp) : undefined,
			nonce: resource.nonce?.toFixed(),

			recipient: resource.recipientId || sender,

			sender,

			senderPublicKey: resource.senderPublicKey,

			signature: resource.signature,

			type: resource.type,

			signatures: resource.signatures,

			version: resource.version,

			typeGroup: resource.typeGroup,

			vendorField: resource.vendorField,
		};
	}
}
