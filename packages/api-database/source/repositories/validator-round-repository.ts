import { RepositoryDataSource, ValidatorRoundRepository, ValidatorRoundRepositoryExtension } from "../contracts.js";
import { ValidatorRound } from "../models/validator-round.js";
import { makeExtendedRepository } from "./repository-extension.js";

export const makeValidatorRoundRepository = (dataSource: RepositoryDataSource): ValidatorRoundRepository =>
	makeExtendedRepository<ValidatorRound, ValidatorRoundRepositoryExtension>(ValidatorRound, dataSource, {
		// Add any extensions here
	});
