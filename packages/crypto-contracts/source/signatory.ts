export interface Signatory {
	sign(hash: Buffer, privateKey: Buffer): Promise<string>;

	verify(hash: Buffer, signature: Buffer, publicKey: Buffer): Promise<boolean>;
}
