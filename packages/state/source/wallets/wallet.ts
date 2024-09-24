import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { BigNumber } from "@mainsail/utils";

@injectable()
export class Wallet implements Contracts.State.Wallet {
	@inject(Identifiers.State.Wallet.Factory)
	protected readonly createWalletFactory!: Contracts.State.WalletFactory;

	@inject(Identifiers.State.StateRepository.Factory)
	protected readonly createStateRepository!: Contracts.State.StateRepositoryFactory;

	@inject(Identifiers.State.Wallet.Attributes)
	protected readonly attributeRepository!: Contracts.State.AttributeRepository;

	protected address!: string;
	protected walletRepository!: any;
	protected originalWallet?: Wallet;

	#repository!: Contracts.State.StateRepository;

	public init(address: string, walletRepository: any, originalWallet?: Wallet): Wallet {
		this.address = address;
		this.walletRepository = walletRepository;
		this.originalWallet = originalWallet;

		if (originalWallet) {
			this.#repository = this.createStateRepository(this.attributeRepository, originalWallet.#repository);
		} else {
			this.#repository = this.createStateRepository(this.attributeRepository, undefined, {
				balance: BigNumber.ZERO,
				nonce: BigNumber.ZERO,
			});
		}

		return this;
	}

	public isChanged(): boolean {
		return this.#repository.isChanged();
	}

	public getAddress(): string {
		return this.address;
	}

	public getPublicKey(): string | undefined {
		if (!this.hasAttribute("publicKey")) {
			return undefined;
		}

		return this.getAttribute<string>("publicKey");
	}

	public setPublicKey(publicKey: string): void {
		this.setAttribute("publicKey", publicKey);
	}

	public getBalance(): BigNumber {
		return this.getAttribute("balance");
	}

	public setBalance(balance: BigNumber): void {
		this.setAttribute("balance", balance);
	}

	public getNonce(): BigNumber {
		return this.getAttribute<BigNumber>("nonce");
	}

	public setNonce(nonce: BigNumber): void {
		this.setAttribute("nonce", nonce);
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

	public setAttribute<T>(key: string, value: T): void {
		this.#repository.setAttribute<T>(key, value);
		this.walletRepository.setDirtyWallet(this);
	}

	public forgetAttribute(key: string): void {
		this.#repository.forgetAttribute(key);
		this.walletRepository.setDirtyWallet(this);
	}

	public isClone(): boolean {
		return !!this.originalWallet;
	}

	public getOriginal(): Contracts.State.Wallet {
		if (this.originalWallet) {
			return this.originalWallet;
		}

		throw new Error("This is not a clone wallet");
	}

	public toString(): string {
		if (this.hasAttribute("username")) {
			return this.getAttribute<string>("username");
		}

		return this.address;
	}
}
