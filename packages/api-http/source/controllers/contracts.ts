import Boom from "@hapi/boom";
import Hapi from "@hapi/hapi";
import { Contracts as ApiDatabaseContracts, Identifiers as ApiDatabaseIdentifiers } from "@mainsail/api-database";
import { inject, injectable } from "@mainsail/container";

import { Controller } from "./controller.js";

@injectable()
export class ContractsController extends Controller {
	@inject(ApiDatabaseIdentifiers.ContractRepositoryFactory)
	private readonly contractRepositoryFactory!: ApiDatabaseContracts.ContractRepositoryFactory;

	public async index(request: Hapi.Request) {
		const contractRepository = this.contractRepositoryFactory();

		const contracts = await contractRepository.createQueryBuilder().orderBy("name").addOrderBy("address").getMany();

		return {
			data: contracts.reduce((accumulator, previous) => {
				accumulator[previous.name] = {
					activeImplementation: previous.activeImplementation,
					address: previous.address,
					implementations: previous.implementations.map((impl) => impl.address),
					proxy: previous.proxy,
				};
				return accumulator;
			}, {}),
		};
	}

	public async abi(request: Hapi.Request) {
		const contractRepository = this.contractRepositoryFactory();

		const contract = await contractRepository
			.createQueryBuilder()
			.select()
			.where("name = :name", { name: request.params.name })
			.getOne();

		if (!contract) {
			return Boom.notFound("contract not found");
		}

		const implementation = contract.implementations.find((impl) => impl.address === request.params.implementation);
		if (!implementation) {
			return Boom.notFound("abi not found");
		}

		return {
			data: {
				abi: implementation.abi,
			},
		};
	}
}
