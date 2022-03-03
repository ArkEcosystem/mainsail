import { inject, injectable } from "@arkecosystem/core-container";
import { Contracts, Exceptions, Identifiers } from "@arkecosystem/core-contracts";

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
		throw new Exceptions.NotImplemented(this.constructor.name, "fromMultiSignatureAsset");
	}

	public async verify(publicKey: string): Promise<boolean> {
		throw new Exceptions.NotImplemented(this.constructor.name, "verify");
	}
}
