// SPDX-License-Identifier: GNU GENERAL PUBLIC LICENSE
pragma solidity ^0.8.13;

import {Test, console} from "@forge-std/Test.sol";
import {ConsensusV1, ValidatorData, Validator} from "@contracts/consensus/ConsensusV1.sol";
import {Base} from "./Base.sol";

contract ConsensusTest is Base {
    ConsensusV1 public consensus;

    function setUp() public {
        consensus = new ConsensusV1();
    }

    function test_200_validators() public {
        vm.pauseGasMetering();
        assertEq(consensus.registeredValidatorsCount(), 0);

        uint256 n = 200;
        for (uint256 i = 0; i < n; i++) {
            address addr = address(uint160(i + 1));

            vm.startPrank(addr);
            consensus.registerValidator(prepareBLSKey(addr));
            consensus.vote(addr);
            vm.stopPrank();
        }

        vm.resumeGasMetering();

        Validator[] memory validators = consensus.getAllValidators();
        assertEq(validators.length, n);
    }
}
