import { Container } from "@arkecosystem/core-container";
import { BINDINGS, IKeyPair, IKeyPairFactory, IWIFFactory } from "@arkecosystem/core-crypto-contracts";
import wif from "wif";

@Container.injectable()
export class WIFFactory implements IWIFFactory {
	@Container.inject(BINDINGS.Identity.KeyPairFactory)
	private readonly keyPairFactory: IKeyPairFactory;

	public async fromMnemonic(mnemonic: string, version: number): Promise<string> {
		const { compressed, privateKey }: IKeyPair = await this.keyPairFactory.fromMnemonic(mnemonic);

		return wif.encode(version, Buffer.from(privateKey, "hex"), compressed);
	}

	public async fromKeys(keys: IKeyPair, version: number): Promise<string> {
		return wif.encode(version, Buffer.from(keys.privateKey, "hex"), keys.compressed);
	}
}
