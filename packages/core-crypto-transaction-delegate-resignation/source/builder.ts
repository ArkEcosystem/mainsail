import { ITransactionData } from "@arkecosystem/core-crypto-contracts";
import { BigNumber } from "@arkecosystem/utils";
import { TransactionBuilder } from "@arkecosystem/core-crypto-transaction";

import { Two } from "./versions/2";

export class DelegateResignationBuilder extends TransactionBuilder<DelegateResignationBuilder> {
	public constructor() {
		super();

		this.data.type = Two.type;
		this.data.typeGroup = Two.typeGroup;
		this.data.version = 2;
		this.data.fee = Two.staticFee(this.configuration);
		this.data.amount = BigNumber.ZERO;
		this.data.senderPublicKey = undefined;
	}

	public async getStruct(): Promise<ITransactionData> {
		const struct: ITransactionData = await super.getStruct();
		struct.amount = this.data.amount;
		return struct;
	}

	protected instance(): DelegateResignationBuilder {
		return this;
	}
}
