import { Contracts } from "@mainsail/contracts";
import { bech32m } from "@scure/base";

@injectable()
export class AddressFactory implements Contracts.Crypto.IAddressFactory {
	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration: Contracts.Crypto.IConfiguration;

	@inject(Identifiers.Cryptography.Identity.KeyPairFactory)
	private readonly keyPairFactory: Contracts.Crypto.IKeyPairFactory;

	public async fromMnemonic(passphrase: string): Promise<string> {
		return this.fromPublicKey((await this.keyPairFactory.fromMnemonic(passphrase)).publicKey);
	}

	public async fromPublicKey(publicKey: string): Promise<string> {
		return bech32m.encode(
			this.configuration.getMilestone().address.bech32m,
			bech32m.toWords(Buffer.from(publicKey, "hex")),
		);
	}

	public async fromWIF(wif: string): Promise<string> {
		return "";
	}

	public async fromMultiSignatureAsset(asset: Contracts.Crypto.IMultiSignatureAsset): Promise<string> {
		return "";
	}

	public async fromPrivateKey(privateKey: Contracts.Crypto.IKeyPair): Promise<string> {
		return "";
	}

	public async fromBuffer(buffer: Buffer): Promise<string> {
		return bech32m.encode(this.configuration.getMilestone().address.bech32m, [...new Uint8Array(buffer)]);
	}

	public async toBuffer(address: string): Promise<Buffer> {
		return Buffer.from(bech32m.decode(address).words);
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
