import type { Contracts } from "@mainsail/contracts";

import { Identifiers } from "@mainsail/constants";
import { injectable } from "@mainsail/container";
import { Providers } from "@mainsail/kernel";
import Joi from "joi";

import { ApiNodeDiscoverer } from "./api-node-discoverer.js";
import { ApiNodeProcessor } from "./api-node-processor.js";
import { ApiNodeRepository } from "./api-node-repository.js";
import { ApiNodeVerifier } from "./api-node-verifier.js";
import { ApiNode } from "./api-node.js";
import { Service } from "./service.js";
import { normalizeUrl } from "./utils/index.js";

// The directory of public API nodes: learned from the peers, checked over HTTP and announced to the API.
// Not needed for consensus, so a node that does not serve an API leaves this plugin out; its peers then
// get an empty list from the getApiNodes route, which @mainsail/p2p-service serves either way. Requires
// the @mainsail/p2p-service service provider.
@injectable()
export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		this.app
			.bind<Contracts.P2PApiNodes.ApiNodeFactory>(Identifiers.P2P.ApiNode.Factory)
			.toFactory(() => (url: string) => this.app.resolve(ApiNode).init(normalizeUrl(url)));

		this.app.bind(Identifiers.P2P.ApiNode.Repository).to(ApiNodeRepository).inSingletonScope();
		this.app.bind(Identifiers.P2P.ApiNode.Verifier).to(ApiNodeVerifier).inSingletonScope();
		this.app.bind(Identifiers.P2P.ApiNode.Processor).to(ApiNodeProcessor).inSingletonScope();
		this.app.bind(Identifiers.P2P.ApiNode.Discoverer).to(ApiNodeDiscoverer).inSingletonScope();
		this.app.bind(Identifiers.P2P.ApiNode.Service).to(Service).inSingletonScope();
	}

	public async boot(): Promise<void> {
		this.app.get<Contracts.P2PApiNodes.Service>(Identifiers.P2P.ApiNode.Service).boot();
	}

	public async dispose(): Promise<void> {
		this.app.get<Contracts.P2PApiNodes.Service>(Identifiers.P2P.ApiNode.Service).dispose();
	}

	// Mirrors defaults.ts.
	public configSchema(): Joi.AnySchema {
		return Joi.object({
			apiNodes: Joi.array()
				.items(Joi.string().uri({ scheme: ["http", "https"] }))
				.required(),
			apiNodesMaxContentLength: Joi.number().integer().min(0).required(),
		}).unknown(true);
	}
}
