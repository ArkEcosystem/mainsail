import { Crypto } from "@arkecosystem/core-contracts";
import { TransactionBuilder } from "@arkecosystem/core-crypto-transaction";
import { Container } from "@arkecosystem/core-kernel";
import { BigNumber } from "@arkecosystem/utils";

import { MultiSignatureRegistrationTransaction } from "./versions/1";

@Container.injectable()
export class MultiSignatureBuilder extends TransactionBuilder<MultiSignatureBuilder> {
	@Container.postConstruct()
	public postConstruct() {
		this.initializeData();

		this.data.type = MultiSignatureRegistrationTransaction.type;
		this.data.typeGroup = MultiSignatureRegistrationTransaction.typeGroup;
		this.data.version = 2;
		this.data.fee = BigNumber.ZERO;
		this.data.amount = BigNumber.ZERO;
		this.data.recipientId = undefined;
		this.data.senderPublicKey = undefined;
		this.data.asset = { multiSignature: { min: 0, publicKeys: [] } };
	}

	public participant(publicKey: string): MultiSignatureBuilder {
		if (this.data.asset && this.data.asset.multiSignature) {
			const { publicKeys }: Crypto.IMultiSignatureAsset = this.data.asset.multiSignature;

			if (publicKeys.length <= 16) {
				publicKeys.push(publicKey);
				this.data.fee = MultiSignatureRegistrationTransaction.staticFee(this.configuration, {
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

	public multiSignatureAsset(multiSignature: Crypto.IMultiSignatureAsset): MultiSignatureBuilder {
		if (this.data.asset && this.data.asset.multiSignature) {
			this.data.asset.multiSignature = multiSignature;
			this.data.fee = MultiSignatureRegistrationTransaction.staticFee(this.configuration, {
				data: this.data,
			});
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

	protected instance(): MultiSignatureBuilder {
		return this;
	}
}
