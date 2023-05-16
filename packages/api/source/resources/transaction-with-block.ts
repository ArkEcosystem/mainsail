import { Contracts } from "@mainsail/contracts";
import { Utils as AppUtils } from "@mainsail/kernel";

import { Resource } from "../types";

type TransactionDataWithBlockData = {
	data: Contracts.Crypto.ITransactionData;
	block: Contracts.Crypto.IBlockData;
};

@injectable()
export class TransactionWithBlockResource implements Resource {
	@inject(Identifiers.WalletRepository)
	@tagged("state", "blockchain")
	protected readonly walletRepository!: Contracts.State.WalletRepository;

	@inject(Identifiers.StateStore)
	private readonly stateStore!: Contracts.State.StateStore;

	public raw(resource: TransactionDataWithBlockData): object {
		return JSON.parse(JSON.stringify(resource));
	}

	public async transform(resource: TransactionDataWithBlockData): Promise<object> {
		const transactionData = resource.data;
		const blockData = resource.block;

		AppUtils.assert.defined<string>(transactionData.senderPublicKey);

		const wallet = await this.walletRepository.findByPublicKey(transactionData.senderPublicKey);
		const sender: string = wallet.getAddress();
		const recipient: string = transactionData.recipientId ?? sender;
		const confirmations: number = this.stateStore.getLastHeight() - blockData.height + 1;

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
