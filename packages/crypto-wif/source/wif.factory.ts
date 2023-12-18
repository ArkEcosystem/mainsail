import { inject, injectable, tagged } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import wif from "wif";

@injectable()
export class WIFFactory implements Contracts.Crypto.WIFFactory {
	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration!: Contracts.Crypto.Configuration;

	@inject(Identifiers.Cryptography.Identity.KeyPairFactory)
	@tagged("type", "wallet")
	private readonly keyPairFactory!: Contracts.Crypto.KeyPairFactory;

	public async fromMnemonic(mnemonic: string): Promise<string> {
		const { compressed, privateKey }: Contracts.Crypto.KeyPair = await this.keyPairFactory.fromMnemonic(mnemonic);

		return wif.encode(this.configuration.get("network.wif"), Buffer.from(privateKey, "hex"), compressed);
	}

	public async fromKeys(keys: Contracts.Crypto.KeyPair): Promise<string> {
		return wif.encode(this.configuration.get("network.wif"), Buffer.from(keys.privateKey, "hex"), keys.compressed);
	}
}
