import { Crypto } from "@arkecosystem/core-contracts";
import { TransactionBuilder } from "@arkecosystem/core-crypto-transaction";
import { Container } from "@arkecosystem/core-kernel";
import { BigNumber } from "@arkecosystem/utils";

import { DelegateResignationTransaction } from "./versions/1";

@Container.injectable()
export class DelegateResignationBuilder extends TransactionBuilder<DelegateResignationBuilder> {
	@Container.postConstruct()
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
