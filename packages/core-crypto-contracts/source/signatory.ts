import ByteBuffer from "bytebuffer";

export interface ISignature {
	sign(message: Buffer, privateKey: Buffer): Promise<string>;

	verify(signature: Buffer, message: Buffer, publicKey: Buffer): Promise<boolean>;

	serialize(buffer: ByteBuffer, signature: string): void;

	deserialize(buffer: ByteBuffer): string;
}
