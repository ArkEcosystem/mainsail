import { inject, injectable, postConstruct } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Utils } from "@mainsail/kernel";

@injectable()
export class ValidatorSet implements Contracts.ValidatorSet.IValidatorSet {
	// TODO: Check which wallet repository should be used
	@inject(Identifiers.StateService)
	private readonly stateService!: Contracts.State.Service;

	@inject(Identifiers.Cryptography.Configuration)
	private readonly cryptoConfiguration!: Contracts.Crypto.IConfiguration;

	@inject(Identifiers.ValidatorWalletFactory)
	private readonly validatorWalletFactory!: Contracts.State.ValidatorWalletFactory;

	#walletRepository!: Contracts.State.WalletRepository;

	#validators: Contracts.State.IValidatorWallet[] = [];
	#indexByPublicKey: Map<string, number> = new Map();

	@postConstruct()
	public init(): void {
		this.#walletRepository = this.stateService.getWalletRepository();
	}

	public async initialize(): Promise<void> {
		await this.buildVoteBalances();
		this.buildValidatorRanking();
	}

	public async onCommit(unit: Contracts.BlockProcessor.IProcessableUnit): Promise<void> {
		const committedBlock = await unit.getCommittedBlock();
		const { height } = committedBlock.block.header;
		if (Utils.roundCalculator.isNewRound(height + 1, this.cryptoConfiguration)) {
			this.buildValidatorRanking();
		}
	}

	public getActiveValidators(height: number): Contracts.State.IValidatorWallet[] {
		const { activeValidators } = this.cryptoConfiguration.getMilestone(height);
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

		for (const wallet of this.#walletRepository.allByUsername()) {
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
