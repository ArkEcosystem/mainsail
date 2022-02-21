import { ITransactionData } from "@arkecosystem/crypto-contracts";
import { BigNumber } from "@arkecosystem/utils";
import { Two } from "../types";
import { TransactionBuilder } from "./transaction";

export class DelegateResignationBuilder extends TransactionBuilder<DelegateResignationBuilder> {
	public constructor() {
		super();

		this.data.type = Two.DelegateResignationTransaction.type;
		this.data.typeGroup = Two.DelegateResignationTransaction.typeGroup;
		this.data.version = 2;
		this.data.fee = Two.DelegateResignationTransaction.staticFee(this.configuration);
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
