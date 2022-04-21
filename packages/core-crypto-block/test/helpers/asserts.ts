export const assertBlockData = (assert, data1, data2) => {
	const blockFields = [
		"id",
		"timestamp",
		"version",
		"height",
		"previousBlock",
		"numberOfTransactions",
		"totalAmount",
		"totalFee",
		"reward",
		"payloadLength",
		"payloadHash",
		"generatorPublicKey",
		"blockSignature",
	];
	for (const field of blockFields) {
		assert.equal(data1[field].toString(), data2[field].toString());
	}
};

export const assertTransactionData = (assert, transactionData1, transactionData2) => {
	const transactionFields = ["id", "type", "senderPublicKey", "fee", "amount", "recipientId", "signature"];

	for (const field of transactionFields) {
		assert.equal(transactionData1[field].toString(), transactionData2[field].toString());
	}
};
