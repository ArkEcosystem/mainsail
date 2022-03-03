import { inject, injectable } from "@arkecosystem/core-container";
import { Crypto, Identifiers } from "@arkecosystem/core-contracts";
import { bech32 } from "@scure/base";

@injectable()
export class AddressFactory implements Crypto.IAddressFactory {
	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration: Crypto.IConfiguration;

	@inject(Identifiers.Cryptography.Identity.KeyPairFactory)
	private readonly keyPairFactory: Crypto.IKeyPairFactory;

	public async fromMnemonic(passphrase: string): Promise<string> {
		return this.fromPublicKey((await this.keyPairFactory.fromMnemonic(passphrase)).publicKey);
	}

	public async fromPublicKey(publicKey: string): Promise<string> {
		return bech32.encode(
			this.configuration.get("network.address.bech32"),
			bech32.toWords(Buffer.from(publicKey, "hex")),
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
		return "";
	}

	public async toBuffer(address: string): Promise<{
		addressBuffer: Buffer;
		addressError?: string;
	}> {
		return { addressBuffer: Buffer.alloc(1) };
	}

	public async validate(address: string): Promise<boolean> {
		try {
			bech32.decode(address);

			return true;
		} catch {
			return false;
		}
	}
}
