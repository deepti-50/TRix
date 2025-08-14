// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
interface IGameToken { function mint(address to, uint256 amount) external; }
contract TokenStore is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;
    IERC20 public immutable usdt;
    IGameToken public immutable gameToken;
    uint256 public gtPerUsdt;
    event Purchase(address indexed buyer, uint256 usdtAmount, uint256 gtOut);
    event Withdraw(address indexed to, uint256 amount);
    event RateChanged(uint256 newRate);
    constructor(address _usdt, address _gameToken, uint256 _gtPerUsdt) {
        require(_usdt!=address(0) && _gameToken!=address(0), "zero addr");
        usdt = IERC20(_usdt); gameToken = IGameToken(_gameToken); gtPerUsdt = _gtPerUsdt;
    }
    function buy(uint256 usdtAmount) external nonReentrant {
        require(usdtAmount>0, "zero amt");
        usdt.safeTransferFrom(msg.sender, address(this), usdtAmount);
        uint256 gtOut = (usdtAmount * gtPerUsdt) / 1e6;
        gameToken.mint(msg.sender, gtOut);
        emit Purchase(msg.sender, usdtAmount, gtOut);
    }
    function setRate(uint256 newRate) external onlyOwner { gtPerUsdt = newRate; emit RateChanged(newRate); }
    function withdrawUSDT(address to, uint256 amount) external onlyOwner { usdt.safeTransfer(to, amount); emit Withdraw(to, amount); }
}