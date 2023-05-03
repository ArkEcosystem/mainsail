import { BigNumber } from "@mainsail/utils";

export type WalletResource = {
	address: string;
	publicKey?: string;
	balance: BigNumber;
	nonce: BigNumber;
	attributes: object;
};
