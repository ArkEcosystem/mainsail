import { ITransactionData } from "@arkecosystem/core-crypto-contracts";
import { TransactionBuilder } from "@arkecosystem/core-crypto-transaction";
import { BigNumber } from "@arkecosystem/utils";

import { One } from "./versions/1";

export class TransferBuilder extends TransactionBuilder<TransferBuilder> {
	public constructor() {
		super();

		this.data.type = One.type;
		this.data.typeGroup = One.typeGroup;
		this.data.fee = One.staticFee(this.configuration);
		this.data.amount = BigNumber.ZERO;
		this.data.recipientId = undefined;
		this.data.senderPublicKey = undefined;
		this.data.expiration = 0;
	}

	public expiration(expiration: number): TransferBuilder {
		this.data.expiration = expiration;

		return this.instance();
	}

	public async getStruct(): Promise<ITransactionData> {
		const struct: ITransactionData = await super.getStruct();
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
