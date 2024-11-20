// SPDX-License-Identifier: GNU GENERAL PUBLIC LICENSE
pragma solidity ^0.8.27;

import {UUPSUpgradeable} from "@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol";
import {Initializable} from "@openzeppelin/contracts/proxy/utils/Initializable.sol";

error CallerIsNotOwner();
error CallerIsOwner();

contract UsernamesV1 is Initializable, UUPSUpgradeable {
    address private _owner;
    // Modifiers

    modifier onlyOwner() {
        if (msg.sender != _owner) {
            revert CallerIsNotOwner();
        }
        _;
    }

    modifier preventOwner() {
        if (msg.sender == _owner) {
            revert CallerIsOwner();
        }
        _;
    }

    // Initializers
    function initialize() public initializer {
        _owner = msg.sender;
    }

    // Overrides
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}
}
