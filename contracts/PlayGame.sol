// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
contract PlayGame is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;
    enum MatchStatus{ NONE, CREATED, STAKED, SETTLED, REFUNDED }
    struct MatchInfo { address p1; address p2; uint256 stake; bool staked1; bool staked2; MatchStatus status; uint256 startTime; }
    mapping(bytes32=>MatchInfo) public matches;
    IERC20 public immutable gameToken; address public operator; uint256 public refundTimeout;
    event MatchCreated(bytes32 indexed matchId, address p1, address p2, uint256 stake);
    event Staked(bytes32 indexed matchId, address indexed player);
    event Settled(bytes32 indexed matchId, address indexed winner, uint256 amount);
    event Refunded(bytes32 indexed matchId);
    modifier onlyOperator(){ require(msg.sender==operator, "not operator"); _; }
    constructor(address _gameToken, address _operator, uint256 _refundTimeout){
        require(_gameToken!=address(0), "zero token"); gameToken=IERC20(_gameToken); operator=_operator; refundTimeout=_refundTimeout;
    }
    function setOperator(address _op) external onlyOwner { operator=_op; }
    function setRefundTimeout(uint256 _t) external onlyOwner { refundTimeout=_t; }
    function createMatch(bytes32 matchId, address p1, address p2, uint256 stake) external onlyOwner {
        require(matchId!=bytes32(0),"zero id"); MatchInfo storage m = matches[matchId];
        require(m.status==MatchStatus.NONE || m.status==MatchStatus.REFUNDED || m.status==MatchStatus.SETTLED, "exists");
        require(p1!=address(0) && p2!=address(0), "zero players"); require(stake>0, "zero stake");
        matches[matchId]=MatchInfo({p1:p1,p2:p2,stake:stake,staked1:false,staked2:false,status:MatchStatus.CREATED,startTime:0});
        emit MatchCreated(matchId,p1,p2,stake);
    }
    function stake(bytes32 matchId) external nonReentrant {
        MatchInfo storage m = matches[matchId];
        require(m.status==MatchStatus.CREATED,"not created");
        require(msg.sender==m.p1 || msg.sender==m.p2,"not player");
        gameToken.safeTransferFrom(msg.sender, address(this), m.stake);
        if(msg.sender==m.p1){ require(!m.staked1,"p1 staked"); m.staked1=true; } else { require(!m.staked2,"p2 staked"); m.staked2=true; }
        emit Staked(matchId,msg.sender);
        if(m.staked1 && m.staked2){ m.status=MatchStatus.STAKED; m.startTime=block.timestamp; }
    }
    function commitResult(bytes32 matchId, address winner) external onlyOperator nonReentrant {
        MatchInfo storage m = matches[matchId];
        require(m.status==MatchStatus.STAKED,"not staked");
        require(winner==m.p1 || winner==m.p2,"bad winner");
        uint256 payout = m.stake*2;
        m.status=MatchStatus.SETTLED; gameToken.safeTransfer(winner, payout);
        emit Settled(matchId, winner, payout);
    }
    function refund(bytes32 matchId) external nonReentrant {
        MatchInfo storage m = matches[matchId];
        require(m.status==MatchStatus.STAKED || m.status==MatchStatus.CREATED, "no refund");
        require(m.startTime>0 ? (block.timestamp >= m.startTime + refundTimeout) : true, "timeout");
        if(m.staked1) gameToken.safeTransfer(m.p1, m.stake);
        if(m.staked2) gameToken.safeTransfer(m.p2, m.stake);
        m.status=MatchStatus.REFUNDED; emit Refunded(matchId);
    }
}