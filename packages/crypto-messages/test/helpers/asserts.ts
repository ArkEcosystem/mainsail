export const assertProposal = (assert, data1, data2) => {
	const fields = [
		"height",
		"round",
		// "block", TODO
		"validatorIndex",
		"signature",
	];
	for (const field of fields) {
		assert.equal(data1[field].toString(), data2[field].toString());
	}
};

export const assertPrecommit = (assert, data1, data2) => {
	assertPrecommitOrPrevote(assert, data1, data2);
};

export const assertPrevote = (assert, data1, data2) => {
	assertPrecommitOrPrevote(assert, data1, data2);
};

const assertPrecommitOrPrevote = (assert, data1, data2) => {
	const fields = ["height", "round", "blockId", "validatorIndex", "signature"];
	for (const field of fields) {
		let v1 = data1[field];
		let v2 = data2[field];
		if (field === "blockId") {
			v1 = v1 || "0000000000000000000000000000000000000000000000000000000000000000";
			v2 = v2 || "0000000000000000000000000000000000000000000000000000000000000000";
		}

		assert.equal(v1.toString(), v2.toString());
	}
};
