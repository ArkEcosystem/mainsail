import { Contracts, Exceptions } from "@arkecosystem/core-contracts";
import { numberToHex } from "@arkecosystem/utils";
import { secp256k1 } from "bcrypto";

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

		return secp256k1
			.publicKeyCombine(keys.map((publicKey: string) => Buffer.from(publicKey, "hex")))
			.toString("hex");
	}

	public async verify(publicKey: string): Promise<boolean> {
		return secp256k1.publicKeyVerify(Buffer.from(publicKey, "hex"));
	}
}
