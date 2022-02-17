export interface IKeyPair {
    publicKey: string;
    privateKey: string;
    compressed: boolean;
}

export interface IKeyPairFactory {
    fromMnemonic(mnemonic: string, compressed?: boolean): IKeyPair;

    fromPrivateKey(privateKey: Buffer | string, compressed?: boolean): IKeyPair;
}
