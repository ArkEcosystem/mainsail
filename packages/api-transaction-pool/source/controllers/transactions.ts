import type { Types } from "@mainsail/api-common";
import type { Contracts } from "@mainsail/contracts";

import { notFound } from "@hapi/boom";
import { AbstractController } from "@mainsail/api-common";
import { Identifiers } from "@mainsail/constants";
import { inject, injectable, tagged } from "@mainsail/container";

import { TransactionResource } from "../resources/index.js";

// Pool addresses are EIP-55 checksummed while queries may use any casing.
const toAddresses = (parameter: string | string[]): Set<string> =>
	new Set([parameter].flat().map((address) => address.toLowerCase()));

const matchesAddress = (addresses: Set<string>, value: string | undefined): boolean =>
	value !== undefined && addresses.has(value.toLowerCase());

@injectable()
export class TransactionsController extends AbstractController {
	@inject(Identifiers.ServiceProvider.Configuration)
	@tagged("plugin", "api-transaction-pool")
	private readonly configuration!: Contracts.Kernel.PluginConfiguration;

	@inject(Identifiers.TransactionPool.Processor)
	private readonly processor!: Contracts.TransactionPool.Processor;

	@inject(Identifiers.TransactionPool.Query)
	private readonly poolQuery!: Contracts.TransactionPool.Query;

	public async store(request: Types.HapiRequest): Promise<object> {
		const result = await this.processor.process(
			// @ts-ignore
			request.payload.transactions.map((transaction: string) => Buffer.from(transaction, "hex")),
		);
		return {
			data: {
				accept: result.accept,
				broadcast: result.broadcast,
				excess: result.excess,
				invalid: result.invalid,
			},
			errors: result.errors,
		};
	}

	public async unconfirmed(request: Types.HapiRequest): Promise<Contracts.Api.ResultsPage<object>> {
		const pagination: Contracts.Api.Pagination = super.getListingPage(request);

		const poolQuery = this.poolQuery.getFromHighestPriority();

		if (request.query.from) {
			const from = toAddresses(request.query.from);
			poolQuery.wherePredicate(async (t) => matchesAddress(from, t.from));
		}

		if (request.query.to) {
			const to = toAddresses(request.query.to);
			poolQuery.wherePredicate(async (t) => matchesAddress(to, t.to));
		}

		if (request.query.address) {
			const addresses = toAddresses(request.query.address);
			poolQuery.wherePredicate(async (t) => matchesAddress(addresses, t.from) || matchesAddress(addresses, t.to));
		}

		const all = await poolQuery.all();
		const page = all.slice(pagination.offset, pagination.offset + pagination.limit);
		const maxBytes = this.configuration.getRequired<number>("plugins.pagination.maxBytes");

		const results: object[] = [];
		let bytes = 0;

		for (const transaction of page) {
			const resource = await super.toResource(transaction, TransactionResource);
			bytes += Buffer.byteLength(JSON.stringify(resource));

			if (results.length > 0 && bytes > maxBytes) {
				break;
			}

			results.push(resource);
		}

		return {
			nextOffset: results.length < page.length ? pagination.offset + results.length : undefined,
			results,
			totalCount: all.length,
		};
	}

	public async showUnconfirmed(request: Types.HapiRequest): Promise<object> {
		const transactionQuery = this.poolQuery.getAll().whereHash(request.params.hash);

		if ((await transactionQuery.has()) === false) {
			return notFound("Transaction not found");
		}

		const transaction = await transactionQuery.first();

		return super.respondWithResource(transaction, TransactionResource);
	}
}
