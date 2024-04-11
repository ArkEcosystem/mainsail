import { injectable, postConstruct } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";
import { TransactionBuilder } from "@mainsail/crypto-transaction";
import { BigNumber } from "@mainsail/utils";

import { MultiSignatureRegistrationTransaction } from "./versions/1.js";

@injectable()
export class MultiSignatureBuilder extends TransactionBuilder<MultiSignatureBuilder> {
	@postConstruct()
	public postConstruct() {
		this.initializeData();

		this.data.type = MultiSignatureRegistrationTransaction.type;
		this.data.typeGroup = MultiSignatureRegistrationTransaction.typeGroup;
		this.data.fee = BigNumber.ZERO;
		this.data.amount = BigNumber.ZERO;
		this.data.recipientId = undefined;
		this.data.senderPublicKey = "";
		this.data.asset = { multiSignature: { min: 0, publicKeys: [] } };
	}

	public participant(publicKey: string): MultiSignatureBuilder {
		if (this.data.asset && this.data.asset.multiSignature) {
			const { publicKeys }: Contracts.Crypto.MultiSignatureAsset = this.data.asset.multiSignature;

			if (publicKeys.length <= 16) {
				publicKeys.push(publicKey);
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

	public multiSignatureAsset(multiSignature: Contracts.Crypto.MultiSignatureAsset): MultiSignatureBuilder {
		if (this.data.asset && this.data.asset.multiSignature) {
			this.data.asset.multiSignature = multiSignature;
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

	protected instance(): MultiSignatureBuilder {
		return this;
	}
}
