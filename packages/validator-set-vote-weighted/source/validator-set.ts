import { inject, injectable, postConstruct } from "@mainsail/container";
import { Contracts, Exceptions, Identifiers } from "@mainsail/contracts";
import { Utils } from "@mainsail/kernel";

@injectable()
export class ValidatorSet implements Contracts.ValidatorSet.ValidatorSet {
	// TODO: Check which wallet repository should be used
	@inject(Identifiers.State.Service)
	private readonly stateService!: Contracts.State.Service;

	@inject(Identifiers.Cryptography.Configuration)
	private readonly cryptoConfiguration!: Contracts.Crypto.Configuration;

	@inject(Identifiers.State.ValidatorWallet.Factory)
	private readonly validatorWalletFactory!: Contracts.State.ValidatorWalletFactory;

	#walletRepository!: Contracts.State.WalletRepository;

	#validators: Contracts.State.ValidatorWallet[] = [];
	#indexByPublicKey: Map<string, number> = new Map();

	@postConstruct()
	public init(): void {
		this.#walletRepository = this.stateService.getWalletRepository();
	}

	public async initialize(): Promise<void> {
		await this.buildVoteBalances();
		this.buildValidatorRanking();
	}

	public async onCommit(unit: Contracts.Processor.ProcessableUnit): Promise<void> {
		const commit = await unit.getCommit();
		const { height } = commit.block.header;
		if (Utils.roundCalculator.isNewRound(height + 1, this.cryptoConfiguration)) {
			this.buildValidatorRanking();
		}
	}

	public getActiveValidators(): Contracts.State.ValidatorWallet[] {
		const { activeValidators } = this.cryptoConfiguration.getMilestone();

		if (this.#validators.length < activeValidators) {
			throw new Exceptions.NotEnoughActiveValidatorsError(this.#validators.length, activeValidators);
		}

		return this.#validators.slice(0, activeValidators);
	}

	public getValidator(index: number): Contracts.State.ValidatorWallet {
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
		for (const voter of this.#walletRepository.allByPublicKey()) {
			if (voter.hasVoted()) {
				const validator: Contracts.State.Wallet = await this.#walletRepository.findByPublicKey(
					voter.getAttribute("vote"),
				);

				const voteBalance: Utils.BigNumber = validator.getAttribute("validatorVoteBalance");

				validator.setAttribute("validatorVoteBalance", voteBalance.plus(voter.getBalance()));
			}
		}
	}

	public buildValidatorRanking(): void {
		this.#validators = [];
		this.#indexByPublicKey = new Map();

		for (const wallet of this.#walletRepository.allValidators()) {
			const validator = this.validatorWalletFactory(wallet);
			if (validator.isResigned()) {
				validator.unsetRank();
				validator.unsetApproval();
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
					throw new Error(
						`The balance and public key of both validators are identical! ` +
							`Validator "${a.getWalletPublicKey()}" appears twice in the list.`,
					);
				}

				return a.getWalletPublicKey()!.localeCompare(b.getWalletPublicKey()!, "en");
			}

			return diff;
		});

		const lastBlock = this.stateService.getStateStore().getLastBlock();
		const totalSupply = Utils.supplyCalculator.calculateSupply(lastBlock.header.height, this.cryptoConfiguration);

		for (let index = 0; index < this.#validators.length; index++) {
			const validator = this.#validators[index];

			validator.setRank(index + 1);
			validator.setApproval(Utils.validatorCalculator.calculateApproval(validator.getVoteBalance(), totalSupply));

			const walletPublicKey = validator.getWalletPublicKey();
			Utils.assert.defined<string>(walletPublicKey);
			this.#indexByPublicKey.set(walletPublicKey, index);
		}
	}
}
