import type { Contracts } from "@mainsail/contracts";
import type { Application } from "@mainsail/kernel";

export type SandboxCallback = (context: { app: Application; container: Contracts.Kernel.Container.Container }) => void;
