import { ContractRepository, ContractRepositoryExtension, RepositoryDataSource } from "../contracts.js";
import { Contract } from "../models/index.js";
import { makeExtendedRepository } from "./repository-extension.js";

export const makeContractRepository = (dataSource: RepositoryDataSource): ContractRepository =>
	makeExtendedRepository<Contract, ContractRepositoryExtension>(Contract, dataSource, {
		// Add any extensions here
	});
