import { Contracts } from "@mainsail/contracts";
import { Application } from "@mainsail/kernel";

export type SandboxCallback = (context: { app: Application; container: Contracts.Kernel.Container.Container }) => void;
