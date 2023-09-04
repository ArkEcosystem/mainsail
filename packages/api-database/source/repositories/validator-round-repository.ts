import { IValidatorRoundRepository, RepositoryDataSource } from "../contracts";
import { ValidatorRound } from "../models/validator-round";

export const makeValidatorRoundRepository = (dataSource: RepositoryDataSource): IValidatorRoundRepository =>
	dataSource.getRepository(ValidatorRound).extend({
		// Add any extensions here
	});
