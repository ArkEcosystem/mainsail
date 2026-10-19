// SPDX-License-Identifier: GNU GENERAL PUBLIC LICENSE
pragma solidity ^0.8.13;

import {Test, console} from "@forge-std/Test.sol";
import {ConsensusV1} from "@contracts/consensus/ConsensusV1.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

contract ConsensusInternalWrapper is ConsensusV1 {
    function min(uint256 valueA, uint256 valueB) external pure returns (uint256) {
        return _min(valueA, valueB);
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

    function test_min() public {
        assertEq(consensus.min(0, 0), 0);
        assertEq(consensus.min(3, 3), 3);
        assertEq(consensus.min(5, 10), 5);
        assertEq(consensus.min(10, 5), 5);
    }

    function test_shuffleMemEmpty() public view {
        address[] memory addresses = new address[](0);
        consensus.shuffleMem(addresses);
    }
}
