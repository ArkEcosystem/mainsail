/* eslint-disable @typescript-eslint/explicit-member-accessibility */
import { AddressFactory as Contract, IKeyPairFactory } from "@arkecosystem/crypto-contracts";
import { RIPEMD160, SHA256 } from "bcrypto";
import { base58 } from "bstring";

export class AddressFactory implements Contract {
	readonly #network: any;
	readonly #keyPairFactory: IKeyPairFactory;

	// @TODO: network type once final structure is known
	public constructor(network: any, keyPairFactory: IKeyPairFactory) {
		this.#network = network;
		this.#keyPairFactory = keyPairFactory;
	}

	public async fromMnemonic(passphrase: string): Promise<string> {
		return this.fromPublicKey(Buffer.from((await this.#keyPairFactory.fromMnemonic(passphrase)).publicKey, "hex"));
	}

	public async fromPublicKey(publicKey: Buffer): Promise<string> {
		const buffer: Buffer = RIPEMD160.digest(publicKey);
		const payload: Buffer = Buffer.alloc(21);

		payload.writeUInt8(this.#network.pubKeyHash, 0);
		buffer.copy(payload, 1);

		return this.#encodeCheck(payload);
	}

	public async validate(address: string): Promise<boolean> {
		try {
			return this.#decodeCheck(address)[0] === this.#network.pubKeyHash;
		} catch {
			return false;
		}
	}

	#encodeCheck(buffer: Buffer): string {
		const checksum: Buffer = SHA256.digest(buffer);

		return base58.encode(Buffer.concat([buffer, checksum], buffer.length + 4));
	}

	#decodeCheck(address: string): Buffer {
		const buffer: Buffer = base58.decode(address);
		const payload: Buffer = buffer.slice(0, -4);
		const checksum: Buffer = SHA256.digest(payload);

		if (checksum.readUInt32LE(0) !== buffer.slice(-4).readUInt32LE(0)) {
			throw new Error("Invalid checksum for base58 string.");
		}

		return payload;
	}
}
