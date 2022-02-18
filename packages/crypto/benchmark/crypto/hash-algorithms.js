const createHash = require("create-hash");
const hashWASM = require("hash-wasm");
const { Crypto, Transactions, Utils } = require("../../distribution");

const nodeSha256 = (bytes) => createHash("sha256").update(bytes).digest();

const prepareData = (data) => {
	const bigNumbers = new Set(["fee", "amount", "nonce"]);

	for (const [key, value] of Object.entries(data)) {
		if (bigNumbers.has(key)) {
			data[key] = new Utils.BigNumber(value);
		}
	}

	return data;
};

const data = prepareData(require("../helpers").getJSONFixture("transaction/deserialized/0"));
const transactionBytes = Transactions.Utils.toBytes(data);

exports["bcrypto.sha256"] = () => {
	Crypto.HashAlgorithms.sha256(transactionBytes);
};

exports["node.sha256"] = () => {
	nodeSha256(transactionBytes);
};

exports["hash-wasm.sha256"] = async () => {
	await hashWASM.sha256(transactionBytes);
};

exports["noble.sha256"] = async () => {
	require("@noble/hashes/sha256").sha256(transactionBytes);
};

exports["bcrypto.ripemd160"] = () => {
	Crypto.HashAlgorithms.ripemd160(transactionBytes);
};

exports["node.ripemd160"] = () => {
	createHash("ripemd160").update(transactionBytes).digest();
};

exports["hash-wasm.ripemd160"] = async () => {
	await hashWASM.ripemd160(transactionBytes);
};

exports["noble.ripemd160"] = async () => {
	require("@noble/hashes/ripemd160").ripemd160(transactionBytes);
};

exports["bcrypto.hash160"] = () => {
	Crypto.HashAlgorithms.hash160(transactionBytes);
};

exports["node.hash160"] = () => {
	createHash("ripemd160").update(nodeSha256(transactionBytes)).digest();
};

exports["bcrypto.hash256"] = () => {
	Crypto.HashAlgorithms.hash256(transactionBytes);
};

exports["node.hash256"] = () => {
	nodeSha256(nodeSha256(transactionBytes));
};
