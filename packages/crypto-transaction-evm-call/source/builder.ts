import { injectable, postConstruct } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";
import { TransactionBuilder } from "@mainsail/crypto-transaction";
import { BigNumber } from "@mainsail/utils";

@injectable()
export class EvmCallBuilder extends TransactionBuilder<EvmCallBuilder> {
	@postConstruct()
	public postConstruct() {
		this.initializeData();

		this.data.value = BigNumber.ZERO;
		this.data.senderAddress = "";
		this.data.gasLimit = 1_000_000;
		this.data.gasPrice = 5;
		this.data.data = "";
	}

	public payload(payload: string): EvmCallBuilder {
		this.data.data = payload.startsWith("0x") ? payload : `0x${payload}`;

		return this;
	}

	public gasLimit(gasLimit: number): EvmCallBuilder {
		this.data.gasLimit = gasLimit;

		return this;
	}

	public async getStruct(): Promise<Contracts.Crypto.TransactionData> {
		const struct: Contracts.Crypto.TransactionData = await super.getStruct();

		struct.value = this.data.value;
		struct.recipientAddress = this.data.recipientAddress;

		return struct;
	}

	protected instance(): EvmCallBuilder {
		return this;
	}
}
