import { RepositoryDataSource, MultiPaymentRepository, MultiPaymentRepositoryExtension } from "../contracts.js";
import { MultiPayment } from "../models/multi-payments.js";
import { makeExtendedRepository } from "./repository-extension.js";

export const makeMultiPaymentRepository = (dataSource: RepositoryDataSource): MultiPaymentRepository =>
	makeExtendedRepository<MultiPayment, MultiPaymentRepositoryExtension>(MultiPayment, dataSource, {
		// Add any extensions here
	});
