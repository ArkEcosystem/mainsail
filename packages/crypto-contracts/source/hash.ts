export type HashInput = Buffer | Buffer[];

export interface IHashFactory {
	ripemd160(data: Buffer): Promise<Buffer>;

	sha256(data: Buffer): Promise<Buffer>;

	hash256(data: Buffer): Promise<Buffer>;
}
