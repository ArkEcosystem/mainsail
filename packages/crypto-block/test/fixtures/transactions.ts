import type { Contracts } from "@mainsail/contracts";
import { BigNumber } from "@mainsail/utils";

const convertToTransactionJson = (data: Contracts.Crypto.TransactionData): Contracts.Crypto.TransactionJson => ({
	data: data.data,
	from: data.from,
	gasLimit: data.gasLimit,
	gasPrice: data.gasPrice,
	legacySecondSignature: data.legacySecondSignature,
	network: data.network,
	nonce: data.nonce.toString(),
	r: data.r,
	s: data.s,
	senderPublicKey: data.senderPublicKey,
	to: data.to,
	v: data.v,
	value: data.value.toString(),
});

const convertToStorage = (
	data: Contracts.Crypto.TransactionData,
	index: number,
): Contracts.Evm.TransactionStorageData => ({
	blockNumber: 2,
	data: Buffer.from(data.data.slice(2), "hex"),
	from: data.from,
	gasLimit: BigInt(data.gasLimit),
	gasPrice: BigInt(data.gasPrice),
	index,
	legacySecondSignature: data.legacySecondSignature,
	nonce: BigInt(data.nonce.toString()),
	r: data.r,
	s: data.s,
	senderPublicKey: data.senderPublicKey,
	to: data.to,
	txHash: data.hash,
	v: data.v,
	value: BigInt(data.value.toString()),
});

export const transaction1Data: Contracts.Crypto.TransactionData = {
	data: "0x",
	from: "0xE33074cBE63A1f86cc8EAb97b2099732F15284fE",
	gasLimit: 1_000_000,
	gasPrice: 5_000_000_000,
	hash: "65d43d2bed464b6bb1df8d6c0136316d3a3559569904fb16d5e3a8d71ebc2ebc",
	network: 10_000,
	nonce: BigNumber.ZERO,
	r: "921101a4583fb153ec00e501f3c2e2636114e1c8c58d2df8a19426cc066a6768",
	s: "22db4bce1e0ace485ce0838d178b4d5bcfa9f69b315a14c580d9b01e5c980bdd",
	senderLegacyAddress: "DUQKzkR4BP5UcWayJMpRXtpEXuw4zPbWhe",
	senderPublicKey: "02daa6f404dbd49c9c74a3d88d65b967a9b51d3465c92833e8e2ede11e7242f014",
	to: "0xBe89811e15f611C1db12e59679b6F3DC1F430155",
	v: 0,
	value: BigNumber.ZERO,
};

export const transaction1Json: Contracts.Crypto.TransactionJson = convertToTransactionJson(transaction1Data);

export const transaction2Data: Contracts.Crypto.TransactionData = {
	data: "0x",
	from: "0x8ae872F64bA0731f66F847f4e8Fc0796dF0bCc08",
	gasLimit: 1_000_000,
	gasPrice: 5_000_000_000,
	hash: "7a74379424e07173c137dd89c29f497b35d8013815b03096b51e67f87c453574",
	network: 10_000,
	nonce: BigNumber.ONE,
	r: "6c9842bc78c2f68468cbf8a8f3fec0ae2679707ffb606a4b373dd01a02af55fc",
	s: "1a4c4d984d750678fb204ce8b7e97d860c974ac1a423f098dc4921acd2be0c7d",
	senderLegacyAddress: "DQJTK7of6bPUfJEuL9gUV4qnUyq72eskKe",
	senderPublicKey: "03043bfdf530d59e919323a33d0c8f5ca43f6b50dfe753c9b3e987a4a5233a2a15",
	to: "0xBe89811e15f611C1db12e59679b6F3DC1F430155",
	v: 0,
	value: BigNumber.ZERO,
};

export const transactionsData = [transaction1Data, transaction2Data];

export const transactionsFromStorage = [convertToStorage(transaction1Data, 0), convertToStorage(transaction2Data, 1)];

export const transaction2Json: Contracts.Crypto.TransactionJson = convertToTransactionJson(transaction2Data);
