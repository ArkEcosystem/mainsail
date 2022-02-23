export interface Signatory {
	sign(message: Buffer, privateKey: Buffer): Promise<string>;

	verify(signature: Buffer, message: Buffer, publicKey: Buffer): Promise<boolean>;
}
