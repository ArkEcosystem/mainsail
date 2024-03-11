import { ByteBuffer } from "@mainsail/utils";

import type { MultiSignatureAsset } from "./transactions.js";

export interface KeyPair {
	publicKey: string;
	privateKey: string;
	compressed: boolean;
}

export interface AddressFactory {
	fromMnemonic(mnemonic: string): Promise<string>;

	fromPublicKey(publicKey: string): Promise<string>;

	fromWIF(wif: string): Promise<string>;

	fromMultiSignatureAsset(asset: MultiSignatureAsset): Promise<string>;

	fromPrivateKey(privateKey: KeyPair): Promise<string>;

	fromBuffer(buffer: Buffer): Promise<string>;

	toBuffer(address: string): Promise<Buffer>;

	validate(address: string): Promise<boolean>;
}

export interface PublicKeyFactory {
	fromMnemonic(mnemonic: string): Promise<string>;

	fromWIF(wif: string): Promise<string>;

	fromMultiSignatureAsset(asset: MultiSignatureAsset): Promise<string>;

	verify(publicKey: string): Promise<boolean>;

	aggregate(publicKeys: Buffer[]): Promise<string>;
}

export interface PrivateKeyFactory {
	fromMnemonic(mnemonic: string): Promise<string>;

	fromWIF(wif: string): Promise<string>;
}

export interface KeyPairFactory {
	fromMnemonic(mnemonic: string): Promise<KeyPair>;

	fromPrivateKey(privateKey: Buffer): Promise<KeyPair>;

	fromWIF(wif: string): Promise<KeyPair>;
}

export interface WIFFactory {
	fromMnemonic(mnemonic: string): Promise<string>;

	fromKeys(keys: KeyPair): Promise<string>;
}

export interface AddressSerializer {
	serialize(buffer: ByteBuffer, address: Buffer): void;

	deserialize(buffer: ByteBuffer): Buffer;
}

export interface PublicKeySerializer {
	serialize(buffer: ByteBuffer, publicKey: string): void;

	deserialize(buffer: ByteBuffer): Buffer;
}

export interface Signature {
	sign(message: Buffer, privateKey: Buffer): Promise<string>;

	verify(signature: Buffer, message: Buffer, publicKey: Buffer): Promise<boolean>;

	serialize(buffer: ByteBuffer, signature: string): void;

	deserialize(buffer: ByteBuffer): Buffer;

	aggregate(signatures: Buffer[]): Promise<string>;
}
