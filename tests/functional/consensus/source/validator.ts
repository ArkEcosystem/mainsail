import { Contracts } from "@mainsail/contracts";
import { Validator as ValidatorBase } from "@mainsail/validator";

export class Validator extends ValidatorBase {
	protected async makeBlock(
		round: number,
		generatorPublicKey: string,
		transactions: Contracts.Crypto.Transaction[],
	): Promise<Contracts.Crypto.Block> {
		this.logger.info("making customized block");

		return super.makeBlock(round, generatorPublicKey, transactions);
	}
}
