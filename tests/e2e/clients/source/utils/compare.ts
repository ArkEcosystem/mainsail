export const compareBlocks = (assert, a: Record<string, any>, b: Record<string, any>) => {
	// Numeric fields
	for (const field of [
		"number",
		"nonce",
		"difficulty",
		// "totalDifficulty",
		// "baseFeePerGas",
		// "size",
		"gasLimit",
		"gasUsed",
		"timestamp",
	]) {
		assert.equal(Number(a[field]), Number(b[field]));
	}

	// Hex fields
	for (const field of [
		"hash",
		"parentHash",
		// "sha3Uncles",
		// "transactionsRoot",
		"stateRoot",
		"receiptsRoot",
		"miner",
		"extraData",
	]) {
		assert.equal(a[field].toLowerCase(), b[field].toLowerCase());
	}
};

export const compareTransactions = (assert, a: Record<string, any>, b: Record<string, any>) => {
	// Numeric fields
	for (const field of [
		"blockNumber",
		"chainId",
		// "gas",
		"gasPrice",
		"maxPriorityFeePerGas",
		"maxFeePerGas",
		"nonce",
		// "transactionIndex",
		"value",
		// "type",
	]) {
		assert.equal(Number(a[field]), Number(b[field]));
	}

	// Hex fields
	for (const field of [
		"blockHash",
		"from",
		"hash",
		// "input",
		"to",
		// "v",
		// "r",
		// "s",
	]) {
		assert.equal(a[field].toLowerCase(), b[field].toLowerCase());
	}
};

export const compareReceipts = (assert, a: Record<string, any>, b: Record<string, any>) => {
	// Numeric fields
	for (const field of [
		// "transactionIndex",
		"blockHash",
		"blockNumber",
		"gasUsed",
		"cumulativeGasUsed",
		"gasUsed",
		// "type",
		// "status",
	]) {
		assert.equal(Number(a[field]), Number(b[field]));
	}

	// Hex fields
	for (const field of [
		// "transactionHash",
		"logsBloom",
		"from",
		"to",
	]) {
		assert.equal(a[field].toLowerCase(), b[field].toLowerCase());
	}
};
