export interface IKeyPair {
	publicKey: string;
	privateKey: string;
	compressed: boolean;
}

export interface AddressFactory {
	fromMnemonic(passphrase: string): Promise<string>;

	fromPublicKey(publicKey: Buffer): Promise<string>;

	// fromWIF(wif: string, network?: Network): string;

	// fromMultiSignatureAsset(asset: IMultiSignatureAsset): string;

	// fromPrivateKey(privateKey: IKeyPair): string;

	validate(address: string): Promise<boolean>;
}

export interface IKeyPairFactory {
	fromMnemonic(mnemonic: string, compressed?: boolean): Promise<IKeyPair>;

	fromPrivateKey(privateKey: Buffer, compressed?: boolean): Promise<IKeyPair>;
}
