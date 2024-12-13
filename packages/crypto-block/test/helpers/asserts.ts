export const assertBlockData = (assert, data1, data2) => {
	const blockFields = [
		"id",
		"timestamp",
		"version",
		"height",
		"previousBlock",
		"numberOfTransactions",
		"totalGasUsed",
		"totalAmount",
		"totalFee",
		"reward",
		"payloadLength",
		"payloadHash",
		"generatorAddress",
	];
	for (const field of blockFields) {
		assert.equal(data1[field].toString(), data2[field].toString());
	}
};

export const assertTransactionData = (assert, transactionData1, transactionData2) => {
	// console.log(transactionData1);
	// console.log(transactionData2);

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
		// console.log(field);
		// console.log(transactionData1[field], transactionData2[field]);

		assert.equal(transactionData1[field].toString(), transactionData2[field].toString());
	}
};
