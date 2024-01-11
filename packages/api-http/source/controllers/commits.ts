import Boom from "@hapi/boom";
import Hapi from "@hapi/hapi";
import {
    Contracts as ApiDatabaseContracts,
    Identifiers as ApiDatabaseIdentifiers,
    Search,
} from "@mainsail/api-database";
import { inject, injectable } from "@mainsail/container";
import { BigNumber, validatorSetUnpack } from "@mainsail/utils";
import { Controller } from "./controller";

@injectable()
export class CommitsController extends Controller {
    @inject(ApiDatabaseIdentifiers.BlockRepositoryFactory)
    private readonly blockRepositoryFactory!: ApiDatabaseContracts.BlockRepositoryFactory;

    @inject(ApiDatabaseIdentifiers.ValidatorRoundRepositoryFactory)
    private readonly validatorRoundRepositoryFactory!: ApiDatabaseContracts.ValidatorRoundRepositoryFactory;

    public async show(request: Hapi.Request) {
        const blockRepository = this.blockRepositoryFactory();
        const validatorRoundRepository = this.validatorRoundRepositoryFactory();
        const blockCriteria = this.getBlockCriteriaByIdOrHeight(request.params.id);

        const block = await blockRepository.findOneByCriteria(blockCriteria);
        if (!block) {
            return Boom.notFound("Block not found");
        }

        const round = await validatorRoundRepository
            .createQueryBuilder()
            .select()
            .where("round = :validatorRound", { validatorRound: block.validatorRound })
            .getOneOrFail();

        // map bitmask -> indexes -> round.validators
        const packed = BigNumber.make(block.validatorSet).toBigInt();
        const unpacked = validatorSetUnpack(packed, round.validators.length);
        const validators = unpacked.filter(Boolean).map(((_, index) => round.validators[index]));

        return {
            data: {
                height: block.height,
                signature: block.signature,
                validators,
            },
        };
    }

    private getBlockCriteriaByIdOrHeight(idOrHeight: string): Search.Criteria.OrBlockCriteria {
        const asHeight = Number(idOrHeight);
        // NOTE: This assumes all block ids are sha256 and never a valid nubmer below this threshold.
        return asHeight && asHeight <= Number.MAX_SAFE_INTEGER ? { height: asHeight } : { id: idOrHeight };
    }
}
