import { interfaces } from "@mainsail/container";
import { Application } from "@mainsail/core-kernel";

export type SandboxCallback = (context: { app: Application; container: interfaces.Container }) => void;
