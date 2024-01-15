import { inject, injectable, tagged } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { hexToU8a, isHex } from "@polkadot/util";
import { decodeAddress, encodeAddress } from "@polkadot/util-crypto";

@injectable()
export class AddressFactory implements Contracts.Crypto.AddressFactory {
	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration!: Contracts.Crypto.Configuration;

	@inject(Identifiers.Cryptography.Identity.KeyPair.Factory)
	@tagged("type", "wallet")
	private readonly keyPairFactory!: Contracts.Crypto.KeyPairFactory;

	public async fromMnemonic(mnemonic: string): Promise<string> {
		return this.fromPublicKey((await this.keyPairFactory.fromMnemonic(mnemonic)).publicKey);
	}

	public async fromPublicKey(publicKey: string): Promise<string> {
		return encodeAddress(Buffer.from(publicKey, "hex"), this.configuration.getMilestone().address.ss58);
	}

	public async fromWIF(wif: string): Promise<string> {
		return "";
	}

	public async fromMultiSignatureAsset(asset: Contracts.Crypto.MultiSignatureAsset): Promise<string> {
		return "";
	}

	public async fromPrivateKey(privateKey: Contracts.Crypto.KeyPair): Promise<string> {
		return "";
	}

	public async fromBuffer(buffer: Buffer): Promise<string> {
		return "";
	}

	public async toBuffer(address: string): Promise<Buffer> {
		return Buffer.alloc(1);
	}

	public async validate(address: string): Promise<boolean> {
		try {
			encodeAddress(
				isHex(address)
					? hexToU8a(address)
					: decodeAddress(address, this.configuration.getMilestone().address.ss58),
				this.configuration.getMilestone().address.ss58,
			);

			return true;
		} catch {
			return false;
		}
	}
}
