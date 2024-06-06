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
	protected walletRepository!: Contracts.State.WalletRepository;
	protected originalWallet?: Wallet;

	#repository!: Contracts.State.StateRepository;

	public init(address: string, walletRepository: Contracts.State.WalletRepository, originalWallet?: Wallet): Wallet {
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

	public isValidator(): boolean {
		return this.hasAttribute("validatorPublicKey");
	}

	public hasVoted(): boolean {
		return this.hasAttribute("vote");
	}

	public hasMultiSignature(): boolean {
		return this.hasAttribute("multiSignature");
	}

	public clone(walletRepository: Contracts.State.WalletRepository): Contracts.State.Wallet {
		return this.createWalletFactory(this.address, walletRepository, this);
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

	public commitChanges(walletRepository: Contracts.State.WalletRepository): void {
		this.#repository.commitChanges();
		this.walletRepository = walletRepository;
	}

	public toJson(): Contracts.Types.JsonObject {
		return {
			address: this.address,
			...this.#repository.toJson(),
		};
	}

	public fromJson(json: Contracts.Types.JsonObject): Wallet {
		const jsonClone = { ...json };
		delete jsonClone.address;
		this.#repository.fromJson(jsonClone);

		if (!this.#repository.hasAttribute("balance")) {
			throw new Error(`Attribute "balance" is not set for wallet: ${this.address}`);
		}

		if (!this.#repository.hasAttribute("nonce")) {
			throw new Error(`Attribute "nonce" is not set for wallet: ${this.address}`);
		}

		return this;
	}

	public changesToJson(): Contracts.State.WalletChange {
		return {
			address: this.address,
			...this.#repository.changesToJson(),
		};
	}

	public applyChanges(data: Contracts.State.WalletChange): void {
		this.#repository.applyChanges(data);
		this.walletRepository.setDirtyWallet(this);
	}

	public toString(): string {
		if (this.hasAttribute("username")) {
			return this.getAttribute<string>("username");
		}

		return this.address;
	}
}
