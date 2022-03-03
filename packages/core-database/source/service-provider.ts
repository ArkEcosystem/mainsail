import { Contracts, Identifiers } from "@arkecosystem/core-contracts";
import { Providers } from "@arkecosystem/core-kernel";
import Joi from "joi";

import { BlockFilter } from "./block-filter";
import { BlockHistoryService } from "./block-history-service";
import { DatabaseService } from "./database-service";
import { DatabaseEvent } from "./events";
import { ModelConverter } from "./model-converter";
import { BlockRepository, RoundRepository, TransactionRepository } from "./repositories";
import { TransactionFilter } from "./transaction-filter";
import { TransactionHistoryService } from "./transaction-history-service";
import { typeorm } from "./typeorm";
import { SnakeNamingStrategy } from "./utils/snake-naming-strategy";
import { WalletsTableService } from "./wallets-table-service";

export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		const logger: Contracts.Kernel.Logger = this.app.get(Identifiers.LogService);

		logger.info("Connecting to database: " + (this.config().all().connection as any).database);

		this.app.bind(Identifiers.DatabaseConnection).toConstantValue(await this.connect());

		logger.debug("Connection established.");

		this.app.bind(Identifiers.DatabaseRoundRepository).toConstantValue(this.getRoundRepository());

		this.app.bind(Identifiers.DatabaseBlockRepository).toConstantValue(this.getBlockRepository());
		this.app.bind(Identifiers.DatabaseBlockFilter).to(BlockFilter);
		this.app.bind(Identifiers.BlockHistoryService).to(BlockHistoryService);

		this.app.bind(Identifiers.DatabaseTransactionRepository).toConstantValue(this.getTransactionRepository());
		this.app.bind(Identifiers.DatabaseTransactionFilter).to(TransactionFilter);
		this.app.bind(Identifiers.TransactionHistoryService).to(TransactionHistoryService);

		this.app.bind(Identifiers.DatabaseModelConverter).to(ModelConverter);
		this.app.bind(Identifiers.DatabaseService).to(DatabaseService).inSingletonScope();
		this.app.bind(Identifiers.DatabaseWalletsTableService).to(WalletsTableService);
	}

	public async boot(): Promise<void> {
		await this.app.get<DatabaseService>(Identifiers.DatabaseService).initialize();
	}

	public async dispose(): Promise<void> {
		await this.app.get<DatabaseService>(Identifiers.DatabaseService).disconnect();
	}

	public async required(): Promise<boolean> {
		return true;
	}

	public async connect(): Promise<any> {
		const connection: Record<string, any> = this.config().all().connection as any;

		void this.app
			.get<Contracts.Kernel.EventDispatcher>(Identifiers.EventDispatcherService)
			.dispatch(DatabaseEvent.PRE_CONNECT);

		if (this.app.isBound(Identifiers.DatabaseLogger)) {
			connection.logging = "all";
			connection.logger = this.app.get(Identifiers.DatabaseLogger);
		}

		return typeorm.createConnection({
			...(connection as any),
			// TODO: expose entities to allow extending the models by plugins
			entities: [__dirname + "/models/*.js"],
			migrations: [__dirname + "/migrations/*.js"],
			migrationsRun: true,
			namingStrategy: new SnakeNamingStrategy(),
		});
	}

	public getRoundRepository(): RoundRepository {
		return typeorm.getCustomRepository(RoundRepository);
	}

	public getBlockRepository(): BlockRepository {
		return typeorm.getCustomRepository(BlockRepository);
	}

	public getTransactionRepository(): TransactionRepository {
		return typeorm.getCustomRepository(TransactionRepository);
	}

	public configSchema(): object {
		return Joi.object({
			connection: Joi.object({
				database: Joi.string().required(),
				entityPrefix: Joi.string().required(),
				host: Joi.string().required(),
				logging: Joi.bool().required(),
				password: Joi.string().required(),
				port: Joi.number().integer().min(1).max(65_535).required(),
				synchronize: Joi.bool().required(),
				type: Joi.string().required(),
				username: Joi.string().required(),
			}).required(),
		}).unknown(true);
	}
}
