import { IValidatorRoundRepository, IValidatorRoundRepositoryExtension, RepositoryDataSource } from "../contracts";
import { ValidatorRound } from "../models/validator-round";
import { makeExtendedRepository } from "./repository-extension";

export const makeValidatorRoundRepository = (dataSource: RepositoryDataSource): IValidatorRoundRepository =>
	makeExtendedRepository<ValidatorRound, IValidatorRoundRepositoryExtension>(ValidatorRound, dataSource, {
		// Add any extensions here
	});
