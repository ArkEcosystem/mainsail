import { Container } from "@arkecosystem/core-container";
import { Crypto, Identifiers } from "@arkecosystem/core-contracts";
import { bech32m } from "@scure/base";

@Container.injectable()
export class AddressFactory implements Crypto.IAddressFactory {
	@Container.inject(Identifiers.Cryptography.Configuration)
	private readonly configuration: Crypto.IConfiguration;

	@Container.inject(Identifiers.Cryptography.Identity.KeyPairFactory)
	private readonly keyPairFactory: Crypto.IKeyPairFactory;

	public async fromMnemonic(passphrase: string): Promise<string> {
		return this.fromPublicKey((await this.keyPairFactory.fromMnemonic(passphrase)).publicKey);
	}

	public async fromPublicKey(publicKey: string): Promise<string> {
		return bech32m.encode(
			this.configuration.get("network.address.bech32m"),
			bech32m.toWords(Buffer.from(publicKey, "hex")),
		);
	}

	public async fromWIF(wif: string): Promise<string> {
		return "";
	}

	public async fromMultiSignatureAsset(asset: Crypto.IMultiSignatureAsset): Promise<string> {
		return "";
	}

	public async fromPrivateKey(privateKey: Crypto.IKeyPair): Promise<string> {
		return "";
	}

	public async fromBuffer(buffer: Buffer): Promise<string> {
		return bech32m.encode(this.configuration.get("network.address.bech32m"), [...new Uint8Array(buffer)]);
	}

	public async toBuffer(address: string): Promise<{
		addressBuffer: Buffer;
		addressError?: string;
	}> {
		return {
			addressBuffer: Buffer.from(bech32m.decode(address).words),
		};
	}

	public async validate(address: string): Promise<boolean> {
		try {
			bech32m.decode(address);

			return true;
		} catch {
			return false;
		}
	}
}
