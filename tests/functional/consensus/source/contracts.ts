export type ValidatorsJson = {
	secrets: string[];
};

export type Validator = {
	mnemonic: string;
	address: string;
	publicKey: string;
	privateKey: string;
	consensusPublicKey: string;
	consensusPrivateKey: string;
};
