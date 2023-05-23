export const assertProposal = (assert, data1, data2) => {
    const fields = [
        "height",
        "round",
        // "block", TODO
        "validatorPublicKey",
        "signature",
    ];
    for (const field of fields) {
        assert.equal(data1[field].toString(), data2[field].toString());
    }
};

export const assertPrecommit = (assert, data1, data2) => {
    const fields = [
        "height",
        "round",
        "blockId",
        "validatorPublicKey",
        "signature",
    ];
    for (const field of fields) {
        assert.equal(data1[field].toString(), data2[field].toString());
    }
};

export const assertPrevote = (assert, data1, data2) => {
    const fields = [
        "height",
        "round",
        "blockId",
        "validatorPublicKey",
        "signature",
    ];
    for (const field of fields) {
        assert.equal(data1[field].toString(), data2[field].toString());
    }
};
