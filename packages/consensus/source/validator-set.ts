import { inject, injectable, tagged } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

@injectable()
export class ValidatorSet {
	@inject(Identifiers.Application)
	private readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.WalletRepository)
	@tagged("state", "blockchain")
	private readonly walletRepository!: Contracts.State.WalletRepository;

	@inject(Identifiers.Cryptography.Identity.KeyPairFactory)
	private readonly keyPairFactory!: Contracts.Crypto.IKeyPairFactory;

	async getActiveValidators(): Promise<Contracts.State.Wallet[]> {
		const keyPairs = await Promise.all(
			this.app
				.config("validators.secrets")
				.map(async (menonic) => await this.keyPairFactory.fromMnemonic(menonic)),
		);

		return await Promise.all(
			keyPairs.map(async (keyPair) => await this.walletRepository.findByPublicKey(keyPair.publicKey)),
		);
	}
}
