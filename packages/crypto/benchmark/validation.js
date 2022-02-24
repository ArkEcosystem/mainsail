const { Validator } = require("../distribution/validation");

const iterations = 10000000;
const validator = Validator.make();

const blockHeader = require("./helpers").getJSONFixture("block/deserialized/no-transactions");
const block = require("./helpers").getJSONFixture("block/deserialized/transactions");

const times = (iterations, callback) => {
	for (let index = 0; index < iterations; index++) {
		callback();
	}
};

exports["ajv.address"] = () => {
	times(iterations, () =>
		validator.validate("address", [
			"123456789ABCDEFGHJKLMNPQRSTUVWXYZa",
			"123456789ABCDEFGHJKLMNPQRSTUVWXYZa",
			"123456789ABCDEFGHJKLMNPQRSTUVWXYZa",
		]),
	);
};

exports["ajv.alphanumeric"] = () => {
	times(iterations, () => validator.validate("alphanumeric", "12345678"));
};

exports["ajv.base58"] = () => {
	times(iterations, () => validator.validate("base58", "123456789"));
};

exports["ajv.blockHeader"] = () => {
	times(10000, () => validator.validate("blockHeader", blockHeader));
};

exports["ajv.block"] = () => {
	times(10000, () => validator.validate("block", block));
};

exports["ajv.genericName"] = () => {
	times(iterations, () => validator.validate("genericName", "123456789"));
};

exports["ajv.hex"] = () => {
	times(iterations, () => validator.validate("hex", "123456789"));
};

exports["ajv.publicKey"] = () => {
	times(iterations, () =>
		validator.validate("publicKey", "0123456789A0123456789A0123456789A0123456789A0123456789A0123456789A"),
	);
};

exports["ajv.transactionId"] = () => {
	times(iterations, () =>
		validator.validate("transactionId", "0123456789A0123456789A0123456789A0123456789A0123456789A012345678"),
	);
};

exports["ajv.uri"] = () => {
	times(iterations, () => validator.validate("uri", ["https://ark.io", "https://ark.dev"]));
};
