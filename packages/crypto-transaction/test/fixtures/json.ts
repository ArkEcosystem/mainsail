import type { Contracts } from "@mainsail/contracts";

import {
	transactionContractCall as Deserialized_transactionContractCall,
	transactionContractCallWithSecondSignature as Deserialized_transactionContractCallWithSecondSignature,
	transactionDeploy as Deserialized_transactionDeploy,
	transactionTransfer as Deserialized_transactionTransfer,
} from "./transactions.js";

const convertToJsonData = (transaction: Contracts.Crypto.TransactionData): Contracts.Crypto.TransactionJson => ({
	data: transaction.data.toString("hex"),
	from: transaction.from,
	gasLimit: Number(transaction.gasLimit.toFixed()),
	gasPrice: Number(transaction.gasPrice.toFixed()),
	legacySecondSignature: transaction.legacySecondSignature,
	network: transaction.network,
	nonce: transaction.nonce.toFixed(),
	r: transaction.r,
	s: transaction.s,
	senderPublicKey: transaction.senderPublicKey,
	to: transaction.to,
	v: transaction.v,
	value: transaction.value.toFixed(),
});

export const transactionTransfer = convertToJsonData(Deserialized_transactionTransfer);

export const transactionContractCall = convertToJsonData(Deserialized_transactionContractCall);

export const transactionContractCallWithSecondSignature = convertToJsonData(
	Deserialized_transactionContractCallWithSecondSignature,
);

export const transactionDeploy = convertToJsonData(Deserialized_transactionDeploy);
