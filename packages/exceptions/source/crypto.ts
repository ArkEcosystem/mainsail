import type { Contracts } from "@mainsail/contracts";

import { Exception } from "./base.js";

export class Bip38CompressionError extends Exception {
	public constructor(expected: string | number, given: string | number) {
		super(`Expected flag to be ${expected}, but got ${given}.`);
	}
}

export class Bip38LengthError extends Exception {
	public constructor(expected: string | number, given: string | number) {
		super(`Expected length to be ${expected}, but got ${given}.`);
	}
}

export class Bip38PrefixError extends Exception {
	public constructor(expected: string | number, given: string | number) {
		super(`Expected prefix to be ${expected}, but got ${given}.`);
	}
}

export class Bip38TypeError extends Exception {
	public constructor(expected: string | number, given: string | number) {
		super(`Expected type to be ${expected}, but got ${given}.`);
	}
}

export class NetworkVersionError extends Exception {
	public constructor(expected: string | number, given: string | number) {
		super(`Expected version to be ${expected}, but got ${given}.`);
	}
}

export class WifNetworkError extends Exception {
	public constructor(expected: string | number, given: string | number) {
		super(`Expected WIF network version to be ${expected}, but got ${given}.`);
	}
}

export class PrivateKeyLengthError extends Exception {
	public constructor(expected: string | number, given: string | number) {
		super(`Expected length to be ${expected}, but got ${given}.`);
	}
}

export class PublicKeyError extends Exception {
	public constructor(given: string) {
		super(`Expected ${given} to be a valid public key.`);
	}
}

export class AddressNetworkError extends Exception {
	public constructor(what: string) {
		super(what);
	}
}

export class MessageSchemaError extends Exception {
	public constructor(type: string, what: string) {
		super(`${type}: ${what}`);
	}
}

export class MessageDeserializationError extends Exception {
	public constructor(message: string) {
		super(`Message deserialization failed: ${message}`);
	}
}

export class InvalidTransactionBytesError extends Exception {
	public constructor(message: string) {
		super(`Failed to deserialize transaction, encountered invalid bytes: ${message}`);
	}
}

export class TransactionSchemaError extends Exception {
	public constructor(what: string) {
		super(what);
	}
}

export class TransactionVersionError extends Exception {
	public constructor(given: number) {
		super(`Version ${given} not supported.`);
	}
}

export class UnkownTransactionError extends Exception {
	public constructor(given: string) {
		super(`Unknown transaction type: ${given}`);
	}
}

export class TransactionAlreadyRegisteredError extends Exception {
	public constructor(name: string) {
		super(`Transaction type ${name} is already registered.`);
	}
}

export class TransactionKeyAlreadyRegisteredError extends Exception {
	public constructor(name: string) {
		super(`Transaction key ${name} is already registered.`);
	}
}

export class TransactionVersionAlreadyRegisteredError extends Exception {
	public constructor(name: string, version: number) {
		super(`Transaction type ${name} is already registered in version ${version}.`);
	}
}

export class MissingMilestoneFeeError extends Exception {
	public constructor(name: string) {
		super(`Missing milestone fee for '${name}'.`);
	}
}

export class MaximumPaymentCountExceededError extends Exception {
	public constructor(limit: number) {
		super(`Number of payments exceeded the allowed maximum of ${limit}.`);
	}
}

export class MinimumPaymentCountSubceededError extends Exception {
	public constructor() {
		super(`Number of payments subceeded the required minimum of 2.`);
	}
}

export class MissingTransactionSignatureError extends Exception {
	public constructor() {
		super(`Expected the transaction to be signed.`);
	}
}

export class BlockSchemaError extends Exception {
	public constructor(height: number, what: string) {
		super(`Height (${height}): ${what}`);
	}
}

export class PreviousBlockIdFormatError extends Exception {
	public constructor(thisBlockHeight: number, previousBlockId: string) {
		super(
			`The config denotes that the block at height ${thisBlockHeight - 1} ` +
				`must use full SHA256 block id, but the next block (at ${thisBlockHeight}) ` +
				`contains previous block id "${previousBlockId}"`,
		);
	}
}

export class InvalidBlockBytesError extends Exception {
	public constructor(message: string) {
		super(`Failed to deserialize block, encountered invalid bytes: ${message}`);
	}
}

export class EvmCallIncompleteAssetError extends Exception {
	public constructor() {
		super(`EvmCall asset is incomplete`);
	}
}

export class EvmCallMissingRecipientError extends Exception {
	public constructor() {
		super(`EvmCall is missing recipient`);
	}
}

export class InvalidMilestoneConfigurationError extends Exception {
	public constructor(message: string) {
		super(message);
	}
}

export class InvalidNumberOfRoundValidatorsError extends Exception {
	public constructor(message: string) {
		super(message);
	}
}

export class DeactivatedTransactionHandlerError extends Exception {
	public constructor(type: number) {
		super(`Transaction type ${type.toString()} is deactivated.`);
	}
}

export class UnsatisfiedDependencyError extends Exception {
	public constructor(type: number) {
		super(`Transaction type ${type.toString()} is missing required dependencies`);
	}
}

export class AlreadyRegisteredError extends Exception {
	public constructor(type: number) {
		super(`Transaction type ${type.toString()} is already registered`);
	}
}

export class UnexpectedNonceError extends Exception {
	public constructor(txNonce: bigint, sender: Contracts.State.Wallet) {
		super(
			`Cannot apply a transaction with nonce ${txNonce.toString()}: the ` +
				`sender ${sender.getAddress()} has nonce ${sender.getNonce().toString()}${sender.getNonce() === 0n ? " (this might be due to a wrong signature)" : ""}.`,
		);
	}
}

export class ColdWalletError extends Exception {
	public constructor() {
		super(`Insufficient balance in database wallet. Wallet is not allowed to spend before funding is confirmed.`);
	}
}

export class InsufficientBalanceError extends Exception {
	public constructor() {
		super(`Insufficient balance in the wallet.`);
	}
}

export class SenderWalletMismatchError extends Exception {
	public constructor() {
		super(`Failed to apply transaction, because the public key does not match the wallet.`);
	}
}

export class UnexpectedLegacySecondSignatureError extends Exception {
	public constructor() {
		super(`Failed to apply transaction, because wallet does not allow legacy second signatures.`);
	}
}

export class InvalidLegacySecondSignatureError extends Exception {
	public constructor() {
		super(`Failed to apply transaction, because the legacy second signature could not be verified.`);
	}
}

export class MissingLegacySecondSignatureError extends Exception {
	public constructor() {
		super(`Failed to apply transaction, because the legacy second signature is missing.`);
	}
}

export class WalletAlreadyResignedError extends Exception {
	public constructor() {
		super(`Failed to apply transaction, because the wallet already resigned as validator.`);
	}
}

export class WalletNotAValidatorError extends Exception {
	public constructor() {
		super(`Failed to apply transaction, because the wallet is not a validator.`);
	}
}

export class WalletIsAlreadyValidatorError extends Exception {
	public constructor() {
		super(`Failed to apply transaction, because the wallet is already a validator.`);
	}
}

export class ValidatorPublicKeyAlreadyRegisteredError extends Exception {
	public constructor(validatorPublicKey: string) {
		super(
			`Failed to apply transaction, because the validator public key '${validatorPublicKey}' is already registered.`,
		);
	}
}

export class WalletUsernameAlreadyRegisteredError extends Exception {
	public constructor(username: string) {
		super(`Failed to apply transaction, because the username '${username}' is already registered.`);
	}
}

export class WalletUsernameNotRegisteredError extends Exception {
	public constructor() {
		super(`Failed to apply transaction, because the username is not registered.`);
	}
}

export class AlreadyVotedError extends Exception {
	public constructor() {
		super(`Failed to apply transaction, because the sender wallet has already voted.`);
	}
}

export class NoVoteError extends Exception {
	public constructor() {
		super(`Failed to apply transaction, because the wallet has not voted.`);
	}
}

export class UnvoteMismatchError extends Exception {
	public constructor() {
		super(`Failed to apply transaction, because the wallet vote does not match.`);
	}
}

export class VotedForNonValidatorError extends Exception {
	public constructor(vote: string) {
		super(`Failed to apply transaction, because only validators can be voted.`);
	}
}

export class VotedForResignedValidatorError extends Exception {
	public constructor(vote: string) {
		super(`Failed to apply transaction, because it votes for a resigned validator.`);
	}
}

export class EmptyVoteError extends Exception {
	public constructor() {
		super(`Failed to apply transaction, because it doesn't contain any votes or unvotes.`);
	}
}
export class MaxVotesExceeededError extends Exception {
	public constructor() {
		super(`Failed to apply transaction, because it exceeds max votes.`);
	}
}

export class MaxUnvotesExceeededError extends Exception {
	public constructor() {
		super(`Failed to apply transaction, because it exceeds max unvotes`);
	}
}

export class NotEnoughValidatorsError extends Exception {
	public constructor() {
		super(`Failed to apply transaction, because not enough validators to allow resignation.`);
	}
}

export class MultiPaymentAmountMismatchError extends Exception {
	public constructor() {
		super(`Payment amounts mismatch.`);
	}
}

export class InvalidProposalBytesError extends Exception {
	public constructor(message: string) {
		super(`Failed to deserialize proposal, encountered invalid bytes: ${message}`);
	}
}

export class InvalidCommitProofBytesError extends Exception {
	public constructor(message: string) {
		super(`Failed to deserialize commit proof, encountered invalid bytes: ${message}`);
	}
}
