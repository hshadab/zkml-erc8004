import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

const RPC_URL = 'https://base-sepolia-rpc.publicnode.com';
const AGENT_ADDRESS = '0x16A8db57Adcf8Fa25DB3b41E03B6b2bc332a0E44';
const WETH_ADDRESS = '0x4200000000000000000000000000000000000006';
const UNISWAP_ROUTER = '0x94cC0AaC535CCDB3C01d6787D6413C739ae12bc4';

const provider = new ethers.JsonRpcProvider(RPC_URL);

const wethAbi = ['function allowance(address owner, address spender) view returns (uint256)'];
const weth = new ethers.Contract(WETH_ADDRESS, wethAbi, provider);

console.log('🔐 Checking WETH Approval Status...\n');

const allowance = await weth.allowance(AGENT_ADDRESS, UNISWAP_ROUTER);
console.log(`Agent: ${AGENT_ADDRESS}`);
console.log(`Router: ${UNISWAP_ROUTER}`);
console.log(`WETH: ${WETH_ADDRESS}`);
console.log('');
console.log(`Allowance: ${ethers.formatEther(allowance)} WETH`);
console.log(`Raw: ${allowance.toString()}`);
console.log('');

if (allowance === 0n) {
  console.log('❌ PROBLEM FOUND: Router has NO approval to spend agent\'s WETH!');
  console.log('');
  console.log('💡 The contract needs to approve the router before swapping.');
  console.log('   This is likely why the swap silently fails.');
  console.log('');
  console.log('🔧 Fix: The TradingAgent contract should call:');
  console.log('   IERC20(WETH).approve(swapRouter, type(uint256).max)');
  console.log('   in the constructor or before the first swap.');
} else {
  console.log('✅ Router is approved to spend agent\'s WETH');
  console.log('   This is NOT the issue.');
}
