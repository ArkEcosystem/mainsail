pragma solidity ^0.8.27;

struct ValidatorData {
	uint256 votersCount;
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

event ValidatorRegistered(address addr, bytes bls12_381_public_key);
event ValidatorResigned(address addr);

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
	uint256 private _resignedValidatorsCount = 0;
	mapping(address => ValidatorData) private _registeredValidatorData;
	mapping(address => bool) private _hasRegisteredValidator;
	mapping(bytes32 => bool) private _registeredPublicKeys;
	address[] private _registeredValidators;

	mapping(address => Vote) private _votes;

	address private _head;
	mapping(address => address) private _topValidators;
	uint256 private _topValidatorsCount = 0;
	address[] private _calculatedTopValidators;

	constructor() {
		_owner = msg.sender;
	}

	modifier onlyOwner() {
        require(msg.sender == _owner, "Caller is not the contract owner");
        _;
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

	function calculateTopValidators(uint8 n) external onlyOwner {
		shuffle();
		deleteTopValidators();

		_head = address(0);

		uint8 top = uint8(_clamp(n, 0, _registeredValidatorsCount - _resignedValidatorsCount)); // TODO: Use new method that returns registered validators
		if (top == 0) {
			return;
		}

		for (uint i = 0; i < _registeredValidators.length; i++) {
			address addr = _registeredValidators[i];

			ValidatorData storage data = _registeredValidatorData[addr];
			if(data.isResigned) {
				continue;
			}

			if(_head == address(0)) {
				_head = addr;
				_topValidatorsCount = 1;
				continue;
			}


			if (_topValidatorsCount < top) {
				insertTopValidator(addr, top);
				continue;
			}

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

	function getAllValidators() public view returns (Validator[] memory) {
        Validator[] memory result = new Validator[](_registeredValidators.length);
        for (uint i = 0; i < _registeredValidators.length; i++) {
            address addr = _registeredValidators[i];
            ValidatorData storage data = _registeredValidatorData[addr];
            result[i] = Validator({addr: addr, data: data});
        }

        return result;
    }

	function registeredValidatorsCount() public view returns (uint256) {
		return _registeredValidatorsCount;
	}

	function resignedValidatorsCount() public view returns (uint256) {
		return _resignedValidatorsCount;
	}

	function activeValidatorsCount() public view returns (uint256) {
		return _calculatedTopValidators.length;
	}

	function registerValidator(bytes calldata bls12_381_public_key) external {
		require(msg.sender != _owner, "Invalid caller");
		require(!_hasRegisteredValidator[msg.sender], "Validator is already registered");

		bytes32 bls_public_key_hash = keccak256(bls12_381_public_key);

		require(!_registeredPublicKeys[bls_public_key_hash], "BLS12-381 key is already registered");

		_checkBls12_381PublicKey(bls12_381_public_key);

		ValidatorData memory validator = ValidatorData({
			votersCount: 0,
			voteBalance: 0,
			isResigned: false,
			bls12_381_public_key: bls12_381_public_key
		});

		_registeredValidatorsCount++;
		_hasRegisteredValidator[msg.sender] = true;
		_registeredValidatorData[msg.sender] = validator;
		_registeredPublicKeys[bls_public_key_hash] = true;
		_registeredValidators.push(msg.sender);

		emit ValidatorRegistered(msg.sender, bls12_381_public_key);
	}

	function resignValidator() external {
		require(isValidatorRegistered(msg.sender), "Caller is not a validator");

		ValidatorData storage validator = _registeredValidatorData[msg.sender];
		require(!validator.isResigned, "Validator is already resigned");

		validator.isResigned = true;
		_resignedValidatorsCount += 1;

		emit ValidatorResigned(msg.sender);
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
		require(isValidatorRegistered(addr), "Must vote for validator");
		require(_votes[msg.sender].validator == address(0), "Already voted");

		ValidatorData storage validatorData = _registeredValidatorData[addr];
		require(!validatorData.isResigned, "Must vote for unresigned validator");

		_votes[msg.sender] = Vote({validator: addr, balance: msg.sender.balance});

		// TODO: safe math
		validatorData.voteBalance += msg.sender.balance;
		validatorData.votersCount += 1;

		emit Voted(msg.sender, addr);
	}

	function unvote() external {
		Vote storage voter = _votes[msg.sender];
		require(voter.validator != address(0), "TODO: not voted");

		emit Unvoted(msg.sender, voter.validator);

		_registeredValidatorData[voter.validator].voteBalance -= voter.balance;
		_registeredValidatorData[voter.validator].votersCount -= 1;
		delete _votes[msg.sender];
	}

	function updateVoters(address[] calldata voters) external onlyOwner {
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
