import { Identifiers } from "@mainsail/contracts";
import { Providers, Services } from "@mainsail/kernel";

import { ProcessBlockAction } from "./actions/process-block.js";
import { BlockProcessor } from "./block-processor.js";
import { BlockVerifier } from "./block-verifier.js";
import { TransactionProcessor } from "./transaction-processor.js";
import { ChainedVerifier } from "./verifiers/chained-verifier.js";
import { GasLimitVerifier } from "./verifiers/gas-limit-verifier.js";
import { GeneratorVerifier } from "./verifiers/generator-verifier.js";
import { LegacyAttributeVerifier } from "./verifiers/legacy-attribute-verifier.js";
import { RewardVerifier } from "./verifiers/reward-verifier.js";
import { TimestampVerifier } from "./verifiers/timestamp-verifier.js";
import { TransactionLengthVerifier } from "./verifiers/transaction-length-verifier.js";
import { VersionVerifier } from "./verifiers/version-verifier.js";

export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		this.app.bind(Identifiers.Processor.BlockVerifier).to(BlockVerifier).inSingletonScope();

		for (const handler of [
			ChainedVerifier,
			TimestampVerifier,
			GeneratorVerifier,
			VersionVerifier,
			RewardVerifier,
			TransactionLengthVerifier,
			GasLimitVerifier,
			LegacyAttributeVerifier,
		]) {
			this.app.bind(Identifiers.Processor.BlockVerifierHandlers).to(handler);
		}

		this.app.bind(Identifiers.Processor.BlockProcessor).to(BlockProcessor).inSingletonScope();
		this.app.bind(Identifiers.Processor.TransactionProcessor).to(TransactionProcessor).inSingletonScope();

		this.#registerActions();
	}

	public async required(): Promise<boolean> {
		return true;
	}

	#registerActions(): void {
		this.app
			.get<Services.Triggers.Triggers>(Identifiers.Services.Trigger.Service)
			.bind("processBlock", new ProcessBlockAction());
	}
}
