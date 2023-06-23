import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Database } from "lmdb";
import { RoundState } from "./round-state";

@injectable()
export class Storage implements Contracts.Consensus.IConsensusStorage {
    @inject(Identifiers.Database.ConsensusStorage)
    private readonly consensusStorage!: Database;

    public async getState(): Promise<Contracts.Consensus.IConsensusState | undefined> {
        if (!this.consensusStorage.doesExist("consensus-state")) {
            return undefined;
        }

        const state = await this.consensusStorage.get("consensus-state");
        return this.#deserializeConsensusState(state);
    }

    public async saveState(state: Contracts.Consensus.IConsensusState): Promise<void> {
        // always overwrite existing state; we only care about state for uncommitted blocks
        const serialized = await this.#serializeConsensusState(state);
        await this.consensusStorage.put("consensus-state", serialized);
    }

    async #serializeConsensusState(state: Contracts.Consensus.IConsensusState): Promise<Buffer> {
        // TODO: consider more optimized format
        const serialized: Contracts.Consensus.ISerializedConsensusState = {
            height: state.height,
            round: state.round,
            step: state.step,
            validRound: state.validRound,
            lockedRound: state.lockedRound,
            validValue: state.validValue ? await state.validValue.serialize() : null,
            lockedValue: state.lockedValue ? await state.lockedValue.serialize() : null,
        };

        return Buffer.from(JSON.stringify(serialized), "utf-8");
    }

    async #deserializeConsensusState(bytes: Buffer): Promise<Contracts.Consensus.IConsensusState> {
        const data: Contracts.Consensus.ISerializedConsensusState = JSON.parse(bytes.toString("utf-8"));

        let validValue: Contracts.Consensus.IRoundState | undefined = undefined;
        if (data.validValue !== null) {
            validValue = await new RoundState().deserialize(data.validValue);
        }

        let lockedValue: Contracts.Consensus.IRoundState | undefined = undefined;
        if (data.lockedValue !== null) {
            lockedValue = await new RoundState().deserialize(data.lockedValue);
        }

        return {
            height: data.height,
            round: data.round,
            step: data.step,
            lockedRound: data.lockedRound,
            lockedValue,
            validRound: data.validRound,
            validValue,
        };
    }
}