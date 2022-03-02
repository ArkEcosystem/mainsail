import { Crypto } from "@arkecosystem/core-contracts";
import { TransactionBuilder } from "@arkecosystem/core-crypto-transaction";
import { Container } from "@arkecosystem/core-kernel";
import { BigNumber } from "@arkecosystem/utils";

import { DelegateRegistrationTransaction } from "./versions/1";

@Container.injectable()
export class DelegateRegistrationBuilder extends TransactionBuilder<DelegateRegistrationBuilder> {
	@Container.postConstruct()
	public postConstruct() {
		this.initializeData();

		this.data.type = DelegateRegistrationTransaction.type;
		this.data.typeGroup = DelegateRegistrationTransaction.typeGroup;
		this.data.fee = DelegateRegistrationTransaction.staticFee(this.configuration);
		this.data.amount = BigNumber.ZERO;
		this.data.recipientId = undefined;
		this.data.senderPublicKey = undefined;
		this.data.asset = { delegate: {} } as Crypto.ITransactionAsset;
	}

	public usernameAsset(username: string): DelegateRegistrationBuilder {
		if (this.data.asset && this.data.asset.delegate) {
			this.data.asset.delegate.username = username;
		}

		return this;
	}

	public async getStruct(): Promise<Crypto.ITransactionData> {
		const struct: Crypto.ITransactionData = await super.getStruct();
		struct.amount = this.data.amount;
		struct.recipientId = this.data.recipientId;
		struct.asset = this.data.asset;
		return struct;
	}

	protected instance(): DelegateRegistrationBuilder {
		return this;
	}
}
