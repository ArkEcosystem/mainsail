import { CappedMap } from "@mainsail/utils";

import { ITransactionData } from "../crypto";

export interface TransactionStore extends CappedMap<string, ITransactionData> {
	push(value: ITransactionData): void;
}
