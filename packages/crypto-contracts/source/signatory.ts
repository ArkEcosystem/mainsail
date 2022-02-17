export interface Signatory {
	sign(hash: Buffer, privateKey: Buffer): string;

	verify(hash: Buffer, signature: Buffer | string, publicKey: Buffer | string): boolean;
}
