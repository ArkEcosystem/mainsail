import {
	Contracts as ApiDatabaseContracts,
	Identifiers as ApiDatabaseIdentifiers,
	Models,
} from "@mainsail/api-database";
import { inject, injectable } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";
import { Enums, Utils } from "@mainsail/kernel";

import { AbstractListener, ListenerEvent, ListenerEventMapping } from "./abstract-listener.js";

@injectable()
export class Mempool extends AbstractListener<Contracts.Crypto.TransactionData, Models.MempoolTransaction> {
	@inject(ApiDatabaseIdentifiers.MempoolTransactionRepositoryFactory)
	private readonly mempoolTransactionRepositoryFactory!: ApiDatabaseContracts.MempoolTransactionRepositoryFactory;

	protected getEventMapping(): ListenerEventMapping {
		return {
			[Enums.TransactionEvent.AddedToPool]: ListenerEvent.OnAdded,
			[Enums.TransactionEvent.Applied]: ListenerEvent.OnRemoved,
			[Enums.TransactionEvent.Expired]: ListenerEvent.OnRemoved,
			[Enums.TransactionEvent.RemovedFromPool]: ListenerEvent.OnRemoved,
		};
	}

	protected getEventId(event: Contracts.Crypto.TransactionData): string {
		const id = event.id;
		Utils.assert.defined<string>(id);
		return id;
	}

	protected mapEventToEntity(event: Contracts.Crypto.TransactionData): Models.MempoolTransaction {
		return {
			amount: event.amount.toFixed(),
			asset: event.asset,
			fee: event.fee.toFixed(),
			id: this.getEventId(event),
			nonce: event.nonce.toFixed(),
			recipientId: event.recipientId,
			senderPublicKey: event.senderPublicKey,
			signature: event.signature,
			signatures: event.signatures,
			type: event.type,
			typeGroup: event.typeGroup,
			vendorField: event.vendorField,
			version: event.version,
		};
	}

	protected makeEntityRepository(
		dataSource: ApiDatabaseContracts.RepositoryDataSource,
	): ApiDatabaseContracts.Repository<Models.MempoolTransaction> {
		return this.mempoolTransactionRepositoryFactory(dataSource);
	}
}
