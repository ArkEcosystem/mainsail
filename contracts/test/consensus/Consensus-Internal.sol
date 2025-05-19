// SPDX-License-Identifier: GNU GENERAL PUBLIC LICENSE
pragma solidity ^0.8.13;

import {Test, console} from "@forge-std/Test.sol";
import {ConsensusV1} from "@contracts/consensus/ConsensusV1.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

contract ConsensusInternalWrapper is ConsensusV1 {
    function clamp(uint256 value, uint256 min, uint256 max) external pure returns (uint256) {
        return _clamp(value, min, max);
    }

    function shuffleMem(address[] memory array) external view {
        return _shuffleMem(array);
    }
}

contract ConsensusInternalTest is Test {
    ConsensusInternalWrapper consensus;

    function setUp() public {
        consensus = new ConsensusInternalWrapper();
    }

    function test_clamp() public {
        assertEq(consensus.clamp(0, 0, 0), 0);
        assertEq(consensus.clamp(0, 5, 10), 5);
        assertEq(consensus.clamp(10, 0, 5), 5);

        vm.expectRevert(abi.encodeWithSelector(ConsensusV1.InvalidRange.selector, 5, 0));
        consensus.clamp(0, 5, 0);
    }

    function test_shuffleMemEmpty() public view {
        address[] memory addresses = new address[](0);
        consensus.shuffleMem(addresses);
    }
}
