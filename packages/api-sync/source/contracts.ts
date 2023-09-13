import { Contracts } from "@mainsail/contracts";

export interface EventListener extends Contracts.Kernel.EventListener {
    boot(): Promise<void>;
    dispose(): Promise<void>;
}