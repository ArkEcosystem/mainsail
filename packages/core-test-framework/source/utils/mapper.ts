import { Crypto } from "@arkecosystem/core-contracts";
import { BigNumber } from "@arkecosystem/utils";

import { Models } from "../../../core-database";

export const mapTransactionToModel = (
	transaction: Crypto.ITransaction,
	blockHeight?: number,
	sequence?: number,
): Models.Transaction => ({
	amount: BigNumber.make(transaction.data.amount),
	asset: transaction.data.asset as Record<string, any>,
	blockHeight: blockHeight ?? transaction.data.blockHeight ?? 0,
	blockId: transaction.data.blockId || "",
	fee: BigNumber.make(transaction.data.fee),
	id: transaction.id,
	nonce: transaction.data.nonce || BigNumber.make(1),
	recipientId: transaction.data.recipientId || "",
	senderPublicKey: transaction.data.senderPublicKey || "",
	sequence: sequence ?? transaction.data.sequence ?? 0,
	serialized: transaction.serialized,
	timestamp: transaction.data.timestamp,
	type: transaction.data.type,
	typeGroup: transaction.data.typeGroup || 1,
	vendorField: transaction.data.vendorField,
	version: transaction.data.version || 1,
});
