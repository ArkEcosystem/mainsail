import assert from "assert";
import { injectable } from "@mainsail/container";
import { Contracts, Exceptions } from "@mainsail/contracts";
import { Hash256, Hash160, secp256k1 } from "bcrypto";
import { base58 } from "bstring";
import crypto from "crypto";

/**
* Based on: https://github.com/bitcoinjs/bip38 @ 8e3a2cc6f7391782f3012129924a73bb632a3d4d
*/
//
const SCRYPT_PARAMS = {
	N: 16384, // specified by BIP38
	r: 8,
	p: 8,
};
const NULL = Buffer.alloc(0);

@injectable()
export class BIP38 implements Contracts.Crypto.BIP38 {

	public verify(bip38: string): boolean {
		let decoded: Buffer;
		try {
			decoded = this.decodeCheck(bip38);
		} catch {
			return false;
		}

		if (!decoded) {
			return false;
		}

		if (decoded.length !== 39) {
			return false;
		}
		if (decoded.readUInt8(0) !== 0x01) {
			return false;
		}

		const type = decoded.readUInt8(1);
		const flag = decoded.readUInt8(2);

		// encrypted WIF
		if (type === 0x42) {
			if (flag !== 0xc0 && flag !== 0xe0) {
				return false;
			}

			// EC mult
		} else if (type === 0x43) {
			if (flag & ~0x24) {
				return false;
			}
		} else {
			return false;
		}

		return true;
	}

	public encrypt(privateKey: Buffer, compressed: boolean, passphrase: string): string {
		return this.#encodeCheck(this.#encryptRaw(privateKey, compressed, passphrase));

	}
	public decrypt(bip38: string, passphrase: string): Contracts.Crypto.DecryptResult {
		return this.#decryptRaw(this.decodeCheck(bip38), passphrase);
	}

	// some of the techniques borrowed from: https://github.com/pointbiz/bitaddress.org
	#decryptRaw(buff: Buffer, passphrase: string): Contracts.Crypto.DecryptResult {
		// 39 bytes: 2 bytes prefix, 37 bytes payload
		if (buff.length !== 39) {
			throw new Exceptions.Bip38LengthError(39, buff.length);
		}
		if (buff.readUInt8(0) !== 0x01) {
			throw new Exceptions.Bip38PrefixError(0x01, buff.readUInt8(0));
		}

		// check if BIP38 EC multiply
		const type = buff.readUInt8(1);
		if (type === 0x43) {
			return this.#decryptECMult(buff, passphrase);
		}
		if (type !== 0x42) {
			throw new Exceptions.Bip38TypeError(0x42, type);
		}

		const flagByte = buff.readUInt8(2);
		const compressed = flagByte === 0xe0;
		if (!compressed && flagByte !== 0xc0) {
			throw new Exceptions.Bip38CompressionError(0xc0, flagByte);
		}

		const salt = buff.subarray(3, 7);
		const scryptBuf = crypto.scryptSync(passphrase, salt, 64, SCRYPT_PARAMS);
		const derivedHalf1 = scryptBuf.subarray(0, 32);
		const derivedHalf2 = scryptBuf.subarray(32, 64);

		const privKeyBuf = buff.subarray(7, 7 + 32);
		const decipher = crypto.createDecipheriv("aes-256-ecb", derivedHalf2, NULL);
		decipher.setAutoPadding(false);
		decipher.end(privKeyBuf);

		const plainText = decipher.read();
		const privateKey = this.#xorInplace(derivedHalf1, plainText);

		// verify salt matches address
		const address = this.#getAddressPrivate(privateKey, compressed);

		const checksum = Hash256.digest(address).slice(0, 4);
		assert.deepEqual(salt, checksum);

		return {
			privateKey,
			compressed,
		};
	};

	#decryptECMult(buff: Buffer, passphrase: string): Contracts.Crypto.DecryptResult {
		buff = buff.subarray(1);

		const flag = buff.readUInt8(1);

		const compressed = (flag & 0x20) !== 0;
		const hasLotSeq = (flag & 0x04) !== 0;

		assert.strictEqual(flag & 0x24, flag, "Invalid private key.");

		const addressHash = buff.subarray(2, 6);
		const ownerEntropy = buff.subarray(6, 14);
		let ownerSalt: Buffer;

		// 4 bytes ownerSalt if 4 bytes lot/sequence
		if (hasLotSeq) {
			ownerSalt = ownerEntropy.subarray(0, 4);

			// else, 8 bytes ownerSalt
		} else {
			ownerSalt = ownerEntropy;
		}

		const encryptedPart1 = buff.subarray(14, 22); // First 8 bytes
		const encryptedPart2 = buff.subarray(22, 38); // 16 bytes

		const preFactor = crypto.scryptSync(passphrase, ownerSalt, 32, SCRYPT_PARAMS);

		let passFactor;
		if (hasLotSeq) {
			const hashTarget = Buffer.concat([preFactor, ownerEntropy]);
			passFactor = Hash256.digest(hashTarget);
		} else {
			passFactor = preFactor;
		}

		const publicKey = this.#getPublicKey(passFactor, true);
		const seedBPass = crypto.scryptSync(publicKey, Buffer.concat([addressHash, ownerEntropy]), 64, {
			N: 1024,
			r: 1,
			p: 1,
		});
		const derivedHalf1 = seedBPass.subarray(0, 32);
		const derivedHalf2 = seedBPass.subarray(32, 64);


		const decipher = crypto.createDecipheriv("aes-256-ecb", derivedHalf2, Buffer.alloc(0));
		decipher.setAutoPadding(false);
		decipher.end(encryptedPart2);

		const decryptedPart2 = decipher.read();
		const tmp = this.#xorInplace(decryptedPart2, derivedHalf1.subarray(16, 32));
		const seedBPart2 = tmp.subarray(8, 16);

		const decipher2 = crypto.createDecipheriv("aes-256-ecb", derivedHalf2, Buffer.alloc(0));
		decipher2.setAutoPadding(false);
		decipher2.write(encryptedPart1); // first 8 bytes
		decipher2.end(tmp.subarray(0, 8)); // last 8 bytes

		const seedBPart1 = this.#xorInplace(decipher2.read(), derivedHalf1.subarray(0, 16));
		const seedB = Buffer.concat([seedBPart1, seedBPart2], 24);
		const privateKey = secp256k1.privateKeyTweakMul(Hash256.digest(seedB), passFactor);

		return {
			privateKey,
			compressed,
		};
	};

	#encryptRaw(buff: Buffer, compressed: boolean, passphrase: string): Buffer {
		if (buff.length !== 32) {
			throw new Exceptions.PrivateKeyLengthError(32, buff.length);
		}

		const address = this.#getAddressPrivate(buff, compressed);

		const secret = Buffer.from(passphrase, "utf8");
		const salt = Hash256.digest(address).slice(0, 4);

		const scryptBuf = crypto.scryptSync(secret, salt, 64, SCRYPT_PARAMS);
		const derivedHalf1 = scryptBuf.subarray(0, 32);
		const derivedHalf2 = scryptBuf.subarray(32, 64);

		const xorBuf = this.#xorInplace(derivedHalf1, buff);
		const cipher = crypto.createCipheriv("aes-256-ecb", derivedHalf2, NULL);
		cipher.setAutoPadding(false);
		cipher.end(xorBuf);

		const cipherText = cipher.read();

		// 0x01 | 0x42 | flagByte | salt (4) | cipherText (32)
		const result = Buffer.allocUnsafe(7 + 32);
		result.writeUInt8(0x01, 0);
		result.writeUInt8(0x42, 1);
		result.writeUInt8(compressed ? 0xe0 : 0xc0, 2);
		salt.copy(result, 3);
		cipherText.copy(result, 7);

		return result;
	};

	#xorInplace(a: Buffer, b: Buffer): Buffer {
		const length = Math.min(a.length, b.length)

		for (let i = 0; i < length; ++i) {
			a[i] = a[i] ^ b[i];
		}

		return a
	}

	#getPublicKey(buff: Buffer, compressed: boolean): Buffer {
		return secp256k1.publicKeyCreate(buff, compressed);
	};

	#getAddressPrivate(privateKey: Buffer, compressed: boolean): Buffer {
		const publicKey = this.#getPublicKey(privateKey, compressed);
		const buff = Hash160.digest(publicKey);
		const payload = Buffer.alloc(21);

		payload.writeUInt8(0x00, 0);
		buff.copy(payload, 1);

		return Buffer.from(this.#encodeCheck(payload));
	};

	#encodeCheck(buffer: Buffer): string {
		const checksum = Hash256.digest(buffer);

		return base58.encode(Buffer.concat([buffer, checksum], buffer.length + 4));
	}

	decodeCheck(address: string): Buffer {
		const buffer: Buffer = base58.decode(address);
		const payload: Buffer = buffer.subarray(0, -4);
		const checksum: Buffer = Hash256.digest(payload);

		if (checksum.readUInt32LE(0) !== buffer.subarray(-4).readUInt32LE(0)) {
			throw new Error("Invalid checksum for base58 string.");
		}

		return payload;
	}
}
