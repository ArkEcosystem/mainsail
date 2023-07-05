import { inject, injectable, tagged } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Utils } from "@mainsail/kernel";

@injectable()
export class ValidatorSet implements Contracts.ValidatorSet.IValidatorSet {
	@inject(Identifiers.WalletRepository)
	@tagged("state", "blockchain")
	private readonly walletRepository!: Contracts.State.WalletRepository;

	@inject(Identifiers.Cryptography.Configuration)
	private readonly cryptoConfiguration!: Contracts.Crypto.IConfiguration;

	#validators: Contracts.State.Wallet[] = [];
	#indexByPublicKey: Map<string, number> = new Map();

	public getActiveValidators(): Contracts.State.Wallet[] {
		if (this.#validators.length === 0) {
			this.#init();
		}

		return this.#validators;
	}

	public getValidatorPublicKeyByIndex(index: number): string {
		return this.#validators[index].getAttribute<string>("validator.consensusPublicKey");
	}

	public getValidatorIndexByPublicKey(publicKey: string): number {
		const result = this.#indexByPublicKey.get(publicKey);

		if (result === undefined) {
			throw new Error(`Validator ${publicKey} not found.`);
		}

		return result;
	}

	#init(): void {
		this.#validators = [];
		this.#indexByPublicKey = new Map();

		for (let index = 0; index < this.cryptoConfiguration.getMilestone().activeValidators; index++) {
			const wallet = this.walletRepository.findByUsername(`genesis_${index + 1}`);

			this.#validators.push(wallet);

			const publicKey = wallet.getPublicKey();
			Utils.assert.defined<string>(publicKey);
			this.#indexByPublicKey.set(publicKey, index);
		}
	}
}
