import { ITransactionData } from "@arkecosystem/core-crypto-contracts";
import { TransactionBuilder } from "@arkecosystem/core-crypto-transaction";
import { Container } from "@arkecosystem/core-kernel";
import { BigNumber } from "@arkecosystem/utils";

import { VoteTransaction } from "./versions/1";

@Container.injectable()
export class VoteBuilder extends TransactionBuilder<VoteBuilder> {
	@Container.postConstruct()
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
