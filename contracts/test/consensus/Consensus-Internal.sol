// SPDX-License-Identifier: GNU GENERAL PUBLIC LICENSE
pragma solidity ^0.8.13;

import {Test, console} from "@forge-std/Test.sol";
import {ConsensusV1} from "@contracts/consensus/ConsensusV1.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

contract ConsensusInternalTest is Test, ConsensusV1 {
    function test_clamp() public {
        assertEq(_clamp(0, 0, 0), 0);
        assertEq(_clamp(0, 5, 10), 5);
        assertEq(_clamp(10, 0, 5), 5);

        vm.expectRevert(abi.encodeWithSelector(ConsensusV1.InvalidRange.selector, 5, 0));
        _clamp(0, 5, 0);
    }

    function test_shuffleMemEmpty() public view {
        address[] memory addresses = new address[](0);
        _shuffleMem(addresses);
    }
}
