import { injectable, postConstruct } from "@arkecosystem/core-container";
import { Crypto } from "@arkecosystem/core-contracts";
import { TransactionBuilder } from "@arkecosystem/core-crypto-transaction";
import { BigNumber } from "@arkecosystem/utils";

import { ValidatorResignationTransaction } from "./versions/1";

@injectable()
export class ValidatorResignationBuilder extends TransactionBuilder<ValidatorResignationBuilder> {
	@postConstruct()
	public postConstruct() {
		this.initializeData();

		this.data.type = ValidatorResignationTransaction.type;
		this.data.typeGroup = ValidatorResignationTransaction.typeGroup;
		this.data.fee = ValidatorResignationTransaction.staticFee(this.configuration);
		this.data.amount = BigNumber.ZERO;
		this.data.senderPublicKey = undefined;
	}

	public async getStruct(): Promise<Crypto.ITransactionData> {
		const struct: Crypto.ITransactionData = await super.getStruct();
		struct.amount = this.data.amount;
		return struct;
	}

	protected instance(): ValidatorResignationBuilder {
		return this;
	}
}
