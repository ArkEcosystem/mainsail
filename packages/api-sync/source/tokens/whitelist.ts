import type { Contracts } from "@mainsail/contracts";

import {
	Contracts as ApiDatabaseContracts,
	Identifiers as ApiDatabaseIdentifiers,
	Models,
} from "@mainsail/api-database";
import { Identifiers, Units } from "@mainsail/constants";
import { inject, injectable, tagged } from "@mainsail/container";
import { ensureError, http } from "@mainsail/utils";

import { isValidPgTimestamptz, sanitizeComment } from "./sanitizers.js";

interface WhitelistedToken {
	address: string;
	comment?: string;
	createdAt: string;
}

@injectable()
export class TokenWhitelist {
	@inject(Identifiers.ServiceProvider.Configuration)
	@tagged("plugin", "api-sync")
	private readonly pluginConfiguration!: Contracts.Kernel.PluginConfiguration;

	@inject(ApiDatabaseIdentifiers.DataSource)
	private readonly dataSource!: ApiDatabaseContracts.RepositoryDataSource;

	@inject(Identifiers.ApiSync.Logger)
	private readonly logger!: Contracts.ApiSync.Logger;

	@inject(Identifiers.Cryptography.Identity.Address.Factory)
	private readonly addressFactory!: Contracts.Crypto.AddressFactory;

	#syncTimeout?: NodeJS.Timeout;

	public async bootstrap(): Promise<void> {
		const syncInterval = this.#getTokenWhitelistRefreshIntervalMs();

		this.logger.info(`Starting TokenWhitelist using remote: ${this.#getTokenWhitelistRemoteUrl()}`);

		const run = async () => {
			try {
				await this.#syncWhitelist();
			} catch (rawError) {
				const error = ensureError(rawError);
				this.logger.error(`#syncWhitelist failed: ${error}`);
			} finally {
				this.#syncTimeout = setTimeout(() => {
					void run();
				}, syncInterval);
			}
		};

		void run();
	}

	public async dispose(): Promise<void> {
		if (this.#syncTimeout) {
			clearTimeout(this.#syncTimeout);
		}
	}

	async #syncWhitelist(): Promise<void> {
		const latestWhitelist = await this.#fetchWhitelist();
		if (!latestWhitelist) {
			return;
		}

		const sanitizedWhitelist = await this.#sanitizeWhitelist(latestWhitelist);

		this.logger.debug(`updating token whitelist (size: ${sanitizedWhitelist.length})`);

		await this.dataSource.transaction(async (entityManager) => {
			await entityManager.clear(Models.TokenWhitelist);
			await entityManager.save(Models.TokenWhitelist, sanitizedWhitelist, { chunk: 1000 });
		});
	}

	async #fetchWhitelist(): Promise<WhitelistedToken[] | undefined> {
		const remoteUrl = this.#getTokenWhitelistRemoteUrl();
		if (!remoteUrl) {
			return undefined;
		}

		try {
			const { data } = await http.get<string>(this.#getTokenWhitelistRemoteUrl(), {
				maxContentLength: 16 * Units.KILOBYTE,
				timeout: 2500,
			});
			return JSON.parse(data) as WhitelistedToken[];
		} catch (rawError) {
			const error = ensureError(rawError);
			this.logger.error(`fetchWhitelist failed: ${error}`);
		}

		return undefined;
	}

	async #sanitizeWhitelist(whitelist: WhitelistedToken[]): Promise<WhitelistedToken[]> {
		const sanitized: WhitelistedToken[] = [];

		for (const token of whitelist) {
			const sanitizedToken = await this.#sanitizeToken(token);
			if (!sanitizedToken) {
				continue;
			}

			sanitized.push(sanitizedToken);
		}

		return sanitized;
	}

	async #sanitizeToken(token: WhitelistedToken): Promise<WhitelistedToken | undefined> {
		try {
			if (!(await this.addressFactory.validate(token.address))) {
				this.logger.debugExtra(`ignoring token for whitelist because of malformed address: ${token.address}`);
				return undefined;
			}

			if (!isValidPgTimestamptz(token.createdAt)) {
				this.logger.debugExtra(
					`ignoring token ${token.address} for whitelist because of malformed timestamp: ${token.createdAt}`,
				);
				return undefined;
			}

			if (token.comment) {
				token.comment = sanitizeComment(token.comment);
			}
		} catch (rawError) {
			const error = ensureError(rawError);
			this.logger.debugExtra(
				`ignoring token ${token.address} for whitelist because of exception: ${error.message}`,
			);
			return undefined;
		}

		return token;
	}

	#getTokenWhitelistRemoteUrl(): string {
		return this.pluginConfiguration.getRequired<string>("tokenWhitelistRemoteUrl");
	}

	#getTokenWhitelistRefreshIntervalMs(): number {
		return this.pluginConfiguration.getRequired<number>("tokenWhitelistRefreshInterval");
	}
}
