// SPDX-License-Identifier: GNU GENERAL PUBLIC LICENSE
pragma solidity ^0.8.27;

import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

contract MultiPaymentV1 is UUPSUpgradeable, OwnableUpgradeable {
    error RecipientsAndAmountsMismatch();
    error InvalidValue();

    event Payment(address indexed recipient, uint256 amount, bool success);

    // Initializers
    function initialize() public initializer {
        __Ownable_init(msg.sender);
    }

    // Overrides
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    function version() external pure returns (uint256) {
        return 1;
    }

    function pay(address payable[] calldata recipients, uint256[] calldata amounts) external payable {
        if (recipients.length != amounts.length) {
            revert RecipientsAndAmountsMismatch();
        }

        // Ensure value sent is equal to the total amount to send
        uint256 total = 0;
        for (uint256 i = 0; i < amounts.length; i++) {
            total += amounts[i];
        }
        if (msg.value != total) {
            revert InvalidValue();
        }

        if (recipients.length == 0) {
            return;
        }

        for (uint256 i = 0; i < recipients.length; i++) {
            (bool sent,) = recipients[i].call{value: amounts[i], gas: 5000}("");
            if (sent) {
                total -= amounts[i];
            }

            emit Payment(recipients[i], amounts[i], sent);
        }

        // Refund any remaining value due to partial payments
        if (total > 0) {
            (bool success,) = msg.sender.call{value: total}("");
            require(success, "Refund failed");
        }
    }
}
