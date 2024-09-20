import { Contracts } from "@mainsail/contracts";
import { Utils } from "@mainsail/kernel";

export class ValidatorWallet implements Contracts.State.ValidatorWalletOld {
	constructor(private readonly wallet: Contracts.State.Wallet) {}

	public getWallet(): Contracts.State.Wallet {
		return this.wallet;
	}

	public getConsensusPublicKey(): string {
		return this.wallet.getAttribute<string>("validatorPublicKey");
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

	public toString(): string {
		if (this.wallet.hasAttribute("username")) {
			return this.wallet.getAttribute<string>("username");
		}

		return this.getWallet().getAddress();
	}
}
