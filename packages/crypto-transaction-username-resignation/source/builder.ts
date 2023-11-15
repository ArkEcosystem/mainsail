import { injectable, postConstruct } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";
import { TransactionBuilder } from "@mainsail/crypto-transaction";
import { BigNumber } from "@mainsail/utils";

import { UsernameResignationTransaction } from "./versions/1";

@injectable()
export class ValidatorResignationBuilder extends TransactionBuilder<ValidatorResignationBuilder> {
	@postConstruct()
	public postConstruct() {
		this.initializeData();

		this.data.type = UsernameResignationTransaction.type;
		this.data.typeGroup = UsernameResignationTransaction.typeGroup;
		this.data.amount = BigNumber.ZERO;
		this.data.senderPublicKey = "";
	}

	public async getStruct(): Promise<Contracts.Crypto.ITransactionData> {
		const struct: Contracts.Crypto.ITransactionData = await super.getStruct();
		struct.amount = this.data.amount;
		return struct;
	}

	protected instance(): ValidatorResignationBuilder {
		return this;
	}
}
