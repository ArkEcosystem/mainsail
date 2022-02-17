import { Base58 } from "./base58";
import { KeyPair, MultiSignatureAsset } from "./contracts";
import { PublicKeyError } from "./errors";
import { HashAlgorithms } from "./hash-algorithms";
import { PublicKey } from "./public-key";

export class Address {
	public static fromPassphrase(passphrase: string, options: { pubKeyHash: number }): string {
		return Address.fromPublicKey(PublicKey.fromPassphrase(passphrase), options);
	}

	public static fromPublicKey(publicKey: string, options: { pubKeyHash: number }): string {
		if (!PublicKey.verify(publicKey)) {
			throw new PublicKeyError(publicKey);
		}

		const buffer: Buffer = HashAlgorithms.ripemd160(Buffer.from(publicKey, "hex"));
		const payload: Buffer = Buffer.alloc(21);

		payload.writeUInt8(options.pubKeyHash, 0);
		buffer.copy(payload, 1);

		return this.fromBuffer(payload);
	}

	public static fromWIF(wif: string, options: { pubKeyHash: number; wif: number }): string {
		return Address.fromPublicKey(PublicKey.fromWIF(wif, options), options);
	}

	public static fromMultiSignatureAsset(asset: MultiSignatureAsset, options: { pubKeyHash: number }): string {
		return this.fromPublicKey(PublicKey.fromMultiSignatureAsset(asset), options);
	}

	public static fromPrivateKey(privateKey: KeyPair, options: { pubKeyHash: number }): string {
		return Address.fromPublicKey(privateKey.publicKey, options);
	}

	public static fromBuffer(buffer: Buffer): string {
		return Base58.encodeCheck(buffer);
	}

	public static toBuffer(
		address: string,
		options: { pubKeyHash: number },
	): { addressBuffer: Buffer; addressError?: string } {
		const buffer: Buffer = Base58.decodeCheck(address);
		const result: { addressBuffer: Buffer; addressError?: string } = {
			addressBuffer: buffer,
		};

		if (buffer[0] !== options.pubKeyHash) {
			result.addressError = `Expected address network byte ${options.pubKeyHash}, but got ${buffer[0]}.`;
		}

		return result;
	}

	public static validate(address: string, options: { pubKeyHash: number }): boolean {
		try {
			return Base58.decodeCheck(address)[0] === options.pubKeyHash;
		} catch {
			return false;
		}
	}
}
