import { injectable } from "@mainsail/container";
import { Contracts, Exceptions } from "@mainsail/contracts";

@injectable()
export class GasLimits implements Contracts.Evm.GasLimits {
	public of(transaction: Contracts.Crypto.Transaction): number {
		if (transaction.data.asset?.evmCall) {
			return transaction.data.asset.evmCall.gasLimit;
		}

		throw new Exceptions.TransactionTypeError(transaction.type.toString());
	}
}
