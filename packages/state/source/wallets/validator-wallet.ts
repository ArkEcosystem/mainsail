import { Contracts } from "@mainsail/contracts";
import { Utils } from "@mainsail/kernel";

export class ValidatorWallet implements Contracts.Consensus.IValidatorWallet {
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
		return this.wallet.getAttribute<string>("validator.consensusPublicKey");
	}

	public getUsername(): string {
		return this.wallet.getAttribute<string>("validator.username");
	}

	public getVoteBalance(): Utils.BigNumber {
		return this.wallet.getAttribute<Utils.BigNumber>("validator.voteBalance");
	}

	public getRank(): number {
		return this.wallet.getAttribute<number>("validator.rank");
	}

	public setRank(rank: number): void {
		this.wallet.setAttribute("validator.rank", rank);
	}

	public unsetRank(): void {
		this.wallet.forgetAttribute("validator.rank");
	}

	public isResigned(): boolean {
		return this.wallet.hasAttribute("validator.resigned");
	}
}
