export const assertMessage = (assert, data1, data2) => {
	const fields = ["blockNumber", "round", "blockHash", "validatorIndex", "signature"];
	for (const field of fields) {
		const v1 = data1[field];
		const v2 = data2[field];
		if (field === "blockHash" && (v1 === undefined || v2 === undefined)) {
			assert.equal(v1, v2);
			continue;
		}

		assert.equal(v1.toString(), v2.toString());
	}
};
