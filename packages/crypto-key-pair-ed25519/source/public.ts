import { Container } from "@arkecosystem/container";
import { BINDINGS, IKeyPairFactory, IMultiSignatureAsset, IPublicKeyFactory } from "@arkecosystem/crypto-contracts";
import { NotImplemented } from "@arkecosystem/crypto-errors";

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
		throw new NotImplemented();
	}

	public async verify(publicKey: string): Promise<boolean> {
		throw new NotImplemented();
	}
}
