import { injectable, postConstruct } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";
import { TransactionBuilder } from "@mainsail/crypto-transaction";
import { BigNumber } from "@mainsail/utils";

import { UsernameRegistrationTransaction } from "./versions/1";

@injectable()
export class UsernameRegistrationBuilder extends TransactionBuilder<UsernameRegistrationBuilder> {
	@postConstruct()
	public postConstruct() {
		this.initializeData();

		this.data.type = UsernameRegistrationTransaction.type;
		this.data.typeGroup = UsernameRegistrationTransaction.typeGroup;
		this.data.amount = BigNumber.ZERO;
		this.data.recipientId = undefined;
		this.data.senderPublicKey = "";
		this.data.asset = {} as Contracts.Crypto.TransactionAsset;
	}

	public usernameAsset(username: string): UsernameRegistrationBuilder {
		if (this.data.asset) {
			this.data.asset.username = username;
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

	protected instance(): UsernameRegistrationBuilder {
		return this;
	}
}
