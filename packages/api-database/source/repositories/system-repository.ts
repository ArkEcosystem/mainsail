import { RepositoryDataSource, SystemRepository, SystemRepositoryExtension } from "../contracts.js";
import { System } from "../models/index.js";
import { makeExtendedRepository } from "./repository-extension.js";

export const makeSystemRepository = (dataSource: RepositoryDataSource): SystemRepository =>
	makeExtendedRepository<System, SystemRepositoryExtension>(System, dataSource, {
		async inMaintenance(): Promise<boolean> {
			const result = await this.query(
				`
					select exists(
						select 1 as in_maintenance from system
						where key = 'maintenance' and value = '1'
						limit 1
					) as in_maintenance;
					`,
			);

			return result?.[0].in_maintenance ?? false;
		},

		async setMaintenance(enabled: boolean): Promise<void> {
			if (!enabled) {
				await this.createQueryBuilder().where("key = :key", { key: "maintenance" }).delete().execute();
				return;
			}

			await this.createQueryBuilder()
				.insert()
				.values({ key: "maintenance", value: "1" })
				.orUpdate(["value"], ["key"])
				.execute();
		},
	});
