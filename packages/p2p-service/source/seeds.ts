import type { Contracts } from "@mainsail/contracts";

import { Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";
import { http, IpAddress } from "@mainsail/utils";
import { readJSONSync } from "fs-extra/esm";

type SeedData = { ip: string; port: number };

// Moved from PeerDiscoverer.populateSeedPeers of @mainsail/p2p: the list in peers.json, extended by
// the first configured source that answers (a local file or a URL returning the same shape).
@injectable()
export class Seeds implements Contracts.P2PService.Seeds {
	@inject(Identifiers.Application.Instance)
	private readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.P2P.Logger)
	private readonly logger!: Contracts.P2PService.Logger;

	readonly #seeds = new Set<string>();

	public async load(): Promise<void> {
		const list = this.app.config<{ list: SeedData[] }>("peers")?.list ?? [];

		try {
			list.push(...(await this.#loadFromSources()));
		} catch {}

		for (const { ip } of list) {
			const sanitizedIp = IpAddress.sanitizeRemoteAddress(ip);
			if (sanitizedIp) {
				this.#seeds.add(sanitizedIp);
			}
		}

		if (this.#seeds.size === 0) {
			await this.app.terminate("No seed peers defined in peers.json");
		}
	}

	public all(): string[] {
		return [...this.#seeds];
	}

	public isSeed(ip: string): boolean {
		return this.#seeds.has(ip);
	}

	// TODO: Get from all sources
	async #loadFromSources(): Promise<SeedData[]> {
		const urls: string[] = this.app.config<{ sources: string[] }>("peers")?.sources ?? [];

		for (const url of urls) {
			// Local File...
			if (url.startsWith("/")) {
				return readJSONSync(url);
			}

			// URL...
			this.logger.debug(`GET ${url}`, "p2p");
			const { data } = await http.get<string | SeedData[]>(url);
			return typeof data === "object" ? data : JSON.parse(data);
		}

		return [];
	}
}
