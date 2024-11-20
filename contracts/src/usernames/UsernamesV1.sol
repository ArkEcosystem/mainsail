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

    // External functions

    // RULES:
    // minimum length of 1 character
    // maximum length of 20 characters
    // only lowercase letters, numbers and underscores are allowed
    // cannot start or end with underscore
    // cannot contain two or more consecutive underscores
    function registerUsername(string memory username) external preventOwner {
        // Register username
        bytes memory b = bytes(username);

        // Check username length
        require(b.length >= 1 && b.length <= 20, "Invalid username length");

        if (b[0] == 0x5F || b[b.length - 1] == 0x5F) {
            revert("Username cannot start or end with underscore");
        }

        for (uint256 i = 0; i < b.length; i++) {
            if (
                !(b[i] >= 0x30 && b[i] <= 0x39) // 0-9
                    && !(b[i] >= 0x61 && b[i] <= 0x7A) // a-z
                    && !(b[i] == 0x5F) // _
            ) {
                revert("Invalid character in username");
            }

            if (b[i] == 0x5F && b[i + 1] == 0x5F) {
                revert("Username cannot contain two or more consecutive underscores");
            }
        }
    }
}
