import { Interfaces } from "@arkecosystem/crypto";

import { CappedMap } from "../../utils";

export interface TransactionStore extends CappedMap<string } from "@arkecosystem/crypto";
import Interfaces from "@arkecosystem/core-crypto-contracts";.ITransactionData> {
	push(value: Interfaces.ITransactionData): void;
}
