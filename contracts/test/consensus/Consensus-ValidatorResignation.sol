// SPDX-License-Identifier: GNU GENERAL PUBLIC LICENSE
pragma solidity ^0.8.13;

import {Consensus, ValidatorData, Validator, ValidatorResigned} from "@contracts/consensus/Consensus.sol";
import {Base} from "./Base.sol";

contract ConsensusTest is Base {
	Consensus public consensus;

	function setUp() public {
		consensus = new Consensus();
	}

	function test_validator_resignation_pass() public {
		assertEq(consensus.registeredValidatorsCount(), 0);
		address addr = address(1);

		// Act
		vm.startPrank(addr);
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

		// Act
		vm.startPrank(addr);
		vm.expectEmit(address(consensus));
		emit ValidatorResigned(addr);
		consensus.resignValidator();
		vm.stopPrank();


		assertEq(consensus.registeredValidatorsCount(), 1);
		validator = consensus.getValidator(addr);
		assertEq(validator.addr, addr);
		assertEq(validator.data.bls12_381_public_key, prepareBLSKey(addr));
		assertEq(validator.data.voteBalance, 0);
		assertEq(validator.data.votersCount, 0);
		assertEq(validator.data.isResigned, true);
	}

	function test_validator_resignation_revert_if_caller_is_not_validator() public {
		vm.expectRevert("Caller is not a validator");
		consensus.resignValidator();
	}

	function test_validator_resignation_revert_if_resigned() public {
		assertEq(consensus.registeredValidatorsCount(), 0);
		address addr = address(1);

		// Act
		vm.startPrank(addr);
		consensus.registerValidator(prepareBLSKey(addr));
		vm.stopPrank();

		// Assert
		assertEq(consensus.registeredValidatorsCount(), 1);

		// Act
		vm.startPrank(addr);
		vm.expectEmit(address(consensus));
		emit ValidatorResigned(addr);
		consensus.resignValidator();

		vm.expectRevert("Validator is already resigned");
		consensus.resignValidator();
	}
}
