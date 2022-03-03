import { injectable, postConstruct } from "@arkecosystem/core-container";
import { Crypto } from "@arkecosystem/core-contracts";
import { TransactionBuilder } from "@arkecosystem/core-crypto-transaction";
import { BigNumber } from "@arkecosystem/utils";

import { VoteTransaction } from "./versions/1";

@injectable()
export class VoteBuilder extends TransactionBuilder<VoteBuilder> {
	@postConstruct()
	public postConstruct() {
		this.initializeData();

		this.data.type = VoteTransaction.type;
		this.data.typeGroup = VoteTransaction.typeGroup;
		this.data.fee = VoteTransaction.staticFee(this.configuration);
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

	public async getStruct(): Promise<Crypto.ITransactionData> {
		const struct: Crypto.ITransactionData = await super.getStruct();
		struct.amount = this.data.amount;
		struct.recipientId = this.data.recipientId;
		struct.asset = this.data.asset;
		return struct;
	}

	protected instance(): VoteBuilder {
		return this;
	}
}
