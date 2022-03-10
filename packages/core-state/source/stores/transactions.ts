import { injectable } from "@arkecosystem/core-container";
import { Contracts } from "@arkecosystem/core-contracts";
import { Utils } from "@arkecosystem/core-kernel";

// @TODO review its implementation and finally integrate it as planned in v2
@injectable()
export class TransactionStore
	extends Utils.CappedMap<string, Contracts.Crypto.ITransactionData>
	implements Contracts.State.TransactionStore
{
	public push(value: Contracts.Crypto.ITransactionData): void {
		Utils.assert.defined<string>(value.id);

		super.set(value.id, value);
	}
}
