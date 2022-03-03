import { injectable, postConstruct } from "@arkecosystem/core-container";
import { Crypto } from "@arkecosystem/core-contracts";
import { TransactionBuilder } from "@arkecosystem/core-crypto-transaction";
import { BigNumber } from "@arkecosystem/utils";

import { TransferTransaction } from "./versions/1";

@injectable()
export class TransferBuilder extends TransactionBuilder<TransferBuilder> {
	@postConstruct()
	public postConstruct() {
		this.initializeData();

		this.data.type = TransferTransaction.type;
		this.data.typeGroup = TransferTransaction.typeGroup;
		this.data.fee = TransferTransaction.staticFee(this.configuration);
		this.data.amount = BigNumber.ZERO;
		this.data.recipientId = undefined;
		this.data.senderPublicKey = undefined;
		this.data.expiration = 0;
	}

	public expiration(expiration: number): TransferBuilder {
		this.data.expiration = expiration;

		return this.instance();
	}

	public async getStruct(): Promise<Crypto.ITransactionData> {
		const struct: Crypto.ITransactionData = await super.getStruct();
		struct.amount = this.data.amount;
		struct.recipientId = this.data.recipientId;
		struct.asset = this.data.asset;
		struct.vendorField = this.data.vendorField;
		struct.expiration = this.data.expiration;

		return struct;
	}

	protected instance(): TransferBuilder {
		return this;
	}
}
