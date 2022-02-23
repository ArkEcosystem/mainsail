import { Container } from "@arkecosystem/core-container";
import {
	BINDINGS,
	IKeyPairFactory,
	IMultiSignatureAsset,
	IPublicKeyFactory,
} from "@arkecosystem/core-crypto-contracts";
import { NotImplemented } from "@arkecosystem/core-crypto-errors";
import { aggregatePublicKeys } from "@noble/bls12-381";

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
		return Buffer.from(aggregatePublicKeys(asset.publicKeys)).toString("hex");
	}

	public async verify(publicKey: string): Promise<boolean> {
		throw new NotImplemented();
	}
}
