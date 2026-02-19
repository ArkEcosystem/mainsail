import type { Contracts } from "@mainsail/contracts";

import {
	transactionContractCall as Deserialized_transactionContractCall,
	transactionContractCallWithSecondSignature as Deserialized_transactionContractCallWithSecondSignature,
	transactionDeploy as Deserialized_transactionDeploy,
	transactionTransfer as Deserialized_transactionTransfer,
} from "./transactions.js";

const block = {
	blockHash: "0x0000000000000000000000000000000000000000000000000000000000000000",
	blockNumber: 0,
};

const convertToStorageData = (
	transaction: Contracts.Crypto.TransactionData,
): Contracts.Crypto.TransactionStorageDataExtended => ({
	...transaction,
	data: Buffer.from(transaction.data.slice(2), "hex"),
	gasLimit: BigInt(transaction.gasLimit),
	gasPrice: BigInt(transaction.gasPrice),
	index: 0,
	nonce: transaction.nonce.toBigInt(),
	txHash: transaction.hash,
	value: transaction.value.toBigInt(),
	...block,
});

export const transactionTransfer = convertToStorageData(Deserialized_transactionTransfer);

export const transactionContractCall = convertToStorageData(Deserialized_transactionContractCall);

export const transactionContractCallWithSecondSignature = convertToStorageData(
	Deserialized_transactionContractCallWithSecondSignature,
);

export const transactionDeploy = convertToStorageData(Deserialized_transactionDeploy);
