// SPDX-License-Identifier: GNU GENERAL PUBLIC LICENSE
pragma solidity ^0.8.27;

import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

// Validators:
// - Registered -> All validators that are registered including resigned validators
// - Active -> Top N validators with the highest vote balance, that participate in the consensus
// - Resigned -> Validators that resigned from the consensus

// Voter calls vote funtion
// Vote function includes valdiator address and balance, whole balance is added to the validator voteBalance
// Voter can unvote, whole balance is removed from validator voteBalance
// Voter balance is changed (fee & send amount) - validator voteBalance is decreased (for sender) and i ncreased (for recipients)

// Scenario 1 - First evm transfer, then vote
// Wallet balance: 100
// Transfer 10, new balance 90
// Vote for validator, validatorVoteBalance: 90, vote balance: 88

// Block is processed: Original wallet balance: 100, new wallet balance: 88, difference 12
// This process will only work fine if we pass the new wallet balance (88) and keep track of voteBalances in EVM contract.

contract ConsensusV1 is UUPSUpgradeable, OwnableUpgradeable {
    struct ValidatorData {
        uint256 votersCount;
        uint256 voteBalance;
        bool isResigned;
        bytes blsPublicKey; // 96 bits
    }

    struct Validator {
        address addr;
        ValidatorData data;
    }

    struct RoundValidator {
        address addr;
        uint256 voteBalance;
    }

    struct Round {
        uint256 round;
        RoundValidator[] validators;
    }

    struct Vote {
        address validator;
        uint256 balance;
        address prev;
        address next;
    }

    struct VoteResult {
        address voter;
        address validator;
    }

    event ValidatorRegistered(address addr, bytes blsPublicKey);

    event ValidatorUpdated(address addr, bytes blsPublicKey);

    event ValidatorResigned(address addr);

    event Voted(address voter, address validator);

    event Unvoted(address voter, address validator);

    error CallerIsNotValidator();
    error ValidatorNotRegistered();
    error ValidatorAlreadyRegistered();
    error ValidatorAlreadyResigned();
    error BellowMinValidators();
    error NoActiveValidators();

    error BlsKeyAlreadyRegistered();
    error BlsKeyIsInvalid();

    error VoteResignedValidator();
    error VoteSameValidator();
    error VoteValidatorWithoutBlsPublicKey();
    error AlreadyVoted();
    error MissingVote();

    error InvalidRange(uint256 min, uint256 max);
    error InvalidParameters();
    error ImportIsNotAllowed();

    mapping(address => ValidatorData) private _validatorsData;
    mapping(address => bool) private _hasValidator;
    mapping(bytes32 => bool) private _blsPublicKeys;
    address[] private _validators;
    uint256 private _validatorsCount; // Default 0
    uint256 private _resignedValidatorsCount; // Default 0

    mapping(address => Vote) private _voters;
    address private _votersHead; // Default address(0)
    address private _votersTail; // Default address(0)
    uint256 private _votersCount; // Default 0

    mapping(address => address) private _activeValidatorsMap;
    address[] private _activeValidators;
    address private _activeValidatorsHead; // Default address(0)
    uint256 private _activeValidatorsCount; // Default 0
    uint256 private _minValidators; // Default 1

    RoundValidator[][] private _rounds;

    // Initializers
    function initialize() public initializer {
        __Ownable_init(msg.sender);
        _minValidators = 1;
    }

    // Overrides
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    // External functions
    function addValidator(address addr, bytes calldata blsPublicKey, bool isResigned) external onlyOwner {
        if (_rounds.length > 0) {
            revert ImportIsNotAllowed();
        }

        if (_hasValidator[addr]) {
            revert ValidatorAlreadyRegistered();
        }

        if (_blsPublicKeys[keccak256(blsPublicKey)]) {
            revert BlsKeyAlreadyRegistered();
        }

        // Allow empty blsPublicKey for imports
        if (blsPublicKey.length != 0) {
            _verifyAndRegisterBlsPublicKey(blsPublicKey);
        }

        ValidatorData memory validator =
            ValidatorData({votersCount: 0, voteBalance: 0, isResigned: isResigned, blsPublicKey: blsPublicKey});

        _validatorsCount++;
        _hasValidator[addr] = true;
        _validatorsData[addr] = validator;
        _validators.push(addr);

        if (isResigned) {
            _resignedValidatorsCount++;
        }

        emit ValidatorRegistered(addr, blsPublicKey);
    }

    function addVote(address voter, address validator) external onlyOwner {
        if (_rounds.length > 0) {
            revert ImportIsNotAllowed();
        }

        if (!isValidatorRegistered(validator)) {
            revert ValidatorNotRegistered();
        }

        Vote storage voterData = _voters[voter];
        if (voterData.validator != address(0)) {
            revert AlreadyVoted();
        }

        _voters[voter] = Vote({validator: validator, balance: voter.balance, prev: address(0), next: address(0)});

        if (_votersHead == address(0)) {
            _votersHead = voter;
            _votersTail = voter;
        } else {
            _voters[_votersTail].next = voter;
            _voters[voter].prev = _votersTail;
            _votersTail = voter;
        }
        _votersCount++;

        ValidatorData storage validatorData = _validatorsData[validator];
        validatorData.voteBalance += voter.balance;
        validatorData.votersCount += 1;

        emit Voted(voter, validator);
    }

    function registerValidator(bytes calldata blsPublicKey) external {
        if (_hasValidator[msg.sender]) {
            revert ValidatorAlreadyRegistered();
        }

        _verifyAndRegisterBlsPublicKey(blsPublicKey);

        ValidatorData memory validator =
            ValidatorData({votersCount: 0, voteBalance: 0, isResigned: false, blsPublicKey: blsPublicKey});

        _validatorsCount++;
        _hasValidator[msg.sender] = true;
        _validatorsData[msg.sender] = validator;
        _validators.push(msg.sender);

        emit ValidatorRegistered(msg.sender, blsPublicKey);
    }

    function updateValidator(bytes calldata blsPublicKey) external {
        if (!isValidatorRegistered(msg.sender)) {
            revert ValidatorNotRegistered();
        }

        _verifyAndRegisterBlsPublicKey(blsPublicKey);

        _validatorsData[msg.sender].blsPublicKey = blsPublicKey;

        emit ValidatorUpdated(msg.sender, blsPublicKey);
    }

    function resignValidator() external {
        if (!isValidatorRegistered(msg.sender)) {
            revert CallerIsNotValidator();
        }

        ValidatorData storage validator = _validatorsData[msg.sender];
        if (validator.isResigned) {
            revert ValidatorAlreadyResigned();
        }

        if (_validatorsCount - _resignedValidatorsCount <= _minValidators) {
            revert BellowMinValidators();
        }

        validator.isResigned = true;
        _resignedValidatorsCount += 1;

        emit ValidatorResigned(msg.sender);
    }

    function vote(address addr) external {
        if (!isValidatorRegistered(addr)) {
            revert ValidatorNotRegistered();
        }

        ValidatorData storage validatorData = _validatorsData[addr];
        if (validatorData.isResigned) {
            revert VoteResignedValidator();
        }

        if (validatorData.blsPublicKey.length == 0) {
            revert VoteValidatorWithoutBlsPublicKey();
        }

        Vote storage voter = _voters[msg.sender];
        if (voter.validator == addr) {
            revert VoteSameValidator();
        }

        if (voter.validator != address(0)) {
            _unvote();
        }

        _voters[msg.sender] = Vote({validator: addr, balance: msg.sender.balance, prev: address(0), next: address(0)});

        if (_votersHead == address(0)) {
            _votersHead = msg.sender;
            _votersTail = msg.sender;
        } else {
            _voters[_votersTail].next = msg.sender;
            _voters[msg.sender].prev = _votersTail;
            _votersTail = msg.sender;
        }
        _votersCount++;

        validatorData.voteBalance += msg.sender.balance;
        validatorData.votersCount += 1;

        emit Voted(msg.sender, addr);
    }

    function unvote() external {
        emit Unvoted(msg.sender, _unvote());
    }

    function updateVoters(address[] calldata voters) external onlyOwner {
        for (uint256 i = 0; i < voters.length; i++) {
            _updateVoter(voters[i]);
        }
    }

    function calculateActiveValidators(uint8 n) external onlyOwner {
        if (n == 0) {
            revert InvalidParameters();
        }

        _minValidators = n;

        _shuffle(_validators);
        _deleteActiveValidators();

        _activeValidatorsHead = address(0);
        uint8 top = uint8(_clamp(n, 0, _validatorsCount - _resignedValidatorsCount));

        if (top == 0) {
            revert NoActiveValidators();
        }

        for (uint256 i = 0; i < _validators.length; i++) {
            address addr = _validators[i];

            ValidatorData storage data = _validatorsData[addr];

            if (data.isResigned || data.blsPublicKey.length == 0) {
                continue;
            }

            if (_activeValidatorsHead == address(0)) {
                _activeValidatorsHead = addr;
                _activeValidatorsCount = 1;
                continue;
            }

            if (_activeValidatorsCount < top) {
                _insertValidator(addr, top);
                continue;
            }

            ValidatorData storage headData = _validatorsData[_activeValidatorsHead];

            if (
                _isGreater(
                    Validator({addr: addr, data: data}), Validator({addr: _activeValidatorsHead, data: headData})
                )
            ) {
                _insertValidator(addr, top);
            }
        }

        if (_activeValidatorsCount == 0) {
            revert NoActiveValidators();
        }

        // Prepare temp array. Used when _activeValidatorsCount < _minValidators
        address next = _activeValidatorsHead;
        address[] memory tmpValidators = new address[](_activeValidatorsCount);

        for (uint256 i = 0; i < _activeValidatorsCount; i++) {
            tmpValidators[i] = next;
            next = _activeValidatorsMap[next];
        }
        _shuffleMem(tmpValidators);

        // Fill round & _activeValidators
        RoundValidator[] storage round = _rounds.push();
        delete _activeValidators;
        _activeValidators = new address[](_minValidators);

        for (uint256 i = 0; i < _minValidators; i++) {
            address addr = tmpValidators[i % _activeValidatorsCount];
            _activeValidators[i] = addr;
            round.push(RoundValidator({addr: addr, voteBalance: _validatorsData[addr].voteBalance}));
        }
    }

    // External functions that are view
    function version() external pure returns (uint256) {
        return 1;
    }

    function registeredValidatorsCount() external view returns (uint256) {
        return _validatorsCount;
    }

    function resignedValidatorsCount() external view returns (uint256) {
        return _resignedValidatorsCount;
    }

    function activeValidatorsCount() external view returns (uint256) {
        return _activeValidatorsCount;
    }

    function isValidatorRegistered(address addr) public view returns (bool) {
        return _hasValidator[addr];
    }

    function getValidator(address addr) external view returns (Validator memory) {
        if (!isValidatorRegistered(addr)) {
            revert ValidatorNotRegistered();
        }

        return Validator({addr: addr, data: _validatorsData[addr]});
    }

    function getActiveValidators() external view returns (Validator[] memory) {
        Validator[] memory result = new Validator[](_activeValidators.length);
        for (uint256 i = 0; i < _activeValidators.length; i++) {
            address addr = _activeValidators[i];
            ValidatorData storage data = _validatorsData[addr];
            result[i] = Validator({addr: addr, data: data});
        }

        return result;
    }

    function getAllValidators() external view returns (Validator[] memory) {
        Validator[] memory result = new Validator[](_validators.length);
        for (uint256 i = 0; i < _validators.length; i++) {
            address addr = _validators[i];
            ValidatorData storage data = _validatorsData[addr];
            result[i] = Validator({addr: addr, data: data});
        }

        return result;
    }

    function getVotesCount() external view returns (uint256) {
        return _votersCount;
    }

    function getVotes(address addr, uint256 count) external view onlyOwner returns (VoteResult[] memory) {
        VoteResult[] memory voters = new VoteResult[](_clamp(count, 0, _votersCount));

        address next = _votersHead;

        if (addr != address(0)) {
            next = _voters[addr].next;
        }

        uint256 i = 0;
        while (next != address(0) && i < count) {
            Vote storage voter = _voters[next];
            voters[i++] = VoteResult({voter: next, validator: voter.validator});
            next = voter.next;
        }

        if (voters.length == i) {
            return voters;
        }

        // Slice array to remove empty elements
        VoteResult[] memory slice = new VoteResult[](i);
        for (uint256 j = 0; j < i; j++) {
            slice[j] = voters[j];
        }

        return slice;
    }

    function getRoundsCount() external view returns (uint256) {
        return _rounds.length;
    }

    function getRounds(uint256 offset, uint256 count) external view onlyOwner returns (Round[] memory) {
        uint256 total = count;
        if (offset >= _rounds.length) {
            total = 0;
        } else if (offset + count > _rounds.length) {
            total = _rounds.length - offset;
        }

        Round[] memory result = new Round[](total);
        for (uint256 i = 0; i < total; i++) {
            result[i] = Round({round: offset + i + 1, validators: _rounds[offset + i]});
        }

        return result;
    }

    // Internal functions
    function _shuffle(address[] storage array) internal {
        uint256 n = array.length;
        if (n == 0) {
            return;
        }

        for (uint256 i = n - 1; i > 0; i--) {
            // Get a random index between 0 and i (inclusive)
            uint256 j = uint256(keccak256(abi.encodePacked(block.timestamp, i))) % (i + 1);

            // Swap elements at index i and j
            address temp = array[i];
            array[i] = array[j];
            array[j] = temp;
        }
    }

    function _shuffleMem(address[] memory array) internal view {
        uint256 n = array.length;
        if (n == 0) {
            return;
        }

        for (uint256 i = n - 1; i > 0; i--) {
            // Get a random index between 0 and i (inclusive)
            uint256 j = uint256(keccak256(abi.encodePacked(block.timestamp, i))) % (i + 1);

            // Swap elements at index i and j
            address temp = array[i];
            array[i] = array[j];
            array[j] = temp;
        }
    }

    function _deleteActiveValidators() internal {
        address next = _activeValidatorsHead;

        while (next != address(0)) {
            address current = next;
            next = _activeValidatorsMap[current];
            delete _activeValidatorsMap[current];
        }
        _activeValidatorsCount = 0;
    }

    function _insertValidator(address addr, uint8 top) internal {
        ValidatorData memory data = _validatorsData[addr];

        if (
            _isGreater(
                Validator({addr: _activeValidatorsHead, data: _validatorsData[_activeValidatorsHead]}),
                Validator({addr: addr, data: data})
            )
        ) {
            _insertHead(addr);
        } else {
            address current = _activeValidatorsMap[_activeValidatorsHead];
            address previous = _activeValidatorsHead;

            while (true) {
                if (current == address(0)) {
                    _insertAfter(previous, addr);
                    break;
                }

                if (
                    _isGreater(
                        Validator({addr: current, data: _validatorsData[current]}), Validator({addr: addr, data: data})
                    )
                ) {
                    _insertAfter(previous, addr);
                    break;
                }

                previous = current;
                current = _activeValidatorsMap[current];
            }
        }

        if (_activeValidatorsCount > top) {
            address next = _activeValidatorsMap[_activeValidatorsHead];
            delete _activeValidatorsMap[_activeValidatorsHead];
            _activeValidatorsHead = next;
            _activeValidatorsCount--;
        }
    }

    function _insertHead(address addr) internal {
        _activeValidatorsMap[addr] = _activeValidatorsHead;
        _activeValidatorsHead = addr;
        _activeValidatorsCount++;
    }

    function _insertAfter(address prev, address addr) internal {
        _activeValidatorsMap[addr] = _activeValidatorsMap[prev];
        _activeValidatorsMap[prev] = addr;
        _activeValidatorsCount++;
    }

    function _unvote() internal returns (address) {
        Vote storage voter = _voters[msg.sender];
        if (voter.validator == address(0)) {
            revert MissingVote();
        }

        if (_votersHead == _votersTail) {
            _votersHead = address(0);
            _votersTail = address(0);
        } else if (_votersTail == msg.sender) {
            _voters[voter.prev].next = address(0);
            _votersTail = voter.prev;
        } else if (_votersHead == msg.sender) {
            _voters[_votersTail].prev = address(0);
            _votersHead = _voters[_votersHead].next;
        } else {
            _voters[voter.prev].next = voter.next;
            _voters[voter.next].prev = voter.prev;
        }

        address validatorAddr = voter.validator;

        ValidatorData storage validatorData = _validatorsData[voter.validator];

        validatorData.voteBalance -= voter.balance;
        validatorData.votersCount -= 1;

        delete _voters[msg.sender];

        _votersCount--;

        return validatorAddr;
    }

    function _updateVoter(address addr) internal {
        Vote storage voter = _voters[addr];
        if (voter.validator == address(0)) {
            return;
        }

        uint256 voterBalance = voter.balance;

        if (voterBalance < addr.balance) {
            _validatorsData[voter.validator].voteBalance += addr.balance - voterBalance;
        } else {
            _validatorsData[voter.validator].voteBalance -= voterBalance - addr.balance;
        }

        voter.balance = addr.balance;
    }

    function _verifyAndRegisterBlsPublicKey(bytes calldata blsPublicKey) internal {
        bytes32 blsPublicKeyHash = keccak256(blsPublicKey);
        if (_blsPublicKeys[blsPublicKeyHash]) {
            revert BlsKeyAlreadyRegistered();
        }

        _checkBls12_381PublicKey(blsPublicKey);

        _blsPublicKeys[blsPublicKeyHash] = true;
    }

    // Internal pure functions
    function _checkBls12_381PublicKey(bytes calldata publicKey) internal pure {
        if (publicKey.length != 48) {
            revert BlsKeyIsInvalid();
        }
    }

    function _isGreater(Validator memory validatorA, Validator memory validatorB) internal pure returns (bool) {
        if (validatorA.data.voteBalance == validatorB.data.voteBalance) {
            return validatorA.addr > validatorB.addr;
        }

        return validatorA.data.voteBalance > validatorB.data.voteBalance;
    }

    function _clamp(uint256 value, uint256 min, uint256 max) internal pure returns (uint256) {
        if (min > max) {
            revert InvalidRange(min, max);
        }

        if (value < min) {
            return min;
        } else if (value > max) {
            return max;
        } else {
            return value;
        }
    }
}
