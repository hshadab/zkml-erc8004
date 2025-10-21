/**
 * Transfer USDC from old agent to new agent
 */
import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  const provider = new ethers.JsonRpcProvider(process.env.BASE_MAINNET_RPC_URL);
  const wallet = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY, provider);

  const OLD_AGENT = '0x6205fc33c92aDA8d5b5F0E862EBcAfb69E1C14ab';
  const NEW_AGENT = '0xDc16AD04c41F81E3f4d019A7ab2A562B6D36de7A';
  const USDC = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';

  console.log('\n💸 Transferring USDC from old agent to new agent...\n');
  console.log(`Old Agent: ${OLD_AGENT}`);
  console.log(`New Agent: ${NEW_AGENT}`);
  console.log(`Owner: ${wallet.address}\n`);

  // ABIs
  const agentABI = [
    'function emergencyWithdraw(address token, uint256 amount) external',
    'function getPortfolio() external view returns (uint256 ethBalance, uint256 usdcBalance)'
  ];

  const usdcABI = [
    'function balanceOf(address account) external view returns (uint256)',
    'function transfer(address to, uint256 amount) external returns (bool)'
  ];

  const oldAgent = new ethers.Contract(OLD_AGENT, agentABI, wallet);
  const newAgent = new ethers.Contract(NEW_AGENT, agentABI, provider);
  const usdc = new ethers.Contract(USDC, usdcABI, wallet);

  // Check old agent balance
  console.log('📊 Checking balances...');
  const [oldEth, oldUsdc] = await oldAgent.getPortfolio();
  console.log(`   Old Agent: ${ethers.formatUnits(oldUsdc, 6)} USDC\n`);

  if (oldUsdc === 0n) {
    console.log('❌ Old agent has no USDC to transfer');
    return;
  }

  // Step 1: Withdraw USDC from old agent to owner
  console.log('📤 Step 1: Withdrawing USDC from old agent to owner...');
  const withdrawTx = await oldAgent.emergencyWithdraw(USDC, oldUsdc, {
    gasLimit: 300000
  });

  console.log(`   TX: ${withdrawTx.hash}`);
  console.log(`   🔗 BaseScan: https://basescan.org/tx/${withdrawTx.hash}`);

  const withdrawReceipt = await withdrawTx.wait();
  console.log(`   ✅ Withdrawn! Gas used: ${withdrawReceipt.gasUsed}\n`);

  // Check owner balance
  const ownerBalance = await usdc.balanceOf(wallet.address);
  console.log(`   Owner now has: ${ethers.formatUnits(ownerBalance, 6)} USDC\n`);

  // Step 2: Transfer USDC from owner to new agent
  console.log('📤 Step 2: Transferring USDC from owner to new agent...');
  const transferTx = await usdc.transfer(NEW_AGENT, oldUsdc, {
    gasLimit: 100000
  });

  console.log(`   TX: ${transferTx.hash}`);
  console.log(`   🔗 BaseScan: https://basescan.org/tx/${transferTx.hash}`);

  const transferReceipt = await transferTx.wait();
  console.log(`   ✅ Transferred! Gas used: ${transferReceipt.gasUsed}\n`);

  // Verify new agent balance
  const [newEth, newUsdc] = await newAgent.getPortfolio();
  console.log('✅ Transfer complete!');
  console.log(`   New Agent now has: ${ethers.formatUnits(newUsdc, 6)} USDC\n`);

  console.log('🎯 Next steps:');
  console.log('   1. Restart BaseTrader service');
  console.log('   2. Post GOOD_NEWS classification to test swap\n');
}

main().catch(error => {
  console.error('❌ Transfer failed:', error.message);
  process.exit(1);
});
