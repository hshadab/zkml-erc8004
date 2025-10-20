import { ethers } from 'ethers';
import dotenv from 'dotenv';
dotenv.config();

const provider = new ethers.JsonRpcProvider(process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com');
const oracleAddress = '0x037B74A3c354522312C67a095D043347E9Ffc40f';
const oracleAbi = ['function getClassificationCount() external view returns (uint256)'];
const oracle = new ethers.Contract(oracleAddress, oracleAbi, provider);

const count = await oracle.getClassificationCount();
console.log(`Total classifications on-chain: ${count}`);
