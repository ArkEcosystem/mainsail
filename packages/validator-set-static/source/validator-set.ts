import { inject, injectable, tagged } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Wallets } from "@mainsail/state";
import { Utils } from "@mainsail/kernel";

@injectable()
export class ValidatorSet implements Contracts.ValidatorSet.IValidatorSet {
	@inject(Identifiers.WalletRepository)
	@tagged("state", "blockchain")
	private readonly walletRepository!: Contracts.State.WalletRepository;

	@inject(Identifiers.Cryptography.Configuration)
	private readonly cryptoConfiguration!: Contracts.Crypto.IConfiguration;

	#validators: Contracts.Consensus.IValidatorWallet[] = [];
	#indexByWalletPublicKey: Map<string, number> = new Map();

	public async initialize(): Promise<void> {
		this.#init();
	}

	public async handleCommitBlock(block: Contracts.Crypto.ICommittedBlock): Promise<void> { }

	public getActiveValidators(): Contracts.Consensus.IValidatorWallet[] {
		if (this.#validators.length === 0) {
			this.#init();
		}

		return this.#validators;
	}

	public getValidatorConsensusPublicKeyByIndex(index: number): string {
		return this.#validators[index].getConsensusPublicKey();
	}

	public getValidatorIndexByWalletPublicKey(walletPublicKey: string): number {
		const result = this.#indexByWalletPublicKey.get(walletPublicKey);

		if (result === undefined) {
			throw new Error(`Validator ${walletPublicKey} not found.`);
		}

		return result;
	}

	#init(): void {
		this.#validators = [];
		this.#indexByWalletPublicKey = new Map();

		for (let index = 0; index < this.cryptoConfiguration.getMilestone().activeValidators; index++) {
			const wallet = new Wallets.ValidatorWallet(this.walletRepository.findByUsername(`genesis_${index + 1}`));

			this.#validators.push(wallet);

			const walletPublicKey = wallet.getWalletPublicKey();
			Utils.assert.defined<string>(walletPublicKey);
			this.#indexByWalletPublicKey.set(walletPublicKey, index);
		}
	}
}
