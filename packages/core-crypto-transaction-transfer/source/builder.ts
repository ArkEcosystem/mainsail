import { ITransactionData } from "@arkecosystem/core-crypto-contracts";
import { TransactionBuilder } from "@arkecosystem/core-crypto-transaction";
import { Container } from "@arkecosystem/core-kernel";
import { BigNumber } from "@arkecosystem/utils";

import { TransferTransaction } from "./versions/1";

@Container.injectable()
export class TransferBuilder extends TransactionBuilder<TransferBuilder> {
	@Container.postConstruct()
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
