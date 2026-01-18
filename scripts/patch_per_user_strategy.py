#!/usr/bin/env python3
"""
Patch scan_engine_v2.py to support per-user, per-symbol strategy resolution.

Changes:
1. Add userId to ScanConfig
2. Import user_strategies_store functions
3. In scan loop, resolve strategy per symbol using get_strategy_id_for_symbol
4. Track strategyIdUsed per symbol correctly
"""

import re

SCAN_ENGINE_PATH = "/opt/JKM-AI-BOT/core/scan_engine_v2.py"

def patch_file():
    with open(SCAN_ENGINE_PATH, "r", encoding="utf-8") as f:
        content = f.read()
    
    original = content
    
    # 1. Add import for user_strategies_store after other imports
    if "from core.user_strategies_store import" not in content:
        # Find a good place to add import (after pydantic import)
        import_marker = "from pydantic import BaseModel"
        if import_marker in content:
            content = content.replace(
                import_marker,
                import_marker + "\n\n# User strategy store for per-symbol strategy resolution\ntry:\n    from core.user_strategies_store import get_strategy_id_for_symbol, get_strategy_by_id\nexcept ImportError:\n    get_strategy_id_for_symbol = None\n    get_strategy_by_id = None"
            )
            print("✅ Added user_strategies_store import")
        else:
            print("⚠️ Could not find import marker")
    
    # 2. Add userId to ScanConfig class
    if "userId: str" not in content:
        # Find ScanConfig class and add userId field
        scanconfig_pattern = r'(class ScanConfig\(BaseModel\):.*?""".*?""")\s*\n(\s+strategyId: str)'
        replacement = r'\1\n    userId: str = ""\n\2'
        content = re.sub(scanconfig_pattern, replacement, content, flags=re.DOTALL)
        if "userId: str" in content:
            print("✅ Added userId to ScanConfig")
        else:
            print("⚠️ Could not add userId to ScanConfig")
    
    # 3. Add per-symbol strategy resolution in the scan loop
    # Find the line: self._status.perSymbol[symbol]["strategyIdUsed"] = self._config.strategyId
    # Replace with dynamic resolution
    
    old_strat_line = 'self._status.perSymbol[symbol]["strategyIdUsed"] = self._config.strategyId'
    if old_strat_line in content:
        new_strat_block = '''# Resolve effective strategy for this symbol
                    effective_strat_id = self._config.strategyId  # default
                    if self._config.userId and get_strategy_id_for_symbol:
                        try:
                            resolved_id = get_strategy_id_for_symbol(self._config.userId, symbol)
                            if resolved_id:
                                effective_strat_id = resolved_id
                        except Exception as e:
                            logger.debug(f"Strategy resolve failed for {symbol}: {e}")
                    self._status.perSymbol[symbol]["strategyIdUsed"] = effective_strat_id'''
        content = content.replace(old_strat_line, new_strat_block)
        print("✅ Added per-symbol strategy resolution in scan loop")
    else:
        print("⚠️ Could not find strategyIdUsed line to patch")
    
    # 4. Verify changes
    if content != original:
        with open(SCAN_ENGINE_PATH, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"\n✅ Patched {SCAN_ENGINE_PATH}")
        return True
    else:
        print("\n⚠️ No changes made")
        return False

if __name__ == "__main__":
    patch_file()
