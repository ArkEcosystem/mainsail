import { Wallets } from "@mainsail/state";
import { BigNumber } from "@mainsail/utils";

let mockNonce: BigNumber = BigNumber.make(1);

export const setNonce = (nonce: BigNumber) => {
	mockNonce = nonce;
};

class WalletRepositoryMock implements Partial<Wallets.WalletRepository> {
	public async getNonce(publicKey: string): Promise<BigNumber> {
		return mockNonce;
	}
}

export const instance = new WalletRepositoryMock();
