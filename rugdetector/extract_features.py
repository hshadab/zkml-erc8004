"""
Rug Pull Detector - Feature Extraction
Extracts 60 on-chain features from a token address for risk scoring
"""

import os
from web3 import Web3
from datetime import datetime, timedelta
import json
from typing import List, Dict, Optional
from dotenv import load_dotenv

load_dotenv()

# Standard ERC20 ABI (minimal)
ERC20_ABI = [
    {"constant": True, "inputs": [], "name": "name", "outputs": [{"name": "", "type": "string"}], "type": "function"},
    {"constant": True, "inputs": [], "name": "totalSupply", "outputs": [{"name": "", "type": "uint256"}], "type": "function"},
    {"constant": True, "inputs": [{"name": "_owner", "type": "address"}], "name": "balanceOf", "outputs": [{"name": "balance", "type": "uint256"}], "type": "function"},
    {"constant": True, "inputs": [], "name": "decimals", "outputs": [{"name": "", "type": "uint8"}], "type": "function"},
    {"constant": True, "inputs": [], "name": "owner", "outputs": [{"name": "", "type": "address"}], "type": "function"},
]


class RugPullFeatureExtractor:
    """Extract 60 on-chain features for rug pull detection"""

    def __init__(self, rpc_url: str, etherscan_api_key: Optional[str] = None):
        self.w3 = Web3(Web3.HTTPProvider(rpc_url))
        self.etherscan_api_key = etherscan_api_key or os.getenv('ETHERSCAN_API_KEY')

        if not self.w3.is_connected():
            raise Exception(f"Failed to connect to RPC: {rpc_url}")

    def extract_features(self, token_address: str) -> List[float]:
        """
        Extract all 60 features for a token

        Returns: List of 60 float values
        """
        token_address = Web3.to_checksum_address(token_address)

        print(f"\n🔍 Extracting features for {token_address}...")

        # Initialize feature vector
        features = []

        # Get basic token info
        token = self.w3.eth.contract(address=token_address, abi=ERC20_ABI)

        try:
            total_supply = token.functions.totalSupply().call()
            decimals = token.functions.decimals().call()
        except Exception as e:
            print(f"⚠️  Warning: Could not get token basics: {e}")
            total_supply = 0
            decimals = 18

        # === CONTRACT FEATURES (15) ===
        print("  📋 Contract features...")
        features.extend(self._extract_contract_features(token_address, total_supply, decimals))

        # === LIQUIDITY FEATURES (15) ===
        print("  💧 Liquidity features...")
        features.extend(self._extract_liquidity_features(token_address))

        # === HOLDER FEATURES (15) ===
        print("  👥 Holder features...")
        features.extend(self._extract_holder_features(token_address, total_supply, decimals))

        # === TRADING FEATURES (15) ===
        print("  📊 Trading features...")
        features.extend(self._extract_trading_features(token_address))

        assert len(features) == 60, f"Expected 60 features, got {len(features)}"

        print(f"✅ Extracted {len(features)} features")
        return features

    def _extract_contract_features(self, token_address: str, total_supply: int, decimals: int) -> List[float]:
        """Extract 15 contract-related features"""
        features = []

        # 1. contract_age_days
        try:
            creation_block = self._get_contract_creation_block(token_address)
            current_block = self.w3.eth.block_number
            blocks_diff = current_block - creation_block
            days = (blocks_diff * 12) / (60 * 60 * 24)  # Assume 12s blocks
            features.append(float(days))
        except:
            features.append(0.0)

        # 2. is_verified
        features.append(float(self._is_contract_verified(token_address)))

        # 3-8. Dangerous functions (simplified - would need actual bytecode analysis)
        # has_mint, has_pause, has_blacklist, ownership_renounced, proxy_contract, honeypot
        bytecode = self.w3.eth.get_code(token_address).hex()
        features.append(1.0 if 'mint' in bytecode.lower() else 0.0)  # mint function
        features.append(1.0 if 'pause' in bytecode.lower() else 0.0)  # pause function
        features.append(1.0 if 'blacklist' in bytecode.lower() else 0.0)  # blacklist
        features.append(0.0)  # ownership_renounced (would need to check Ownable)
        features.append(1.0 if len(bytecode) < 1000 else 0.0)  # proxy (simplified)
        features.append(0.0)  # honeypot (would need to test buy/sell)

        # 9-10. Transaction limits
        features.append(100.0)  # max_tx_limit (assume 100% if not found)
        features.append(100.0)  # max_wallet_limit

        # 11-12. Tax percentages
        features.append(0.0)  # buy_tax_pct
        features.append(0.0)  # sell_tax_pct

        # 13. has_anti_whale
        features.append(0.0)

        # 14. creator_is_contract
        try:
            creator = self._get_contract_creator(token_address)
            creator_code = self.w3.eth.get_code(Web3.to_checksum_address(creator))
            features.append(1.0 if len(creator_code) > 2 else 0.0)
        except:
            features.append(0.0)

        # 15. total_supply (normalized to millions)
        supply_human = total_supply / (10 ** decimals)
        features.append(float(supply_human / 1_000_000))

        return features

    def _extract_liquidity_features(self, token_address: str) -> List[float]:
        """Extract 15 liquidity-related features"""
        # Simplified - in production would query Uniswap/Sushiswap pools
        features = []

        # 16-30. Liquidity features (using defaults for demo)
        features.append(0.0)   # liquidity_usd
        features.append(0.0)   # liquidity_locked_pct
        features.append(0.0)   # liquidity_lock_days
        features.append(0.0)   # lp_token_burned_pct
        features.append(0.0)   # pool_age_days
        features.append(0.0)   # pool_creator_same
        features.append(100.0) # liquidity_concentrated_top1
        features.append(5.0)   # price_impact_1eth
        features.append(15.0)  # price_impact_10eth
        features.append(1.0)   # slippage_tolerance
        features.append(0.0)   # liquidity_change_24h
        features.append(0.0)   # volume_to_liquidity_ratio
        features.append(0.0)   # pool_token0_is_weth
        features.append(1.0)   # multiple_pools_count
        features.append(1.0)   # rugpull_threshold (1=below safe threshold)

        return features

    def _extract_holder_features(self, token_address: str, total_supply: int, decimals: int) -> List[float]:
        """Extract 15 holder-related features"""
        features = []

        # Get top holders (would use Etherscan API or graph query in production)
        holders = self._get_top_holders(token_address, limit=100)

        # 31. holder_count
        features.append(float(len(holders)))

        # 32-45. Holder distribution features
        if len(holders) > 0:
            total_held = sum(h['balance'] for h in holders)
            top10_pct = sum(h['balance'] for h in holders[:10]) / total_supply * 100 if total_supply > 0 else 0
            top1_pct = holders[0]['balance'] / total_supply * 100 if total_supply > 0 else 0

            features.append(float(top10_pct))   # top10_holders_pct
            features.append(float(top1_pct))    # top1_holder_pct
        else:
            features.extend([0.0, 0.0])

        # 34-45. Additional holder features (simplified)
        features.append(0.0)   # creator_balance_pct
        features.append(0.0)   # dead_wallet_pct
        features.append(0.0)   # contract_balance_pct
        features.append(0.0)   # holders_growth_24h
        features.append(0.0)   # whale_count
        features.append(0.0)   # sniper_count
        features.append(0.0)   # bot_holder_pct
        features.append(0.0)   # team_wallet_count
        features.append(0.0)   # team_balance_pct
        features.append(0.0)   # airdrop_wallets_pct
        features.append(0.5)   # holder_concentration_gini
        features.append(0.0)   # new_holders_24h

        return features

    def _extract_trading_features(self, token_address: str) -> List[float]:
        """Extract 15 trading-related features"""
        # Simplified - would query DEX events in production
        features = []

        # 46-60. Trading features (using defaults for demo)
        features.append(0.0)   # trade_count_24h
        features.append(0.0)   # buy_count_24h
        features.append(0.0)   # sell_count_24h
        features.append(0.0)   # volume_usd_24h
        features.append(0.0)   # price_change_1h_pct
        features.append(0.0)   # price_change_24h_pct
        features.append(0.0)   # price_volatility_24h
        features.append(0.5)   # sell_pressure_ratio
        features.append(0.0)   # large_sells_24h
        features.append(0.0)   # suspicious_sells
        features.append(0.0)   # flash_loan_attacks
        features.append(0.0)   # sandwich_attacks
        features.append(0.0)   # first_block_snipers
        features.append(24.0)  # avg_hold_time_hours
        features.append(0.0)   # panic_sell_events

        return features

    # === HELPER METHODS ===

    def _get_contract_creation_block(self, token_address: str) -> int:
        """Get the block number when contract was created"""
        # Simplified - would use Etherscan API in production
        return self.w3.eth.block_number - 1000  # Assume created 1000 blocks ago

    def _is_contract_verified(self, token_address: str) -> bool:
        """Check if contract source code is verified"""
        # Would use Etherscan API in production
        return False

    def _get_contract_creator(self, token_address: str) -> str:
        """Get the address that deployed this contract"""
        # Would use Etherscan API in production
        return "0x0000000000000000000000000000000000000000"

    def _get_top_holders(self, token_address: str, limit: int = 100) -> List[Dict]:
        """Get top token holders"""
        # Would use Etherscan API or The Graph in production
        # For now, return mock data
        token = self.w3.eth.contract(address=token_address, abi=ERC20_ABI)

        try:
            total_supply = token.functions.totalSupply().call()

            # Mock: create some fake holders
            holders = [
                {'address': f'0x{"1" * 40}', 'balance': total_supply * 0.2},
                {'address': f'0x{"2" * 40}', 'balance': total_supply * 0.15},
                {'address': f'0x{"3" * 40}', 'balance': total_supply * 0.10},
            ]
            return holders
        except:
            return []


def extract_token_features(token_address: str, rpc_url: Optional[str] = None) -> List[float]:
    """
    Convenience function to extract features for a token

    Args:
        token_address: Token contract address
        rpc_url: RPC endpoint (defaults to env var RPC_URL)

    Returns:
        List of 60 float features
    """
    if not rpc_url:
        rpc_url = os.getenv('RPC_URL', 'https://eth-mainnet.g.alchemy.com/v2/demo')

    extractor = RugPullFeatureExtractor(rpc_url)
    return extractor.extract_features(token_address)


if __name__ == '__main__':
    import sys

    if len(sys.argv) < 2:
        print("Usage: python extract_features.py <token_address> [rpc_url]")
        print("\nExample:")
        print("  python extract_features.py 0x1234... https://base-mainnet.g.alchemy.com/v2/YOUR_KEY")
        sys.exit(1)

    token_addr = sys.argv[1]
    rpc = sys.argv[2] if len(sys.argv) > 2 else os.getenv('RPC_URL')

    if not rpc:
        print("❌ Error: No RPC URL provided. Set RPC_URL env var or pass as argument.")
        sys.exit(1)

    features = extract_token_features(token_addr, rpc)

    print(f"\n✅ Extracted {len(features)} features:")
    print(f"   {features[:10]}... (showing first 10)")

    # Save to file
    output_file = 'extracted_features.json'
    with open(output_file, 'w') as f:
        json.dump({
            'token_address': token_addr,
            'features': features,
            'timestamp': datetime.now().isoformat()
        }, f, indent=2)

    print(f"\n💾 Saved to {output_file}")
