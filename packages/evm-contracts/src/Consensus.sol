pragma solidity ^0.8.27;

struct ValidatorData {
	uint256 voteBalance;
	bool isResigned;
	bytes bls12_381_public_key; // 96 bits
}

struct Validator {
	address addr;
	ValidatorData data;
}

struct Vote {
	address validator;
	uint256 balance;
}

event Voted(address voter, address validator);
event Unvoted(address voter, address validator);
event VoteSwapped(address voter, address previousValidator, address newValidator);

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

struct Node {
	address addr;
	address next;
}

contract Consensus {
	address immutable _owner;

	uint256 private _registeredValidatorsCount = 0;
	mapping(address => ValidatorData) private _registeredValidatorData;
	mapping(address => bool) private _hasRegisteredValidator;
	mapping(bytes32 => bool) private _registeredPublicKeys;
	address[] private _registeredValidators;

	mapping(address => Vote) private _votes;

	address private _head;
	mapping(address => address) private _topValidators;
	uint256 private _topValidatorsCount = 0;
	address[] private _calculatedTopValidators;

	address[] private _resignedValidators;

	constructor() {
		_owner = msg.sender;
	}

	function shuffle() internal {
		uint256 n = _registeredValidators.length;
		for (uint256 i = n - 1; i > 0; i--) {
			// Get a random index between 0 and i (inclusive)
			uint256 j = uint256(keccak256(abi.encodePacked(block.timestamp, block.prevrandao, i))) % (i + 1);

			// Swap elements at index i and j
			address temp = _registeredValidators[i];
			_registeredValidators[i] = _registeredValidators[j];
			_registeredValidators[j] = temp;
		}
	}

	function deleteTopValidators() internal {
		address next = _head;

		while (next != address(0)) {
			address current = next;
			next = _topValidators[current];
			delete _topValidators[current];
		}
		_topValidatorsCount = 0;
	}

	function calculateTopValidators(uint8 n) external {
		shuffle();
		deleteTopValidators();

		uint8 top = uint8(_clamp(n, 0, _registeredValidators.length));
		if (top == 0) {
			return;
		}

		_head = _registeredValidators[0];
		_topValidatorsCount = 1;

		for (uint i = 1; i < _registeredValidators.length; i++) {
			address addr = _registeredValidators[i];

			if (_topValidatorsCount < top) {
				insertTopValidator(addr, top);
				continue;
			}

			ValidatorData storage data = _registeredValidatorData[addr];
			ValidatorData storage headData = _registeredValidatorData[_head];

			if (_isGreater(Validator({addr: addr, data: data}), Validator({addr: _head, data: headData}))) {
				insertTopValidator(addr, top);
			}
		}

		address next = _head;
		delete _calculatedTopValidators;
		_calculatedTopValidators = new address[](top);
		for (uint i = 0; i < top; i++) {
			_calculatedTopValidators[i] = next;
			next = _topValidators[next];
		}
	}

	function insertTopValidator(address addr, uint8 top) internal {
		ValidatorData memory data = _registeredValidatorData[addr];

		if (
			_isGreater(
				Validator({addr: _head, data: _registeredValidatorData[_head]}),
				Validator({addr: addr, data: data})
			)
		) {
			insertHead(addr);
		} else {
			address current = _topValidators[_head];
			address previous = _head;

			while (true) {
				if (current == address(0)) {
					insertAfter(previous, addr);
					break;
				}

				if (
					_isGreater(
						Validator({addr: current, data: _registeredValidatorData[current]}),
						Validator({addr: addr, data: data})
					)
				) {
					insertAfter(previous, addr);
					break;
				}

				previous = current;
				current = _topValidators[current];
			}
		}

		if (_topValidatorsCount > top) {
			address next = _topValidators[_head];
			delete _topValidators[_head];
			_head = next;
			_topValidatorsCount--;
		}
	}

	function insertHead(address addr) internal {
		_topValidators[addr] = _head;
		_head = addr;
		_topValidatorsCount++;
	}

	function insertAfter(address prev, address addr) internal {
		_topValidators[addr] = _topValidators[prev];
		_topValidators[prev] = addr;
		_topValidatorsCount++;
	}

	function getTopValidators() public view returns (Validator[] memory) {
		Validator[] memory result = new Validator[](_calculatedTopValidators.length);
		for (uint i = 0; i < _calculatedTopValidators.length; i++) {
			address addr = _calculatedTopValidators[i];
			ValidatorData storage data = _registeredValidatorData[addr];
			result[i] = Validator({addr: addr, data: data});
		}

		return result;
	}

	function registeredValidatorsCount() public view returns (uint256) {
		return _registeredValidatorsCount;
	}

	function activeValidatorsCount() public view returns (uint256) {
		return _calculatedTopValidators.length;
	}

	function registerValidator(bytes calldata bls12_381_public_key) external {
		require(msg.sender != _owner, "Invalid caller");
		require(!_hasRegisteredValidator[msg.sender], "ValidatorData is already registered");

		bytes32 bls_public_key_hash = keccak256(bls12_381_public_key);

		require(!_registeredPublicKeys[bls_public_key_hash], "BLS12-381 key is already registered");

		_checkBls12_381PublicKey(bls12_381_public_key);

		ValidatorData memory validator = ValidatorData({
			voteBalance: 0,
			isResigned: false,
			bls12_381_public_key: bls12_381_public_key
		});

		_registeredValidatorsCount++;
		_hasRegisteredValidator[msg.sender] = true;
		_registeredValidatorData[msg.sender] = validator;
		_registeredPublicKeys[bls_public_key_hash] = true;

		// TODO
		// if (_registeredValidatorsCount < MIN_VALIDATORS) {
		_registeredValidators.push(msg.sender);
		// }
	}

	function deregisterValidator() external {
		require(isValidatorRegistered(msg.sender), "Caller not a validator");

		ValidatorData storage validator = _registeredValidatorData[msg.sender];
		require(!validator.isResigned, "Validator is already resigned");

		validator.isResigned = true;
		_resignedValidators.push(msg.sender);
	}

	function performValidatorResignations() external {
		// TODO: optimize removal from activeValidators array
		uint256[] memory indexesToRemove = new uint256[](_resignedValidators.length);

		for (uint256 i = 0; i < _resignedValidators.length; i++) {
			address addr = _resignedValidators[i];
			ValidatorData storage validator = _registeredValidatorData[addr];
			require(validator.isResigned, "Validator is not resigned");

			bytes32 bls_public_key_hash = keccak256(validator.bls12_381_public_key);

			_registeredValidatorsCount--;
			delete _hasRegisteredValidator[addr];
			delete _registeredValidatorData[addr];
			delete _registeredPublicKeys[bls_public_key_hash];

			// find index
			for (uint256 j = 0; i < _registeredValidators.length - 1; j++) {
				if (_registeredValidators[j] != addr) {
					continue;
				}

				indexesToRemove[i] = j;
				break;
			}
		}

		// Sort indexes in descending order to avoid shifting issues
		for (uint256 i = 0; i < indexesToRemove.length; i++) {
			for (uint256 j = i + 1; j < indexesToRemove.length; j++) {
				if (indexesToRemove[i] < indexesToRemove[j]) {
					(indexesToRemove[i], indexesToRemove[j]) = (indexesToRemove[j], indexesToRemove[i]);
				}
			}
		}

		for (uint256 i = 0; i < indexesToRemove.length; i++) {
			uint256 index = indexesToRemove[i];
			_registeredValidators[index] = _registeredValidators[_registeredValidators.length - 1];
			_registeredValidators.pop();
		}

		// clear resigned validators
		delete _resignedValidators;
	}

	function isValidatorRegistered(address addr) public view returns (bool) {
		return _hasRegisteredValidator[addr];
	}

	function _checkBls12_381PublicKey(bytes calldata publicKey) private pure {
		require(publicKey.length == 48, "BLS12-381 publicKey length is invalid");
	}

	function getValidator(address _addr) public view returns (Validator memory) {
		require((isValidatorRegistered(_addr)), "ValidatorData doesn't exists");
		return Validator({addr: _addr, data: _registeredValidatorData[_addr]});
	}

	function updateValidator(Validator calldata _validator) public {
		require(isValidatorRegistered(_validator.addr), "ValidatorData doesn't exists");
		_registeredValidatorData[_validator.addr] = _validator.data;
	}

	function vote(address addr) external {
		require(isValidatorRegistered(addr), "must vote for validator");
		require(_votes[msg.sender].validator == address(0), "TODO: already voted");

		_votes[msg.sender] = Vote({validator: addr, balance: msg.sender.balance});
		// TODO: safe math
		_registeredValidatorData[addr].voteBalance += msg.sender.balance;

		emit Voted(msg.sender, addr);
	}

	function updateVoters(address[] calldata voters) external {
		// TODO: limit number of voters per update?
		for (uint i = 0; i < voters.length; i++) {
			_updateVoter(voters[i]);
		}
	}

	function _updateVoter(address addr) private {
		Vote storage voter = _votes[addr];
		if (voter.validator == address(0)) {
			return;
		}

		uint256 voterBalance = voter.balance;

		if (voterBalance < addr.balance) {
			_registeredValidatorData[voter.validator].voteBalance += addr.balance - voterBalance;
		} else {
			_registeredValidatorData[voter.validator].voteBalance -= voterBalance - addr.balance;
		}

		voter.balance = addr.balance;
	}

	function _isGreater(Validator memory validatorA, Validator memory validatorB) internal pure returns (bool) {
		if (validatorA.data.voteBalance == validatorB.data.voteBalance) {
			return validatorA.addr > validatorB.addr;
		}

		return validatorA.data.voteBalance > validatorB.data.voteBalance;
	}

	function _clamp(uint256 value, uint256 min, uint256 max) private pure returns (uint256) {
		require(min <= max, "Minimum should be less than or equal to maximum");
		if (value < min) {
			return min;
		} else if (value > max) {
			return max;
		} else {
			return value;
		}
	}
}
