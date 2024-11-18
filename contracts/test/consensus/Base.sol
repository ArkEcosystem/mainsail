// SPDX-License-Identifier: GNU GENERAL PUBLIC LICENSE
pragma solidity ^0.8.13;

import {Test, console} from "@forge-std/Test.sol";
import {ConsensusV1, Validator} from "@contracts/consensus/ConsensusV1.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

contract Base is Test {
    ConsensusV1 public consensus;

    function setUp() public {
        bytes memory data = abi.encode(ConsensusV1.initialize.selector);
        address proxy = address(new ERC1967Proxy(address(new ConsensusV1()), data));
        consensus = ConsensusV1(proxy);
    }

    function prepareBLSKey(address addr, uint8 lenght) public pure returns (bytes memory) {
        bytes32 h = keccak256(abi.encode(addr));
        bytes memory validatorKey = new bytes(lenght);
        for (uint256 j = 0; j < 32; j++) {
            validatorKey[j] = h[j];
        }
        return validatorKey;
    }

    function prepareBLSKey(address addr) public pure returns (bytes memory) {
        return prepareBLSKey(addr, 48);
    }

    function sortValidators(Validator[] memory validators) public pure returns (Validator[] memory) {
        uint256 length = validators.length;
        for (uint256 i = 0; i < length; i++) {
            for (uint256 j = i + 1; j < length; j++) {
                // Sort in descending order by votersCount
                if (_isGreater(validators[i], validators[j])) {
                    Validator memory temp = validators[i];
                    validators[i] = validators[j];
                    validators[j] = temp;
                }
            }
        }
        return validators;
    }

    function _isGreater(Validator memory validatorA, Validator memory validatorB) internal pure returns (bool) {
        if (validatorA.data.voteBalance == validatorB.data.voteBalance) {
            return validatorA.addr > validatorB.addr;
        }

        return validatorA.data.voteBalance > validatorB.data.voteBalance;
    }

    function registerValidator(address addr) internal {
        bytes32 h = keccak256(abi.encode(addr));
        bytes memory validatorKey = new bytes(48);
        for (uint256 j = 0; j < 32; j++) {
            validatorKey[j] = h[j];
        }

        vm.startPrank(addr);
        consensus.registerValidator(validatorKey);
        vm.stopPrank();

        Validator memory validator = consensus.getValidator(addr);
        assertEq(validator.addr, addr);
        assertEq(validator.data.voteBalance, 0 ether);
        assertEq(validator.data.votersCount, 0);
    }

    function resignValidator(address addr) internal {
        vm.startPrank(addr);
        consensus.resignValidator();
        vm.stopPrank();
    }
}
