import { ReceiptRepository, ReceiptRepositoryExtension, RepositoryDataSource } from "../contracts.js";
import { Receipt } from "../models/index.js";
import { makeExtendedRepository } from "./repository-extension.js";

export const makeReceiptRepository = (dataSource: RepositoryDataSource): ReceiptRepository =>
	makeExtendedRepository<Receipt, ReceiptRepositoryExtension>(Receipt, dataSource, {});
