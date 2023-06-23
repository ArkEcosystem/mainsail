import Hapi from "@hapi/hapi";
import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Utils } from "@mainsail/kernel";

import { Controller } from "./controller";

@injectable()
export class ConsensusController extends Controller {
    @inject(Identifiers.Consensus.Storage)
    private readonly storage!: Contracts.Consensus.IConsensusStorage;

    public async state(request: Hapi.Request) {
        const state = await this.storage.getState();
        if (!state) {
            return {};
        }

        Utils.assert.defined<Contracts.Consensus.IConsensusState>(state);

        return {
            data: {
                height: state.height,
                round: state.round,
                step: state.step,
                validRound: state.validRound,
                lockedRound: state.lockedRound,
                validValue: state.validValue ? await state.validValue.serialize() : null,
                lockedValue: state.lockedValue ? await state.lockedValue.serialize() : null,
            },
        };
    }
}
