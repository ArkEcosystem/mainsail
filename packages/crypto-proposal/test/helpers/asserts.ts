function deepEqual(object1, object2) {
	if (object1 === object2) {
		return true;
	}

	if (typeof object1 !== "object" || typeof object2 !== "object") {
		return false;
	}

	const keys = new Set([...Object.keys(object1), ...Object.keys(object2)]);
	for (const key of keys) {
		const value1 = object1.hasOwnProperty(key) ? object1[key] : undefined;
		const value2 = object2.hasOwnProperty(key) ? object2[key] : undefined;

		if (!deepEqual(value1, value2)) {
			return false;
		}
	}

	return true;
}

export const assertProposal = (assert, data1, data2) => {
	const fields = ["round", "data", "validatorIndex", "signature"];
	for (const field of fields) {
		assert.equal(data1[field].toString(), data2[field].toString());
	}
};

export const assertProposedData = (assert, data1, data2) => {
	assert.true(deepEqual(data1, data2));
};
