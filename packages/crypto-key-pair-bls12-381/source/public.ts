import { inject, injectable } from "@mainsail/container";
import { Contracts, Exceptions, Identifiers } from "@mainsail/contracts";

import { getBls } from "./get-bls.js";

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
		throw new Exceptions.NotImplemented(this.constructor.name, "fromMultiSignatureAsset");
	}

	public async verify(publicKey: string): Promise<boolean> {
		const bls = await getBls();

		try {
			bls.PublicKey.fromBytes(Buffer.from(publicKey, "hex"), undefined, true);
		} catch {
			return false;
		}

		return true;
	}

	public async aggregate(publicKeys: Buffer[]): Promise<string> {
		const bls = await getBls();
		return Buffer.from(
			bls.aggregatePublicKeys(publicKeys.map((pub) => bls.PublicKey.fromBytes(pub).toBytes())),
		).toString("hex");
	}
}
