import { IBlockData } from "../crypto";
import { WalletData, WalletValidatorAttributes } from "../state";

export interface Response<T> {
	data: T;
}

export interface ValidatorWallet extends WalletData {
	validator: WalletValidatorAttributes;
}

export interface CurrentRound {
	current: number;
	reward: string;
	timestamp: number;
	validators: ValidatorWallet[];
	currentForger: ValidatorWallet;
	nextForger: ValidatorWallet;
	lastBlock: IBlockData;
	canForge: boolean;
}

export interface ForgingTransactions {
	transactions: string[];
	poolSize: number;
	count: number;
}

export interface UnconfirmedTransactions {
	transactions: string[];
	poolSize: number;
}
