// SPDX-License-Identifier: GNU GENERAL PUBLIC LICENSE
pragma solidity ^0.8.13;

import {Test, console} from "@forge-std/Test.sol";
import {Consensus, ValidatorData, Validator} from "@contracts/consensus/Consensus.sol";
import {Base} from "./Base.sol";

contract ConsensusTest is Base {
	Consensus public consensus;

	function setUp() public {
		consensus = new Consensus();
	}

	function test_should_work_with_one_validator() public {
		address addr = address(1);
		vm.startPrank(addr);
		consensus.registerValidator(prepareBLSKey(addr));
		vm.stopPrank();

		consensus.calculateTopValidators(1);
		Validator[] memory validators = consensus.getTopValidators();
		assertEq(validators.length, 1);
		assertEq(validators[0].addr, addr);
	}

	function test_should_allow_only_caller() public {
		address addr = address(1);
		vm.startPrank(addr);
		vm.expectRevert("Caller is not the contract owner");
		consensus.calculateTopValidators(1);
	}

	function test_should_ignore_resigned_validators() public {
		address addr = address(1);

		vm.startPrank(addr);
		consensus.registerValidator(prepareBLSKey(addr));
		consensus.resignValidator();
		vm.stopPrank();

		consensus.calculateTopValidators(1);
		Validator[] memory validators = consensus.getTopValidators();
		assertEq(validators.length, 0);
	}

	function test_consensus_200_topValidators() public {
		vm.pauseGasMetering();
		assertEq(consensus.registeredValidatorsCount(), 0);

		address highest = address(0);
		uint256 highestBalance = 0;

		uint256 n = 200;
		for (uint256 i = 0; i < n; i++) {
			address addr = address(uint160(i + 1));
			uint balance = 0;
			vm.deal(addr, balance);

			if (balance == highestBalance) {
				if (addr > highest) {
					highest = addr;
				}
			}

			if (balance > highestBalance) {
				highest = addr;
				highestBalance = balance;
			}

			vm.startPrank(addr);

			consensus.registerValidator(prepareBLSKey(addr));
			consensus.vote(addr);
			vm.stopPrank();
		}

		vm.resumeGasMetering();

		uint160 activeValidators = 53;

		consensus.calculateTopValidators(uint8(activeValidators));
		Validator[] memory validators = consensus.getTopValidators();
		assertEq(validators.length, activeValidators);
		assertEq(validators[activeValidators - 1].addr, highest);

		consensus.calculateTopValidators(uint8(activeValidators));

		validators = consensus.getTopValidators();
		assertEq(validators.length, activeValidators);
		assertEq(validators[activeValidators - 1].addr, highest);
	}
}
