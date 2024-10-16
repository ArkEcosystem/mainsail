// SPDX-License-Identifier: GNU GENERAL PUBLIC LICENSE
pragma solidity ^0.8.13;

import {Test, console} from "@forge-std/Test.sol";
import {Consensus, ValidatorData, Validator, ValidatorRegistered} from "@contracts/consensus/Consensus.sol";

contract ConsensusTest is Test {
	Consensus public consensus;

	function setUp() public {
		consensus = new Consensus();
	}

	function prepareBLSKey(address addr, uint8 lenght) private pure returns (bytes memory) {
		bytes32 h = keccak256(abi.encode(addr));
		bytes memory validatorKey = new bytes(lenght);
		for (uint256 j = 0; j < 32; j++) {
			validatorKey[j] = h[j];
		}
		return validatorKey;
	}

	function prepareBLSKey(address addr) private pure returns (bytes memory) {
		return prepareBLSKey(addr, 48);
	}

	function test_validator_registration_pass() public {
		assertEq(consensus.registeredValidatorsCount(), 0);
		address addr = address(1);

		// Act
		vm.startPrank(addr);
		vm.expectEmit(address(consensus));
		emit ValidatorRegistered(addr, prepareBLSKey(addr));
		consensus.registerValidator(prepareBLSKey(addr));
		vm.stopPrank();

		// Assert
		assertEq(consensus.registeredValidatorsCount(), 1);
		Validator memory validator = consensus.getValidator(addr);
		assertEq(validator.addr, addr);
		assertEq(validator.data.bls12_381_public_key, prepareBLSKey(addr));
		assertEq(validator.data.voteBalance, 0);
		assertEq(validator.data.votersCount, 0);
		assertEq(validator.data.isResigned, false);
	}

	function test_validator_registration_revert_if_caller_is_owner() public {
		vm.expectRevert("Invalid caller");
		consensus.registerValidator(prepareBLSKey(address(1)));
	}

	function test_validator_registration_revert_if_validator_is_already_registered() public {
		address addr = address(1);

		vm.startPrank(addr);
		consensus.registerValidator(prepareBLSKey(addr));

		vm.expectRevert("Validator is already registered");
		consensus.registerValidator(prepareBLSKey(address(2)));
	}

	function test_validator_registration_revert_if_bls_key_is_already_registered() public {
		address addr = address(1);
		vm.startPrank(addr);

		consensus.registerValidator(prepareBLSKey(addr));

		vm.startPrank(address(2));
		vm.expectRevert("BLS12-381 key is already registered");
		consensus.registerValidator(prepareBLSKey(addr));
	}

	function test_validator_registration_revert_if_bls_key_length_is_invalid() public {
		address addr = address(1);
		vm.startPrank(addr);

		vm.expectRevert("BLS12-381 publicKey length is invalid");
		consensus.registerValidator(prepareBLSKey(addr, 46));
		vm.expectRevert("BLS12-381 publicKey length is invalid");
		consensus.registerValidator(prepareBLSKey(addr, 47));
		vm.expectRevert("BLS12-381 publicKey length is invalid");
		consensus.registerValidator(prepareBLSKey(addr, 49));
		vm.expectRevert("BLS12-381 publicKey length is invalid");
		consensus.registerValidator(prepareBLSKey(addr, 50));
	}
}
