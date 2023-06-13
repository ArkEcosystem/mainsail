import { inject, injectable, tagged } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

@injectable()
export class ValidatorSet implements Contracts.ValidatorSet.IValidatorSet {
	@inject(Identifiers.Application)
	private readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.WalletRepository)
	@tagged("state", "blockchain")
	private readonly walletRepository!: Contracts.State.WalletRepository;

	@inject(Identifiers.Cryptography.Identity.PublicKeyFactory)
	@tagged("type", "wallet")
	private readonly walletPublicKeyFactory!: Contracts.Crypto.IPublicKeyFactory;

	#validators: Contracts.State.Wallet[] = [];

	public async configure(): Promise<ValidatorSet> {
		const secrets = this.app.config<string[]>("validators.secrets") ?? [];

		this.#validators = await Promise.all(
			secrets.map(async (secret) => {
				const walletPublicKey = await this.walletPublicKeyFactory.fromMnemonic(secret);

				return await this.walletRepository.findByPublicKey(walletPublicKey);
			}),
		);

		return this;
	}

	public async getActiveValidators(): Promise<Contracts.State.Wallet[]> {
		return this.#validators;
	}
}
