import { IMultiSignatureAsset, ITransactionData } from "@arkecosystem/core-crypto-contracts";
import { BigNumber } from "@arkecosystem/utils";
import { TransactionBuilder } from "@arkecosystem/core-crypto-transaction";

import { Two } from "./versions/2";

export class MultiSignatureBuilder extends TransactionBuilder<MultiSignatureBuilder> {
	public constructor() {
		super();

		this.data.type = Two.type;
		this.data.typeGroup = Two.typeGroup;
		this.data.version = 2;
		this.data.fee = BigNumber.ZERO;
		this.data.amount = BigNumber.ZERO;
		this.data.recipientId = undefined;
		this.data.senderPublicKey = undefined;
		this.data.asset = { multiSignature: { min: 0, publicKeys: [] } };
	}

	public participant(publicKey: string): MultiSignatureBuilder {
		if (this.data.asset && this.data.asset.multiSignature) {
			const { publicKeys }: IMultiSignatureAsset = this.data.asset.multiSignature;

			if (publicKeys.length <= 16) {
				publicKeys.push(publicKey);
				this.data.fee = Two.staticFee(this.configuration, {
					data: this.data,
				});
			}
		}

		return this;
	}

	public min(min: number): MultiSignatureBuilder {
		if (this.data.asset && this.data.asset.multiSignature) {
			this.data.asset.multiSignature.min = min;
		}

		return this;
	}

	public multiSignatureAsset(multiSignature: IMultiSignatureAsset): MultiSignatureBuilder {
		if (this.data.asset && this.data.asset.multiSignature) {
			this.data.asset.multiSignature = multiSignature;
			this.data.fee = Two.staticFee(this.configuration, {
				data: this.data,
			});
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

	protected instance(): MultiSignatureBuilder {
		return this;
	}
}
