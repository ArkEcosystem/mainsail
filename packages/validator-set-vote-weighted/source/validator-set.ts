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

	public async initialize(): Promise<void> {
		await this.buildVoteBalances();
		this.buildValidatorRanking();
	}

	public async handleCommitBlock(block: Contracts.Crypto.ICommittedBlock): Promise<void> {
		const { activeValidators } = this.cryptoConfiguration.getMilestone();

		// Update ranking every `activeValidators` blocks.
		const height = block.commit.height;
		if (height % activeValidators === 0) {
			this.buildValidatorRanking();
		}
	}

	public getActiveValidators(): Contracts.State.Wallet[] {
		const { activeValidators } = this.cryptoConfiguration.getMilestone();
		return this.#validators.slice(0, activeValidators);
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

		for (const validator of this.walletRepository.allByUsername()) {
			if (validator.hasAttribute("validator.resigned")) {
				validator.forgetAttribute("validator.rank");
			} else {
				this.#validators.push(validator);
			}
		}

		this.#validators.sort((a, b) => {
			const voteBalanceA: Utils.BigNumber = a.getAttribute("validator.voteBalance");
			const voteBalanceB: Utils.BigNumber = b.getAttribute("validator.voteBalance");

			const diff = voteBalanceB.comparedTo(voteBalanceA);

			if (diff === 0) {
				Utils.assert.defined<string>(a.getPublicKey());
				Utils.assert.defined<string>(b.getPublicKey());

				if (a.getPublicKey() === b.getPublicKey()) {
					const username = a.getAttribute("validator.username");
					throw new Error(
						`The balance and public key of both validators are identical! ` +
							`Validator "${username}" appears twice in the list.`,
					);
				}

				return a.getPublicKey()!.localeCompare(b.getPublicKey()!, "en");
			}

			return diff;
		});

		for (let index = 0; index < this.#validators.length; index++) {
			this.#validators[index].setAttribute("validator.rank", index + 1);

			const publicKey = this.#validators[index].getPublicKey();
			Utils.assert.defined<string>(publicKey);
			this.#indexByPublicKey.set(publicKey, index);
		}
	}
}
