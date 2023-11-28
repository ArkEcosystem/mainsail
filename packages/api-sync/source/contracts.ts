import { Contracts } from "@mainsail/contracts";

export interface EventListener extends Contracts.Kernel.EventListener {
	register(): Promise<void>;
	boot(): Promise<void>;
	dispose(): Promise<void>;
}

export interface Listeners {
	register(): Promise<void>;
	bootstrap(): Promise<void>;
	dispose(): Promise<void>;
}