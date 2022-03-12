import { Contracts, Identifiers } from "@arkecosystem/core-contracts";
import { Utils as AppUtils } from "@arkecosystem/core-kernel";
import { BigNumber } from "@arkecosystem/utils";
import { injectable, inject } from "@arkecosystem/core-container";

@injectable()
export class DposState implements Contracts.State.DposState {
	@inject(Identifiers.LogService)
	private logger!: Contracts.Kernel.Logger;

	@inject(Identifiers.WalletRepository)
	private walletRepository!: Contracts.State.WalletRepository;

	#roundInfo: Contracts.Shared.RoundInfo | null = null;

	#activeValidators: Contracts.State.Wallet[] = [];

	#roundValidators: Contracts.State.Wallet[] = [];

	public getRoundInfo(): Contracts.Shared.RoundInfo {
		AppUtils.assert.defined<Contracts.Shared.RoundInfo>(this.#roundInfo);
		return this.#roundInfo;
	}

	public getAllValidators(): readonly Contracts.State.Wallet[] {
		return this.walletRepository.allByUsername();
	}

	public getActiveValidators(): readonly Contracts.State.Wallet[] {
		return this.#activeValidators;
	}

	public getRoundValidators(): readonly Contracts.State.Wallet[] {
		return this.#roundValidators;
	}

	// Only called during integrity verification on boot.
	public async buildVoteBalances(): Promise<void> {
		for (const voter of this.walletRepository.allByPublicKey()) {
			if (voter.hasVoted()) {
				const validator: Contracts.State.Wallet = await this.walletRepository.findByPublicKey(
					voter.getAttribute("vote"),
				);

				const voteBalance: BigNumber = validator.getAttribute("validator.voteBalance");

				validator.setAttribute("validator.voteBalance", voteBalance.plus(voter.getBalance()));
			}
		}
	}

	public buildValidatorRanking(): void {
		this.#activeValidators = [];

		for (const validator of this.walletRepository.allByUsername()) {
			if (validator.hasAttribute("validator.resigned")) {
				validator.forgetAttribute("validator.rank");
			} else {
				this.#activeValidators.push(validator);
			}
		}

		this.#activeValidators.sort((a, b) => {
			const voteBalanceA: BigNumber = a.getAttribute("validator.voteBalance");
			const voteBalanceB: BigNumber = b.getAttribute("validator.voteBalance");

			const diff = voteBalanceB.comparedTo(voteBalanceA);

			if (diff === 0) {
				AppUtils.assert.defined<string>(a.getPublicKey());
				AppUtils.assert.defined<string>(b.getPublicKey());

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

		for (let index = 0; index < this.#activeValidators.length; index++) {
			this.#activeValidators[index].setAttribute("validator.rank", index + 1);
		}
	}

	public setValidatorsRound(roundInfo: Contracts.Shared.RoundInfo): void {
		if (this.#activeValidators.length < roundInfo.maxValidators) {
			throw new Error(
				`Expected to find ${roundInfo.maxValidators} validators but only found ${
					this.#activeValidators.length
				}.` + `This indicates an issue with the genesis block & validators.`,
			);
		}

		this.#roundInfo = roundInfo;
		this.#roundValidators = [];
		for (let index = 0; index < roundInfo.maxValidators; index++) {
			this.#activeValidators[index].setAttribute("validator.round", roundInfo.round);
			this.#roundValidators.push(this.#activeValidators[index]);
		}
		this.logger.debug(
			`Loaded ${roundInfo.maxValidators} active ` + AppUtils.pluralize("validator", roundInfo.maxValidators),
		);
	}
}
