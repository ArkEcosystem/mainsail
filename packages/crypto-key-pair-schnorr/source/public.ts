import { inject, injectable } from "@mainsail/container";
import { Contracts, Exceptions, Identifiers } from "@mainsail/contracts";
import { numberToHex } from "@mainsail/utils";
import { schnorr } from "bcrypto";

@injectable()
export class PublicKeyFactory implements Contracts.Crypto.IPublicKeyFactory {
	@inject(Identifiers.Cryptography.Identity.KeyPairFactory)
	private readonly keyPairFactory: Contracts.Crypto.IKeyPairFactory;

	public async fromMnemonic(mnemonic: string): Promise<string> {
		return (await this.keyPairFactory.fromMnemonic(mnemonic)).publicKey;
	}

	public async fromWIF(wif: string): Promise<string> {
		return (await this.keyPairFactory.fromWIF(wif)).publicKey;
	}

	public async fromMultiSignatureAsset(asset: Contracts.Crypto.IMultiSignatureAsset): Promise<string> {
		const { min, publicKeys }: Contracts.Crypto.IMultiSignatureAsset = asset;

		for (const publicKey of publicKeys) {
			if (!this.verify(publicKey)) {
				throw new Exceptions.PublicKeyError(publicKey);
			}
		}

		if (min < 1 || min > publicKeys.length) {
			throw new Exceptions.InvalidMultiSignatureAssetError();
		}

		const minKey: string = await this.fromMnemonic(numberToHex(min));
		const keys: string[] = [minKey, ...publicKeys];

		return schnorr.publicKeyCombine(keys.map((publicKey: string) => Buffer.from(publicKey, "hex"))).toString("hex");
	}

	public async verify(publicKey: string): Promise<boolean> {
		return schnorr.publicKeyVerify(Buffer.from(publicKey, "hex"));
	}

	public async aggregate(publicKeys: Buffer[]): Promise<string> {
		throw new Exceptions.NotImplemented(this.constructor.name, "aggregate");
	}
}
