import { aggregatePubkeys, PublicKey } from "@chainsafe/blst";
import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

@injectable()
export class PublicKeyFactory implements Contracts.Crypto.PublicKeyFactory {
	@inject(Identifiers.Cryptography.Identity.KeyPair.Factory)
	private readonly keyPairFactory!: Contracts.Crypto.KeyPairFactory;

	public async fromMnemonic(mnemonic: string): Promise<string> {
		return (await this.keyPairFactory.fromMnemonic(mnemonic)).publicKey;
	}

	public async fromWIF(wif: string): Promise<string> {
		return (await this.keyPairFactory.fromWIF(wif)).publicKey;
	}

	public async fromMultiSignatureAsset(asset: Contracts.Crypto.MultiSignatureAsset): Promise<string> {
		return Buffer.from(
			aggregatePubkeys(asset.publicKeys.map((pub) => PublicKey.fromBytes(Buffer.from(pub, "hex")))).toBytes(),
		).toString("hex");
	}

	public async verify(publicKey: string): Promise<boolean> {
		try {
			PublicKey.fromBytes(Buffer.from(publicKey, "hex")).keyValidate();
		} catch {
			return false;
		}

		return true;
	}

	public async aggregate(publicKeys: Buffer[]): Promise<string> {
		return Buffer.from(aggregatePubkeys(publicKeys.map((pub) => PublicKey.fromBytes(pub))).toBytes()).toString(
			"hex",
		);
	}
}
