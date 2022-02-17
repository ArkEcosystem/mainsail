export interface IKeyPair {
	publicKey: string;
	privateKey: string;
	compressed: boolean;
}

// @TODO: handle network configuration in concrete implementations
export interface AddressFactory {
	fromMnemonic(passphrase: string): string;

	fromPublicKey(publicKey: string): string;

	// fromWIF(wif: string, network?: Network): string;

	// fromMultiSignatureAsset(asset: IMultiSignatureAsset): string;

	// fromPrivateKey(privateKey: IKeyPair): string;

	validate(address: string): boolean;
}

export interface IKeyPairFactory {
	fromMnemonic(mnemonic: string, compressed?: boolean): IKeyPair;

	fromPrivateKey(privateKey: Buffer | string, compressed?: boolean): IKeyPair;
}
