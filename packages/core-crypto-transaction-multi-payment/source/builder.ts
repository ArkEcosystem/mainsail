import { ITransactionData } from "@arkecosystem/core-crypto-contracts";
import { MaximumPaymentCountExceededError, MinimumPaymentCountSubceededError } from "@arkecosystem/core-crypto-errors";
import { TransactionBuilder } from "@arkecosystem/core-crypto-transaction";
import { BigNumber } from "@arkecosystem/utils";

import { One } from "./versions/1";

export class MultiPaymentBuilder extends TransactionBuilder<MultiPaymentBuilder> {
	public constructor() {
		super();

		this.data.type = One.type;
		this.data.typeGroup = One.typeGroup;
		this.data.fee = One.staticFee(this.configuration);
		this.data.vendorField = undefined;
		this.data.asset = {
			payments: [],
		};
		this.data.amount = BigNumber.make(0);
	}

	public addPayment(recipientId: string, amount: string): MultiPaymentBuilder {
		if (this.data.asset && this.data.asset.payments) {
			const limit: number = this.configuration.getMilestone().multiPaymentLimit || 256;

			if (this.data.asset.payments.length >= limit) {
				throw new MaximumPaymentCountExceededError(limit);
			}

			this.data.asset.payments.push({
				amount: BigNumber.make(amount),
				recipientId,
			});
		}

		return this;
	}

	public async getStruct(): Promise<ITransactionData> {
		if (
			!this.data.asset ||
			!this.data.asset.payments ||
			!Array.isArray(this.data.asset.payments) ||
			this.data.asset.payments.length <= 1
		) {
			throw new MinimumPaymentCountSubceededError();
		}

		const struct: ITransactionData = await super.getStruct();
		struct.senderPublicKey = this.data.senderPublicKey;
		struct.vendorField = this.data.vendorField;
		struct.amount = this.data.amount;
		struct.asset = this.data.asset;

		return struct;
	}

	protected instance(): MultiPaymentBuilder {
		return this;
	}
}
