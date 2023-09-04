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

	@inject(Identifiers.ValidatorWalletFactory)
	private readonly validatorWalletFactory!: Contracts.State.ValidatorWalletFactory;

	#validators: Contracts.State.IValidatorWallet[] = [];
	#indexByPublicKey: Map<string, number> = new Map();

	public async initialize(): Promise<void> {
		await this.buildVoteBalances();
		this.buildValidatorRanking();
	}

	public async onCommit(unit: Contracts.BlockProcessor.IProcessableUnit): Promise<void> {
		const committedBlock = await unit.getProposedCommitBlock();
		const { height } = committedBlock.block.header;
		if (Utils.roundCalculator.isNewRound(height + 1, this.cryptoConfiguration)) {
			this.buildValidatorRanking();
		}
	}

	public getActiveValidators(): Contracts.State.IValidatorWallet[] {
		const { activeValidators } = this.cryptoConfiguration.getMilestone();
		return this.#validators.slice(0, activeValidators);
	}

	public getValidator(index: number): Contracts.State.IValidatorWallet {
		return this.#validators[index];
	}

	public getValidatorIndexByWalletPublicKey(walletPublicKey: string): number {
		const result = this.#indexByPublicKey.get(walletPublicKey);

		if (result === undefined) {
			throw new Error(`Validator ${walletPublicKey} not found.`);
		}

		return result;
	}

	// NOTE: only public for tests
	public async buildVoteBalances(): Promise<void> {
		for (const voter of this.walletRepository.allByPublicKey()) {
			if (voter.hasVoted()) {
				const validator: Contracts.State.Wallet = await this.walletRepository.findByPublicKey(
					voter.getAttribute("vote"),
				);

				const voteBalance: Utils.BigNumber = validator.getAttribute("validator.voteBalance");

				validator.setAttribute("validator.voteBalance", voteBalance.plus(voter.getBalance()));
			}
		}
	}

	public buildValidatorRanking(): void {
		this.#validators = [];
		this.#indexByPublicKey = new Map();

		for (const wallet of this.walletRepository.allByUsername()) {
			const validator = this.validatorWalletFactory(wallet);
			if (validator.isResigned()) {
				validator.unsetRank();
			} else {
				this.#validators.push(validator);
			}
		}

		this.#validators.sort((a, b) => {
			const voteBalanceA: Utils.BigNumber = a.getVoteBalance();
			const voteBalanceB: Utils.BigNumber = b.getVoteBalance();

			const diff = voteBalanceB.comparedTo(voteBalanceA);

			if (diff === 0) {
				Utils.assert.defined<string>(a.getWalletPublicKey());
				Utils.assert.defined<string>(b.getWalletPublicKey());

				if (a.getWalletPublicKey() === b.getWalletPublicKey()) {
					const username = a.getUsername();
					throw new Error(
						`The balance and public key of both validators are identical! ` +
						`Validator "${username}" appears twice in the list.`,
					);
				}

				return a.getWalletPublicKey()!.localeCompare(b.getWalletPublicKey()!, "en");
			}

			return diff;
		});

		for (let index = 0; index < this.#validators.length; index++) {
			this.#validators[index].setRank(index + 1);

			const walletPublicKey = this.#validators[index].getWalletPublicKey();
			Utils.assert.defined<string>(walletPublicKey);
			this.#indexByPublicKey.set(walletPublicKey, index);
		}
	}
}
