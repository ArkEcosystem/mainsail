export const assertBlockData = (assert, data1, data2) => {
	const blockFields = [
		"hash",
		"timestamp",
		"version",
		"number",
		"parentHash",
		"transactionsCount",
		"gasUsed",
		"amount",
		"fee",
		"reward",
		"payloadSize",
		"transactionsRoot",
		"proposer",
	];
	for (const field of blockFields) {
		assert.equal(data1[field].toString(), data2[field].toString());
	}
};

export const assertTransactionData = (assert, transactionData1, transactionData2) => {
	const transactionFields = [
		"id",
		"senderPublicKey",
		"senderAddress",
		"gasPrice",
		"gasLimit",
		"network",
		"value",
		"recipientAddress",
		"v",
		"r",
		"s",
	];

	for (const field of transactionFields) {
		assert.equal(transactionData1[field].toString(), transactionData2[field].toString());
	}
};
