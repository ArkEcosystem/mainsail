export namespace Api {
	export enum ServerType {
		Http = "HTTP",
		Https = "HTTPS",
	}
}

export namespace Rpc {
	export enum ErrorCode {
		RpcServerError = -32_000,
		ParseError = -32_700,
		InvalidRequest = -32_600,
		MethodNotFound = -32_601,
		InvalidParameters = -32_602,
		InternalError = -32_603,
	}
}

export namespace Consensus {
	export enum Step {
		Propose = 0,
		Prevote = 1,
		Precommit = 2,
	}

	export enum ProcessorResult {
		Invalid = 0,
		Accepted = 1,
		Skipped = 2,
	}
}

export namespace Crypto {
	export enum MessageType {
		Prevote = 1,
		Precommit = 2,
	}
}

export namespace Evm {
	// Supported EVM specs
	// https://github.com/ethereum/execution-specs
	export enum SpecId {
		SHANGHAI = "Shanghai",
		LATEST = "Latest",
	}
}

export namespace P2P {
	export enum PeerProtocol {
		Http = 0,
		Https = 1,
	}
}

export namespace TransactionPool {
	export enum PeerProtocol {
		Http = 0,
		Https = 1,
	}
}
