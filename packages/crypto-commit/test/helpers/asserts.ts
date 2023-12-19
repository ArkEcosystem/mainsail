export const assertCommitData = (assert, commitData1, commitData2) => {
	const fields = ["round", "signature", "validators"];

	for (const field of fields) {
		assert.equal(commitData1[field].toString(), commitData2[field].toString());
	}
};
