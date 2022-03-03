import { DelegateTracker } from "../source/delegate-tracker";
import { Container, Services } from "@arkecosystem/core-kernel";
import { Actions } from "@arkecosystem/core-state";
import { Wallet } from "@arkecosystem/core-state/source/wallets";
import { Sandbox } from "../../core-test-framework/source";
import { Managers } from "@arkecosystem/crypto";
import { spy } from "sinon";

export const mockLastBlock = {
	data: { height: 3, timestamp: 16 },
};

export const setup = async (activeDelegates) => {
	const sandbox = new Sandbox();

	const logger = {
		error: spy(),
		debug: spy(),
		warning: spy(),
	};

	sandbox.app.bind(Container.Identifiers.LogService).toConstantValue(logger);

	@Container.injectable()
	class MockDatabaseService {
		public async getActiveDelegates(): Promise<Wallet[]> {
			return activeDelegates;
		}
	}

	@Container.injectable()
	class MockRoundState {
		public async getActiveDelegates(): Promise<Wallet[]> {
			return activeDelegates;
		}
	}

	@Container.injectable()
	class MockWalletRepository {
		public findByPublicKey(publicKey: string) {
			return {
				getAttribute: () => activeDelegates.find((wallet) => wallet.publicKey === publicKey).publicKey,
			};
		}
	}

	@Container.injectable()
	class MockBlockchainService {
		public getLastBlock() {
			return mockLastBlock;
		}
	}

	sandbox.app.bind(Container.Identifiers.DatabaseService).to(MockDatabaseService);

	sandbox.app.bind(Container.Identifiers.RoundState).to(MockRoundState);

	sandbox.app.bind(Container.Identifiers.BlockchainService).to(MockBlockchainService);

	sandbox.app.bind(Container.Identifiers.WalletRepository).to(MockWalletRepository);

	sandbox.app.bind(Container.Identifiers.TriggerService).to(Services.Triggers.Triggers).inSingletonScope();

	sandbox.app
		.get<Services.Triggers.Triggers>(Container.Identifiers.TriggerService)
		.bind("getActiveDelegates", new Actions.GetActiveDelegatesAction(sandbox.app));

	const delegateTracker = sandbox.app.resolve(DelegateTracker);

	await sandbox.boot();

	// todo: get rid of the need for this, requires an instance based crypto package
	Managers.configManager.setConfig(
		sandbox.app.get<Services.Config.ConfigRepository>(Container.Identifiers.ConfigRepository).get("crypto"),
	);

	return {
		sandbox,
		spies: {
			logger,
		},
		delegateTracker,
	};
};
