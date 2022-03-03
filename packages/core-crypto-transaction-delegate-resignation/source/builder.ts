import { injectable, postConstruct } from "@arkecosystem/core-container";
import { Crypto } from "@arkecosystem/core-contracts";
import { TransactionBuilder } from "@arkecosystem/core-crypto-transaction";
import { BigNumber } from "@arkecosystem/utils";

import { DelegateResignationTransaction } from "./versions/1";

@injectable()
export class DelegateResignationBuilder extends TransactionBuilder<DelegateResignationBuilder> {
	@postConstruct()
	public postConstruct() {
		this.initializeData();

		this.data.type = DelegateResignationTransaction.type;
		this.data.typeGroup = DelegateResignationTransaction.typeGroup;
		this.data.fee = DelegateResignationTransaction.staticFee(this.configuration);
		this.data.amount = BigNumber.ZERO;
		this.data.senderPublicKey = undefined;
	}

	public async getStruct(): Promise<Crypto.ITransactionData> {
		const struct: Crypto.ITransactionData = await super.getStruct();
		struct.amount = this.data.amount;
		return struct;
	}

	protected instance(): DelegateResignationBuilder {
		return this;
	}
}
