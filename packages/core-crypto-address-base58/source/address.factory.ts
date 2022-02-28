import { Container } from "@arkecosystem/core-container";
import {
	BINDINGS,
	IAddressFactory,
	IConfiguration,
	IKeyPair,
	IKeyPairFactory,
	IMultiSignatureAsset,
	IPublicKeyFactory,
} from "@arkecosystem/core-crypto-contracts";
import { RIPEMD160, SHA256 } from "bcrypto";
import { base58 } from "bstring";

@Container.injectable()
export class AddressFactory implements IAddressFactory {
	@Container.inject(BINDINGS.Configuration)
	private readonly configuration: IConfiguration;

	@Container.inject(BINDINGS.Identity.KeyPairFactory)
	private readonly keyPairFactory: IKeyPairFactory;

	@Container.inject(BINDINGS.Identity.PublicKeyFactory)
	private readonly publicKeyFactory: IPublicKeyFactory;

	public async fromMnemonic(passphrase: string): Promise<string> {
		return this.fromPublicKey((await this.keyPairFactory.fromMnemonic(passphrase)).publicKey);
	}

	public async fromPublicKey(publicKey: string): Promise<string> {
		const buffer: Buffer = RIPEMD160.digest(Buffer.from(publicKey, "hex"));
		const payload: Buffer = Buffer.alloc(21);

		payload.writeUInt8(this.configuration.get("network.address.base58"), 0);
		buffer.copy(payload, 1);

		return this.#encodeCheck(payload);
	}

	public async fromWIF(wif: string): Promise<string> {
		return this.fromPublicKey(await this.publicKeyFactory.fromWIF(wif));
	}

	public async fromMultiSignatureAsset(asset: IMultiSignatureAsset): Promise<string> {
		return this.fromPublicKey(await this.publicKeyFactory.fromMultiSignatureAsset(asset));
	}

	public async fromPrivateKey(privateKey: IKeyPair): Promise<string> {
		return this.fromPublicKey(privateKey.publicKey);
	}

	public async fromBuffer(buffer: Buffer): Promise<string> {
		return base58.encodeCheck(buffer);
	}

	public async toBuffer(address: string): Promise<{
		addressBuffer: Buffer;
		addressError?: string;
	}> {
		const buffer: Buffer = base58.decodeCheck(address);
		const result: { addressBuffer: Buffer; addressError?: string } = {
			addressBuffer: buffer,
		};

		const pubKeyHash = this.configuration.get("network.address.base58");

		if (buffer[0] !== pubKeyHash) {
			result.addressError = `Expected address network byte ${pubKeyHash}, but got ${buffer[0]}.`;
		}

		return result;
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
