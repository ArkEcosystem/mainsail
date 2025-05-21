export interface LegacyChainTip {
	readonly hash: string;
	readonly number: string;
}

export interface LegacySnapshot {
	readonly hash: string;
	readonly chainTip: LegacyChainTip;
	readonly wallets: LegacyWallet[];
}

export interface LegacyWallet {
	readonly arkAddress: string; // base58
	readonly publicKey?: string;
	readonly ethAddress?: string; // keccak256
	readonly balance: string; // ARK - 8 decimals
	readonly attributes?: Record<string, any>;
}
