// SPDX-License-Identifier: GNU GENERAL PUBLIC LICENSE
pragma solidity ^0.8.13;

import {Test, console} from "forge-std/Test.sol";
import {Consensus, ValidatorData, Validator} from "../src/Consensus.sol";

contract ConsensusTest is Test {
    Consensus public consensus;

    function setUp() public {
        consensus = new Consensus();
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

            if(balance == highestBalance ) {
                if(addr > highest) {
                    highest = addr;
                }
            } 

            if(balance > highestBalance) {
                highest = addr;
                highestBalance = balance;
            }

            vm.startPrank(addr);

            bytes32 h = keccak256(abi.encode(addr));
            bytes memory validatorKey = new bytes(48);
            for (uint256 j = 0; j < 32; j++) {
                validatorKey[j] = h[j];
            }

            consensus.registerValidator(validatorKey);
            consensus.vote(addr);
            vm.stopPrank();
        }

        vm.resumeGasMetering();

        uint160 activeValidators = 53;

        consensus.calculateTopValidators(uint8(activeValidators));
        Validator[] memory validators = consensus.getTopValidators();
        assertEq(validators.length, activeValidators);
        assertEq(validators[activeValidators-1].addr, highest);

        console.logString("RESET");
        consensus.calculateTopValidators(uint8(activeValidators));

        validators = consensus.getTopValidators();
        assertEq(validators.length, activeValidators);
        assertEq(validators[activeValidators-1].addr, highest);
    }
}
