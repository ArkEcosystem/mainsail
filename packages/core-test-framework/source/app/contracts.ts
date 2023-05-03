import { interfaces } from "@mainsail/core-container";
import { Application } from "@mainsail/core-kernel";

export type SandboxCallback = (context: { app: Application; container: interfaces.Container }) => void;
