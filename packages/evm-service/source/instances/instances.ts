import { injectable } from "@mainsail/container";

import { EvmInstance } from "./evm.js";

@injectable()
export class MainEvm extends EvmInstance {}

@injectable()
export class ValidatorEvm extends EvmInstance {}

@injectable()
export class TransactionPoolEvm extends EvmInstance {}

@injectable()
export class RpcEvm extends EvmInstance {}
