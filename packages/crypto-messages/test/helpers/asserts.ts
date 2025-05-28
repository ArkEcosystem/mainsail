const assertPrecommitOrPrevote = (assert, data1, data2) => {
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

export const assertProposal = (assert, data1, data2) => {
	const fields = ["round", "data", "validatorIndex", "signature"];
	for (const field of fields) {
		assert.equal(data1[field].toString(), data2[field].toString());
	}
};

export const assertProposedData = (assert, data1, data2) => {
	assert.true(deepEqual(data1, data2));
};

export const assertPrecommit = (assert, data1, data2) => {
	assertPrecommitOrPrevote(assert, data1, data2);
};

export const assertPrevote = (assert, data1, data2) => {
	assertPrecommitOrPrevote(assert, data1, data2);
};

function deepEqual(obj1, obj2) {
	if (obj1 === obj2) {
		return true;
	}

	const keys = new Set([...Object.keys(obj1), ...Object.keys(obj2)]);
	for (const key of keys) {
		const val1 = obj1.hasOwnProperty(key) ? obj1[key] : undefined;
		const val2 = obj2.hasOwnProperty(key) ? obj2[key] : undefined;

		if (!deepEqual(val1, val2)) {
			return false;
		}
	}

	return true;
}
