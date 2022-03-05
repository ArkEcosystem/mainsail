import { injectable } from "@arkecosystem/core-container";
import { Identifiers } from "@arkecosystem/core-contracts";
import { Services } from "@arkecosystem/core-kernel";
import { Actions } from "@arkecosystem/core-state";
import { Wallet } from "@arkecosystem/core-state/source/wallets";
import { spy } from "sinon";

import { Sandbox } from "../../core-test-framework/source";
import { ValidatorTracker } from "../source/validator-tracker";

export const mockLastBlock = {
	data: { height: 3, timestamp: 16 },
};

export const setup = async (activeDelegates) => {
	const sandbox = new Sandbox();

	const logger = {
		debug: spy(),
		error: spy(),
		warning: spy(),
	};

	sandbox.app.bind(Identifiers.LogService).toConstantValue(logger);

	@injectable()
	class MockDatabaseService {
		public async getActiveDelegates(): Promise<Wallet[]> {
			return activeDelegates;
		}
	}

	@injectable()
	class MockRoundState {
		public async getActiveDelegates(): Promise<Wallet[]> {
			return activeDelegates;
		}
	}

	@injectable()
	class MockWalletRepository {
		public findByPublicKey(publicKey: string) {
			return {
				getAttribute: () => activeDelegates.find((wallet) => wallet.publicKey === publicKey).publicKey,
			};
		}
	}

	@injectable()
	class MockBlockchainService {
		public getLastBlock() {
			return mockLastBlock;
		}
	}

	sandbox.app.bind(Identifiers.DatabaseService).to(MockDatabaseService);

	sandbox.app.bind(Identifiers.RoundState).to(MockRoundState);

	sandbox.app.bind(Identifiers.BlockchainService).to(MockBlockchainService);

	sandbox.app.bind(Identifiers.WalletRepository).to(MockWalletRepository);

	sandbox.app.bind(Identifiers.TriggerService).to(Services.Triggers.Triggers).inSingletonScope();

	sandbox.app
		.get<Services.Triggers.Triggers>(Identifiers.TriggerService)
		.bind("getActiveDelegates", new Actions.GetActiveDelegatesAction(sandbox.app));

	const delegateTracker = sandbox.app.resolve(ValidatorTracker);

	await sandbox.boot();

	// todo: get rid of the need for this, requires an instance based crypto package
	Managers.configManager.setConfig(
		sandbox.app.get<Services.Config.ConfigRepository>(Identifiers.ConfigRepository).get("crypto"),
	);

	return {
		delegateTracker,
		sandbox,
		spies: {
			logger,
		},
	};
};
