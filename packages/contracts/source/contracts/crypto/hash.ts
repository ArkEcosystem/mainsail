export type HashInput = Buffer | Buffer[];

export interface HashFactory {
	ripemd160(data: HashInput): Buffer;

	sha256(data: HashInput): Buffer;

	hash256(data: HashInput): Buffer;

	keccak256(data: HashInput): Buffer;
}
