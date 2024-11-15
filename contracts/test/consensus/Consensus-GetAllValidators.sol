// SPDX-License-Identifier: GNU GENERAL PUBLIC LICENSE
pragma solidity ^0.8.13;

import {Test, console} from "@forge-std/Test.sol";
import {ConsensusV1, ValidatorData, Validator} from "@contracts/consensus/ConsensusV1.sol";
import {Base} from "./Base.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

contract ConsensusTest is Base {
    ConsensusV1 public consensus;

    function setUp() public {
        bytes memory data = abi.encode(ConsensusV1.initialize.selector);
        address proxy = address(new ERC1967Proxy(address(new ConsensusV1()), data));
        consensus = ConsensusV1(proxy);
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
