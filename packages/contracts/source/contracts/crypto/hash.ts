export type HashInput = Buffer | Buffer[];

export interface IHashFactory {
	ripemd160(data: HashInput): Promise<Buffer>;

	sha256(data: HashInput): Promise<Buffer>;

	hash256(data: HashInput): Promise<Buffer>;
}
