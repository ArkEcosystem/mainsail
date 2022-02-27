import Interfaces from "@arkecosystem/core-crypto-contracts";

import { CappedMap } from "../../utils";

export interface TransactionStore extends CappedMap<string, Interfaces.ITransactionData> {
	push(value: Interfaces.ITransactionData): void;
}
