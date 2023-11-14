import { Contracts } from "@mainsail/contracts";
import { Utils } from "@mainsail/kernel";

export class ValidatorWallet implements Contracts.State.IValidatorWallet {
	constructor(private readonly wallet: Contracts.State.Wallet) {}

	public get getWallet(): Contracts.State.Wallet {
		return this.wallet;
	}

	public getWalletPublicKey(): string {
		const publicKey = this.wallet.getPublicKey();
		Utils.assert.defined<string>(publicKey);
		return publicKey;
	}

	public getConsensusPublicKey(): string {
		return this.wallet.getAttribute<string>("validatorConsensusPublicKey");
	}

	public getVoteBalance(): Utils.BigNumber {
		return this.wallet.getAttribute<Utils.BigNumber>("validatorVoteBalance");
	}

	public getRank(): number {
		return this.wallet.getAttribute<number>("validatorRank");
	}

	public setRank(rank: number): void {
		this.wallet.setAttribute("validatorRank", rank);
	}

	public unsetRank(): void {
		this.wallet.forgetAttribute("validatorRank");
	}

	public getApproval(): number {
		return this.wallet.getAttribute<number>("validatorApproval");
	}

	public setApproval(approval: number): void {
		this.wallet.setAttribute("validatorApproval", approval);
	}

	public unsetApproval(): void {
		this.wallet.forgetAttribute("validatorApproval");
	}

	public isResigned(): boolean {
		return this.wallet.hasAttribute("validatorResigned");
	}
}
