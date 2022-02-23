import { Container } from "@arkecosystem/container";
import { IPublicKeyFactory, IMultiSignatureAsset, BINDINGS, IKeyPairFactory } from "@arkecosystem/crypto-contracts";
import { InvalidMultiSignatureAssetError, PublicKeyError } from "@arkecosystem/crypto-errors";
import { secp256k1 } from "bcrypto";

@Container.injectable()
export class PublicKeyFactory implements IPublicKeyFactory {
	@Container.inject(BINDINGS.Identity.KeyPairFactory)
	private readonly keyPairFactory: IKeyPairFactory;

	public async fromMnemonic(mnemonic: string): Promise<string> {
		return (await this.keyPairFactory.fromMnemonic(mnemonic)).publicKey;
	}

	public async fromWIF(wif: string, version: number): Promise<string> {
		return (await this.keyPairFactory.fromWIF(wif, version)).publicKey;
	}

	public async fromMultiSignatureAsset(asset: IMultiSignatureAsset): Promise<string> {
		const { min, publicKeys }: IMultiSignatureAsset = asset;

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

		return secp256k1
			.publicKeyCombine(keys.map((publicKey: string) => Buffer.from(publicKey, "hex")))
			.toString("hex");
	}

	public async verify(publicKey: string): Promise<boolean> {
		return secp256k1.publicKeyVerify(Buffer.from(publicKey, "hex"));
	}

	#numberToHex(num: number, padding = 2): string {
		const indexHex: string = Number(num).toString(16);

		return "0".repeat(padding - indexHex.length) + indexHex;
	}
}
