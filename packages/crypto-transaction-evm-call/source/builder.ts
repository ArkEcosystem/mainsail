import { injectable, postConstruct } from "@mainsail/container";
import { Contracts, Exceptions } from "@mainsail/contracts";
import { TransactionBuilder } from "@mainsail/crypto-transaction";
import { BigNumber } from "@mainsail/utils";

import { EvmCallTransaction } from "./versions/1.js";

@injectable()
export class EvmCallBuilder extends TransactionBuilder<EvmCallBuilder> {
	@postConstruct()
	public postConstruct() {
		this.initializeData();

		this.data.type = EvmCallTransaction.type;
		this.data.typeGroup = EvmCallTransaction.typeGroup;
		this.data.amount = BigNumber.ZERO;
		this.data.senderPublicKey = "";
		this.data.asset = {
			evmCall: {
				// TODO: gas parameters
				gasLimit: 1_000_000,
				payload: "",
			},
		};
	}

	public payload(payload: string): EvmCallBuilder {
		if (this.data.asset && this.data.asset.evmCall) {
			this.data.asset.evmCall.payload = payload;
		}

		return this;
	}

	public gasLimit(gasLimit: number): EvmCallBuilder {
		if (this.data.asset && this.data.asset.evmCall) {
			this.data.asset.evmCall.gasLimit = gasLimit;
		}

		return this;
	}

	public async getStruct(): Promise<Contracts.Crypto.TransactionData> {
		if (!this.data.asset || !this.data.asset.evmCall || !this.data.asset.evmCall.payload) {
			throw new Exceptions.EvmCallIncompleteAssetError();
		}

		if (!this.data.recipientId) {
			throw new Exceptions.EvmCallMissingRecipientError();
		}

		const struct: Contracts.Crypto.TransactionData = await super.getStruct();

		struct.recipientId = this.data.recipientId;
		struct.amount = this.data.amount;
		struct.asset = this.data.asset;

		return struct;
	}

	protected instance(): EvmCallBuilder {
		return this;
	}
}
