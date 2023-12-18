import { RepositoryDataSource, ValidatorRoundRepository, ValidatorRoundRepositoryExtension } from "../contracts";
import { ValidatorRound } from "../models/validator-round";
import { makeExtendedRepository } from "./repository-extension";

export const makeValidatorRoundRepository = (dataSource: RepositoryDataSource): ValidatorRoundRepository =>
	makeExtendedRepository<ValidatorRound, ValidatorRoundRepositoryExtension>(ValidatorRound, dataSource, {
		// Add any extensions here
	});
