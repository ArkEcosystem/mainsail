import { inject, injectable } from "@arkecosystem/core-container";
import { Crypto, Identifiers } from "@arkecosystem/core-contracts";
import { NotImplemented } from "@arkecosystem/core-errors";
import { aggregatePublicKeys } from "@noble/bls12-381";

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
		return Buffer.from(aggregatePublicKeys(asset.publicKeys)).toString("hex");
	}

	public async verify(publicKey: string): Promise<boolean> {
		throw new NotImplemented();
	}
}
