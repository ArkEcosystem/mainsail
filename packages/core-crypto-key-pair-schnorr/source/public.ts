import { inject, injectable } from "@arkecosystem/core-container";
import { Crypto, Identifiers } from "@arkecosystem/core-contracts";
import { InvalidMultiSignatureAssetError, PublicKeyError } from "@arkecosystem/core-errors";
import { schnorr } from "bcrypto";

@injectable()
export class PublicKeyFactory implements Crypto.IPublicKeyFactory {
	@inject(Identifiers.Cryptography.Identity.KeyPairFactory)
	private readonly keyPairFactory: Crypto.IKeyPairFactory;

	public async fromMnemonic(mnemonic: string): Promise<string> {
		return (await this.keyPairFactory.fromMnemonic(mnemonic)).publicKey;
	}

	public async fromWIF(wif: string): Promise<string> {
		return (await this.keyPairFactory.fromWIF(wif)).publicKey;
	}

	public async fromMultiSignatureAsset(asset: Crypto.IMultiSignatureAsset): Promise<string> {
		const { min, publicKeys }: Crypto.IMultiSignatureAsset = asset;

		for (const publicKey of publicKeys) {
			if (!this.verify(publicKey)) {
				throw new PublicKeyError(publicKey);
			}
		}

		if (min < 1 || min > publicKeys.length) {
			throw new InvalidMultiSignatureAssetError();
		}

		const minKey: string = await this.fromMnemonic(this.#numberToHex(min));
		const keys: string[] = [minKey, ...publicKeys];

		return schnorr.publicKeyCombine(keys.map((publicKey: string) => Buffer.from(publicKey, "hex"))).toString("hex");
	}

	public async verify(publicKey: string): Promise<boolean> {
		return schnorr.publicKeyVerify(Buffer.from(publicKey, "hex"));
	}

	#numberToHex(number_: number, padding = 2): string {
		const indexHex: string = Number(number_).toString(16);

		return "0".repeat(padding - indexHex.length) + indexHex;
	}
}
