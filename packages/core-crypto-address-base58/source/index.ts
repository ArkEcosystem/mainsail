import { Container } from "@arkecosystem/container";
import {
	AddressFactory as Contract,
	BINDINGS,
	IConfiguration,
	IKeyPairFactory,
} from "@arkecosystem/core-crypto-contracts";
import { RIPEMD160, SHA256 } from "bcrypto";
import { base58 } from "bstring";

@Container.injectable()
export class AddressFactory implements Contract {
	@Container.inject(BINDINGS.Configuration)
	private readonly configuration: IConfiguration;

	@Container.inject(BINDINGS.Identity.KeyPairFactory)
	private readonly keyPairFactory: IKeyPairFactory;

	public async fromMnemonic(passphrase: string): Promise<string> {
		return this.fromPublicKey(Buffer.from((await this.keyPairFactory.fromMnemonic(passphrase)).publicKey, "hex"));
	}

	public async fromPublicKey(publicKey: Buffer): Promise<string> {
		const buffer: Buffer = RIPEMD160.digest(publicKey);
		const payload: Buffer = Buffer.alloc(21);

		payload.writeUInt8(this.configuration.get("network.address.base58"), 0);
		buffer.copy(payload, 1);

		return this.#encodeCheck(payload);
	}

	public async validate(address: string): Promise<boolean> {
		try {
			return this.#decodeCheck(address)[0] === this.configuration.get("network.address.base58");
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
