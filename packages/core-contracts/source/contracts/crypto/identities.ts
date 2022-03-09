import ByteBuffer from "bytebuffer";

import { IMultiSignatureAsset } from "./transactions";

export interface IKeyPair {
	publicKey: string;
	privateKey: string;
	compressed: boolean;
}

export interface IAddressFactory {
	fromMnemonic(mnemonic: string): Promise<string>;

	fromPublicKey(publicKey: string): Promise<string>;

	fromWIF(wif: string): Promise<string>;

	fromMultiSignatureAsset(asset: IMultiSignatureAsset): Promise<string>;

	fromPrivateKey(privateKey: IKeyPair): Promise<string>;

	fromBuffer(buffer: Buffer): Promise<string>;

	toBuffer(address: string): Promise<Buffer>;

	validate(address: string): Promise<boolean>;
}

export interface IPublicKeyFactory {
	fromMnemonic(mnemonic: string): Promise<string>;

	fromWIF(wif: string): Promise<string>;

	fromMultiSignatureAsset(asset: IMultiSignatureAsset): Promise<string>;

	verify(publicKey: string): Promise<boolean>;
}

export interface IPrivateKeyFactory {
	fromMnemonic(mnemonic: string): Promise<string>;

	fromWIF(wif: string): Promise<string>;
}

export interface IKeyPairFactory {
	fromMnemonic(mnemonic: string): Promise<IKeyPair>;

	fromPrivateKey(privateKey: Buffer): Promise<IKeyPair>;

	fromWIF(wif: string): Promise<IKeyPair>;
}

export interface IWIFFactory {
	fromMnemonic(mnemonic: string): Promise<string>;

	fromKeys(keys: IKeyPair): Promise<string>;
}

export interface IAddressSerializer {
	serialize(buffer: ByteBuffer, address: Buffer): void;

	deserialize(buffer: ByteBuffer): Buffer;
}

export interface IPublicKeySerializer {
	serialize(buffer: ByteBuffer, publicKey: string): void;

	deserialize(buffer: ByteBuffer): Buffer;
}

export interface ISignature {
	sign(message: Buffer, privateKey: Buffer): Promise<string>;

	verify(signature: Buffer, message: Buffer, publicKey: Buffer): Promise<boolean>;

	serialize(buffer: ByteBuffer, signature: string): void;

	deserialize(buffer: ByteBuffer): Buffer;
}
