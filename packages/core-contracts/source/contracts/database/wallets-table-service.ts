import { Wallet } from "../state";

export interface WalletsTableService {
	flush(): Promise<void>;
	sync(wallets: readonly Wallet[]): Promise<void>;
}
