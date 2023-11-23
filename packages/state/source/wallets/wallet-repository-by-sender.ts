import { injectable } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";

import { WalletRepository } from "./wallet-repository";

@injectable()
export class WalletRepositoryBySender extends WalletRepository {
	#blockchainWalletRepository!: WalletRepository;
	#senderWallet!: Contracts.State.Wallet;

	public async configure(
		blockchainWalletRepository: WalletRepository,
		publicKey: string,
	): Promise<WalletRepositoryBySender> {
		this.#blockchainWalletRepository = blockchainWalletRepository;

		const address = await this.addressFactory.fromPublicKey(publicKey);
		if (!this.#blockchainWalletRepository.hasByAddress(address)) {
			throw new Error(`Sender wallet ${address} not found in blockchain wallet repository`);
		}
		this.#senderWallet = this.#cloneWallet(address);
		this.#senderWallet.setPublicKey(publicKey);

		return this;
	}

	public async findByPublicKey(publicKey: string): Promise<Contracts.State.Wallet> {
		if (this.hasByIndex(Contracts.State.WalletIndexes.PublicKeys, publicKey)) {
			return this.findByIndex(Contracts.State.WalletIndexes.PublicKeys, publicKey);
		}

		// Create empty wallet
		const wallet = this.createWalletFactory(await this.addressFactory.fromPublicKey(publicKey), this);
		wallet.setPublicKey(publicKey);

		return wallet;
	}

	public findByAddress(address: string): Contracts.State.Wallet {
		if (this.hasByIndex(Contracts.State.WalletIndexes.Addresses, address)) {
			return this.findByIndex(Contracts.State.WalletIndexes.Addresses, address);
		}

		// Create empty wallet
		return this.createWalletFactory(address, this);
	}

	public findByIndex(index: string, key: string): Contracts.State.Wallet {
		if (index === Contracts.State.WalletIndexes.Addresses && key === this.#senderWallet.getAddress()) {
			return this.#senderWallet;
		}

		if (index === Contracts.State.WalletIndexes.PublicKeys && key === this.#senderWallet.getPublicKey()) {
			return this.#senderWallet;
		}

		const wallet = this.#blockchainWalletRepository.findByIndex(index, key);
		return this.#cloneWallet(wallet.getAddress());
	}

	public hasByIndex(index: string, key: string): boolean {
		if (index === Contracts.State.WalletIndexes.Addresses && key === this.#senderWallet.getAddress()) {
			return true;
		}

		if (index === Contracts.State.WalletIndexes.PublicKeys && key === this.#senderWallet.getPublicKey()) {
			return true;
		}

		return this.#blockchainWalletRepository.hasByIndex(index, key);
	}

	public setOnIndex(index: string, key: string, wallet: Contracts.State.Wallet): void {}

	#cloneWallet(address: string): Contracts.State.Wallet {
		return this.#blockchainWalletRepository.findByAddress(address).clone(this);
	}
}
