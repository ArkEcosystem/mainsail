import { inject, injectable, tagged } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { BigNumber } from "@mainsail/utils";

@injectable()
export class Wallet implements Contracts.State.Wallet {
	@inject(Identifiers.Evm.Instance)
	@tagged("instance", "evm")
	private readonly evm!: Contracts.Evm.Instance;

	protected address!: string;
	protected balance = BigNumber.ZERO;
	protected nonce = BigNumber.ZERO;

	public async init(address: string): Promise<Wallet> {
		this.address = address;

		const accountInfo = await this.evm.getAccountInfo(address);
		this.balance = BigNumber.make(accountInfo.balance);
		this.nonce = BigNumber.make(accountInfo.nonce);
		return this;
	}

	public getAddress(): string {
		return this.address;
	}

	public getBalance(): BigNumber {
		return this.balance;
	}

	public setBalance(balance: BigNumber): void {
		this.balance = balance;
	}

	public getNonce(): BigNumber {
		return this.nonce;
	}

	public setNonce(nonce: BigNumber): void {
		this.nonce = nonce;
	}

	public increaseBalance(balance: BigNumber): Contracts.State.Wallet {
		this.setBalance(this.getBalance().plus(balance));

		return this;
	}

	public decreaseBalance(balance: BigNumber): Contracts.State.Wallet {
		this.setBalance(this.getBalance().minus(balance));

		return this;
	}

	public increaseNonce(): void {
		this.setNonce(this.getNonce().plus(BigNumber.ONE));
	}

	public decreaseNonce(): void {
		this.setNonce(this.getNonce().minus(BigNumber.ONE));
	}
}
