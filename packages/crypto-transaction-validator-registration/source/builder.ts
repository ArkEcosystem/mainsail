import { injectable, postConstruct } from "@mainsail/container";
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
		this.data.senderPublicKey = "";
		this.data.asset = {} as Contracts.Crypto.TransactionAsset;
	}

	public publicKeyAsset(publicKey: string): ValidatorRegistrationBuilder {
		if (this.data.asset) {
			this.data.asset.validatorPublicKey = publicKey;
		}

		return this;
	}

	public async getStruct(): Promise<Contracts.Crypto.TransactionData> {
		const struct: Contracts.Crypto.TransactionData = await super.getStruct();
		struct.amount = this.data.amount;
		struct.recipientId = this.data.recipientId;
		struct.asset = this.data.asset;
		return struct;
	}

	protected instance(): ValidatorRegistrationBuilder {
		return this;
	}
}
