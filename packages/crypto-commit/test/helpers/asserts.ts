export const assertCommitProofData = (assert, commitData1, commitData2) => {
	const fields = ["round", "signature", "validators"];

	for (const field of fields) {
		assert.equal(commitData1[field].toString(), commitData2[field].toString());
	}
};

export const assertBlockData = (assert, data1, data2) => {
	const blockFields = [
		"hash",
		"timestamp",
		"version",
		"number",
		"parentHash",
		"transactionsCount",
		"gasUsed",
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
