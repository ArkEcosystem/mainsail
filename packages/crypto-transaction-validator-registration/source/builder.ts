import { Contracts } from "@mainsail/contracts";
import { TransactionBuilder } from "@mainsail/crypto-transaction";
import { BigNumber } from "@mainsail/utils";

import { ValidatorRegistrationTransaction } from "./versions/1";

@injectable()
export class ValidatorRegistrationBuilder extends TransactionBuilder<ValidatorRegistrationBuilder> {
	@postConstruct()
	public postConstruct() {
		this.initializeData();

		this.data.type = ValidatorRegistrationTransaction.type;
		this.data.typeGroup = ValidatorRegistrationTransaction.typeGroup;
		this.data.amount = BigNumber.ZERO;
		this.data.recipientId = undefined;
		this.data.senderPublicKey = undefined;
		this.data.asset = { validator: {} } as Contracts.Crypto.ITransactionAsset;
	}

	public usernameAsset(username: string): ValidatorRegistrationBuilder {
		if (this.data.asset && this.data.asset.validator) {
			this.data.asset.validator.username = username;
		}

		return this;
	}

	public async getStruct(): Promise<Contracts.Crypto.ITransactionData> {
		const struct: Contracts.Crypto.ITransactionData = await super.getStruct();
		struct.amount = this.data.amount;
		struct.recipientId = this.data.recipientId;
		struct.asset = this.data.asset;
		return struct;
	}

	protected instance(): ValidatorRegistrationBuilder {
		return this;
	}
}
