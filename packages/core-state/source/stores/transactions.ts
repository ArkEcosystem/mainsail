import Contracts, { Crypto } from "@arkecosystem/core-contracts";
import { Container, Utils } from "@arkecosystem/core-kernel";

// todo: review its implementation and finally integrate it as planned in v2
@Container.injectable()
export class TransactionStore
	extends Utils.CappedMap<string, Crypto.ITransactionData>
	implements Contracts.State.TransactionStore
{
	public push(value: Crypto.ITransactionData): void {
		Utils.assert.defined<string>(value.id);

		super.set(value.id, value);
	}
}
