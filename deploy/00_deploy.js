const hre = require("hardhat");
async function main(){
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deployer:", deployer.address);
  const MockUSDT = await hre.ethers.getContractFactory("MockUSDT");
  const mockUsdt = await MockUSDT.deploy("Mock USDT", "mUSDT", 6); await mockUsdt.waitForDeployment();
  console.log("MockUSDT:", await mockUsdt.getAddress());
  const GameToken = await hre.ethers.getContractFactory("GameToken");
  const gameToken = await GameToken.deploy("GameToken", "GT"); await gameToken.waitForDeployment();
  console.log("GameToken:", await gameToken.getAddress());
  const gtPerUsdt = hre.ethers.parseUnits("1", 18);
  const TokenStore = await hre.ethers.getContractFactory("TokenStore");
  const tokenStore = await TokenStore.deploy(await mockUsdt.getAddress(), await gameToken.getAddress(), gtPerUsdt); await tokenStore.waitForDeployment();
  console.log("TokenStore:", await tokenStore.getAddress());
  await (await gameToken.setMinter(await tokenStore.getAddress())).wait();
  const PlayGame = await hre.ethers.getContractFactory("PlayGame");
  const playGame = await PlayGame.deploy(await gameToken.getAddress(), deployer.address, 24*3600); await playGame.waitForDeployment();
  console.log("PlayGame:", await playGame.getAddress());
  console.log("\nGAMETOKEN_ADDRESS=", await gameToken.getAddress());
  console.log("TOKENSTORE_ADDRESS=", await tokenStore.getAddress());
  console.log("PLAYGAME_ADDRESS=", await playGame.getAddress());
}
main().catch((e)=>{console.error(e);process.exit(1);});
