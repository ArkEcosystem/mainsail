import { Wallet } from "../contracts/state";
import { InternalTransactionType } from "../contracts/transactions";
import { Exception } from "./base";

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

export class TransactionTypeError extends Exception {
	public constructor(given: string) {
		super(`Type ${given} not supported.`);
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

export class CoreTransactionTypeGroupImmutableError extends Exception {
	public constructor() {
		super(`The Core transaction type group is immutable.`);
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

export class VendorFieldLengthExceededError extends Exception {
	public constructor(limit: number) {
		super(`Length of vendor field exceeded the allowed maximum ${limit}.`);
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

export class InvalidMilestoneConfigurationError extends Exception {
	public constructor(message: string) {
		super(message);
	}
}

export class InvalidMultiSignatureAssetError extends Exception {
	public constructor() {
		super(`The multi signature asset is invalid.`);
	}
}

export class DuplicateParticipantInMultiSignatureError extends Exception {
	public constructor() {
		super(`Invalid multi signature, because duplicate participant found.`);
	}
}

export class InvalidTransactionTypeError extends Exception {
	public constructor(type: InternalTransactionType) {
		super(`Transaction type ${type.toString()} does not exist.`);
	}
}

export class DeactivatedTransactionHandlerError extends Exception {
	public constructor(type: InternalTransactionType) {
		super(`Transaction type ${type.toString()} is deactivated.`);
	}
}

export class UnsatisfiedDependencyError extends Exception {
	public constructor(type: InternalTransactionType) {
		super(`Transaction type ${type.toString()} is missing required dependencies`);
	}
}

export class AlreadyRegisteredError extends Exception {
	public constructor(type: InternalTransactionType) {
		super(`Transaction type ${type.toString()} is already registered`);
	}
}

export class UnexpectedNonceError extends Exception {
	public constructor(txNonce: any, sender: Wallet, reversal: boolean) {
		const action: string = reversal ? "revert" : "apply";
		super(
			`Cannot ${action} a transaction with nonce ${txNonce.toFixed()}: the ` +
				`sender ${sender.getPublicKey()} has nonce ${sender.getNonce().toFixed()}.`,
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

export class MissingMultiSignatureOnSenderError extends Exception {
	public constructor() {
		super(`Failed to apply transaction, because sender does not have a multi signature.`);
	}
}

export class InvalidMultiSignaturesError extends Exception {
	public constructor() {
		super(`Failed to apply transaction, because the multi signatures are invalid.`);
	}
}

export class UnsupportedMultiSignatureRegistrationTransactionError extends Exception {
	public constructor() {
		super(`Failed to apply transaction, because the transaction does not support multi signatures.`);
	}
}

export class UnsupportedMultiSignatureRegistrationException extends Exception {
	public constructor() {
		super(`Failed to apply transaction, because the transaction does not support multi signatures.`);
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
		super(`Failed to apply transaction, because the wallet already has a registered username.`);
	}
}

export class WalletUsernameAlreadyRegisteredError extends Exception {
	public constructor(username: string) {
		super(`Failed to apply transaction, because the username '${username}' is already registered.`);
	}
}

export class NotSupportedForMultiSignatureWalletError extends Exception {
	public constructor() {
		super(`Failed to apply transaction, because multi signature is enabled.`);
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

export class NotEnoughValidatorsError extends Exception {
	public constructor() {
		super(`Failed to apply transaction, because not enough validators to allow resignation.`);
	}
}

export class MultiSignatureAlreadyRegisteredError extends Exception {
	public constructor() {
		super(`Failed to apply transaction, because multi signature is already enabled.`);
	}
}

export class InvalidMultiSignatureError extends Exception {
	public constructor() {
		super(`Failed to apply transaction, because the multi signature could not be verified.`);
	}
}

export class LegacyMultiSignatureError extends Exception {
	public constructor() {
		super(`Failed to apply transaction, because legacy multi signature is no longer supported.`);
	}
}

export class LegacyMultiSignatureRegistrationError extends Exception {
	public constructor() {
		super(`Failed to apply transaction, because legacy multi signature registrations are no longer supported.`);
	}
}

export class MultiSignatureMinimumKeysError extends Exception {
	public constructor() {
		super(`Failed to apply transaction, because too few keys were provided.`);
	}
}

export class MultiSignatureKeyCountMismatchError extends Exception {
	public constructor() {
		super(
			`Failed to apply transaction, because the number of provided keys does not match the number of signatures.`,
		);
	}
}
