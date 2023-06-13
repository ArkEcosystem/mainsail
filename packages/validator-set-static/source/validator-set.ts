import { inject, injectable, tagged } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

@injectable()
export class ValidatorSet implements Contracts.ValidatorSet.IValidatorSet {
	@inject(Identifiers.WalletRepository)
	@tagged("state", "blockchain")
	private readonly walletRepository!: Contracts.State.WalletRepository;

	@inject(Identifiers.Cryptography.Configuration)
	private readonly cryptoConfiguration!: Contracts.Crypto.IConfiguration;

	#validators: Contracts.State.Wallet[] = [];

	public async getActiveValidators(): Promise<Contracts.State.Wallet[]> {
		if (this.#validators.length === 0) {
			this.#init();
		}

		return this.#validators;
	}

	#init(): void {
		const usernames: string[] = [];

		for (let index = 1; index <= this.cryptoConfiguration.getMilestone().activeValidators; index++) {
			usernames.push(`genesis_${index}`);
		}

		this.#validators = usernames.map((username) => this.walletRepository.findByUsername(username));
	}
}
