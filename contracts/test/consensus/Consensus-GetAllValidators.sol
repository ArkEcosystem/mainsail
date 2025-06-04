// SPDX-License-Identifier: GNU GENERAL PUBLIC LICENSE
pragma solidity ^0.8.13;

import {ConsensusV1} from "@contracts/consensus/ConsensusV1.sol";
import {Base} from "./Base.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

contract ConsensusTest is Base {
    function test_200_validators() public {
        vm.pauseGasMetering();
        assertEq(consensus.validatorsCount(), 0);

        uint256 n = 200;
        for (uint256 i = 0; i < n; i++) {
            address addr = address(uint160(i + 1));

            vm.startPrank(addr);
            consensus.registerValidator(prepareBLSKey(addr));
            consensus.vote(addr);
            vm.stopPrank();
        }

        vm.resumeGasMetering();

        ConsensusV1.Validator[] memory validators = consensus.getAllValidators();
        assertEq(validators.length, n);
    }
}
