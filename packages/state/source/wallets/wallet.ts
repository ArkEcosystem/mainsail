import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { BigNumber } from "@mainsail/utils";

@injectable()
export class Wallet implements Contracts.State.Wallet {
	@inject(Identifiers.State.StateRepository.Factory)
	protected readonly createStateRepository!: Contracts.State.StateRepositoryFactory;

	@inject(Identifiers.State.Wallet.Attributes)
	protected readonly attributeRepository!: Contracts.State.AttributeRepository;

	protected address!: string;
	protected balance = BigNumber.ZERO;
	protected nonce = BigNumber.ZERO;

	#repository!: Contracts.State.StateRepository;

	public init(address: string): Wallet {
		this.address = address;
		return this;
	}

	public getAddress(): string {
		return this.address;
	}

	public getBalance(): BigNumber {
		return this.getAttribute("balance");
	}

	public setBalance(balance: BigNumber): void {
		this.balance = balance;
	}

	public getNonce(): BigNumber {
		return this.getAttribute<BigNumber>("nonce");
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

	public hasAttribute(key: string): boolean {
		return this.#repository.hasAttribute(key);
	}

	public getAttribute<T>(key: string, defaultValue?: T): T {
		return this.#repository.getAttribute<T>(key, defaultValue);
	}

	public getAttributes(): Record<string, any> {
		return this.#repository.getAttributes();
	}
}
