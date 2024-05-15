import { injectable } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";

@injectable()
export class Client implements Contracts.TransactionPool.Client {
	public async getTx(): Promise<Contracts.Crypto.Transaction[]> {
		return [];
	}
}
