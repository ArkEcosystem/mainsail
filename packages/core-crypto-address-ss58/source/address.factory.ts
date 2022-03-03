import { inject, injectable } from "@arkecosystem/core-container";
import { Crypto, Identifiers } from "@arkecosystem/core-contracts";
import { hexToU8a, isHex } from "@polkadot/util";
import { decodeAddress, encodeAddress } from "@polkadot/util-crypto";

@injectable()
export class AddressFactory implements Crypto.IAddressFactory {
	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration: Crypto.IConfiguration;

	@inject(Identifiers.Cryptography.Identity.KeyPairFactory)
	private readonly keyPairFactory: Crypto.IKeyPairFactory;

	public async fromMnemonic(mnemonic: string): Promise<string> {
		return this.fromPublicKey((await this.keyPairFactory.fromMnemonic(mnemonic)).publicKey);
	}

	public async fromPublicKey(publicKey: string): Promise<string> {
		return encodeAddress(Buffer.from(publicKey, "hex"), this.configuration.get("network.address.ss58"));
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
			encodeAddress(
				isHex(address)
					? hexToU8a(address)
					: decodeAddress(address, this.configuration.get("network.address.ss58")),
				this.configuration.get("network.address.ss58"),
			);

			return true;
		} catch {
			return false;
		}
	}
}
