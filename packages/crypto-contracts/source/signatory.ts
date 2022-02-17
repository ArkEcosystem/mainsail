export interface Signatory {
	sign(hash: Buffer, privateKey: Buffer): Promise<string>;

	verify(hash: Buffer, signature: Buffer | string, publicKey: Buffer | string): Promise<boolean>;
}
