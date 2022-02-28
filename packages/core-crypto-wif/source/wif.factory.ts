import { Container } from "@arkecosystem/core-container";
import { BINDINGS, IConfiguration, IKeyPair, IKeyPairFactory, IWIFFactory } from "@arkecosystem/core-crypto-contracts";
import wif from "wif";

@Container.injectable()
export class WIFFactory implements IWIFFactory {
	@Container.inject(BINDINGS.Configuration)
	private readonly configuration: IConfiguration;

	@Container.inject(BINDINGS.Identity.KeyPairFactory)
	private readonly keyPairFactory: IKeyPairFactory;

	public async fromMnemonic(mnemonic: string): Promise<string> {
		const { compressed, privateKey }: IKeyPair = await this.keyPairFactory.fromMnemonic(mnemonic);

		return wif.encode(this.configuration.get("network.wif"), Buffer.from(privateKey, "hex"), compressed);
	}

	public async fromKeys(keys: IKeyPair): Promise<string> {
		return wif.encode(this.configuration.get("network.wif"), Buffer.from(keys.privateKey, "hex"), keys.compressed);
	}
}
