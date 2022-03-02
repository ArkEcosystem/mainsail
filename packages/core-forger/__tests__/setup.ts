import "jest-extended";

import { DelegateTracker } from "@packages/core-forger/source/delegate-tracker";
import { Container, Services } from "@packages/core-kernel";
import { GetActiveDelegatesAction } from "@packages/core-state/source/actions";
import { Wallet } from "@packages/core-state/source/wallets";
import { Sandbox } from "@packages/core-test-framework/source";
import { Managers } from "@packages/crypto/source";

export const mockLastBlock = {
	data: { height: 3, timestamp: 16 },
};

export const setup = async (activeDelegates) => {
	const sandbox = new Sandbox();

	const error: jest.SpyInstance = jest.fn();
	const debug: jest.SpyInstance = jest.fn();
	const warning: jest.SpyInstance = jest.fn();

	const logger = {
		debug,
		error,
		warning,
	};

	sandbox.app.bind(Identifiers.LogService).toConstantValue(logger);

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

	sandbox.app.bind(Identifiers.DatabaseService).to(MockDatabaseService);

	sandbox.app.bind(Identifiers.RoundState).to(MockRoundState);

	sandbox.app.bind(Identifiers.BlockchainService).to(MockBlockchainService);

	sandbox.app.bind(Identifiers.WalletRepository).to(MockWalletRepository);

	sandbox.app.bind(Identifiers.TriggerService).to(Services.Triggers.Triggers).inSingletonScope();

	sandbox.app
		.get<Services.Triggers.Triggers>(Identifiers.TriggerService)
		.bind("getActiveDelegates", new GetActiveDelegatesAction(sandbox.app));

	const delegateTracker = sandbox.app.resolve(DelegateTracker);

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
