import { Models } from "../../../core-database";
import { Interfaces, Utils } from "@arkecosystem/crypto";

export const mapTransactionToModel = (
	transaction: Interfaces.ITransaction,
	blockHeight?: number,
	sequence?: number,
): Models.Transaction => ({
	blockHeight: blockHeight ?? transaction.data.blockHeight ?? 0,
	blockId: transaction.data.blockId || "",
	id: transaction.id,
	amount: Utils.BigNumber.make(transaction.data.amount),
	nonce: transaction.data.nonce || Utils.BigNumber.make(1),
	fee: Utils.BigNumber.make(transaction.data.fee),
	recipientId: transaction.data.recipientId || "",
	asset: transaction.data.asset as Record<string, any>,
	senderPublicKey: transaction.data.senderPublicKey || "",
	sequence: sequence ?? transaction.data.sequence ?? 0,
	version: transaction.data.version || 1,
	serialized: transaction.serialized,
	timestamp: transaction.data.timestamp,
	type: transaction.data.type,
	typeGroup: transaction.data.typeGroup || 1,
	vendorField: transaction.data.vendorField,
});
