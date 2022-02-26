import { ITransactionAsset, ITransactionData } from "@arkecosystem/core-crypto-contracts";
import { TransactionBuilder } from "@arkecosystem/core-crypto-transaction";
import { BigNumber } from "@arkecosystem/utils";

import { One } from "./versions/1";

export class DelegateRegistrationBuilder extends TransactionBuilder<DelegateRegistrationBuilder> {
	public constructor() {
		super();

		this.data.type = One.type;
		this.data.typeGroup = One.typeGroup;
		this.data.fee = One.staticFee(this.configuration);
		this.data.amount = BigNumber.ZERO;
		this.data.recipientId = undefined;
		this.data.senderPublicKey = undefined;
		this.data.asset = { delegate: {} } as ITransactionAsset;
	}

	public usernameAsset(username: string): DelegateRegistrationBuilder {
		if (this.data.asset && this.data.asset.delegate) {
			this.data.asset.delegate.username = username;
		}

		return this;
	}

	public async getStruct(): Promise<ITransactionData> {
		const struct: ITransactionData = await super.getStruct();
		struct.amount = this.data.amount;
		struct.recipientId = this.data.recipientId;
		struct.asset = this.data.asset;
		return struct;
	}

	protected instance(): DelegateRegistrationBuilder {
		return this;
	}
}
