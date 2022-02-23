import { ITransactionData } from "@arkecosystem/core-crypto-contracts";
import { BigNumber } from "@arkecosystem/utils";
import { TransactionBuilder } from "@arkecosystem/core-crypto-transaction";

import { Two } from "./versions/2";

export class VoteBuilder extends TransactionBuilder<VoteBuilder> {
	public constructor() {
		super();

		this.data.type = Two.type;
		this.data.typeGroup = Two.typeGroup;
		this.data.fee = Two.staticFee(this.configuration);
		this.data.amount = BigNumber.ZERO;
		this.data.recipientId = undefined;
		this.data.senderPublicKey = undefined;
		this.data.asset = { votes: [] };

		this.signWithSenderAsRecipient = true;
	}

	public votesAsset(votes: string[]): VoteBuilder {
		if (this.data.asset && this.data.asset.votes) {
			this.data.asset.votes = votes;
		}

		return this;
	}

	public async getStruct(): Promise<ITransactionData> {
		const struct: ITransactionData = await super.getStruct();
		struct.amount = this.data.amount;
		struct.recipientId = this.data.recipientId;
		struct.asset = this.data.asset;
		return struct;
	}

	protected instance(): VoteBuilder {
		return this;
	}
}
