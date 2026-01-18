from typing import Optional
import os

try:
    from fastapi import FastAPI, Header, HTTPException, Depends, Body  # type: ignore
except Exception:
    class HTTPException(Exception):
        def __init__(self, status_code: int, detail: str):
            super().__init__(detail)
            self.status_code = status_code
            self.detail = detail

    def Header(*args, **kwargs):
        return None

    def Depends(*args, **kwargs):
        return None

    def Body(*args, **kwargs):
        return None

    class FastAPI:
        def get(self, *args, **kwargs):
            def decorator(fn):
                return fn
            return decorator

        def post(self, *args, **kwargs):
            def decorator(fn):
                return fn
            return decorator

try:
    from api_server import app  # type: ignore
except Exception:
    app = FastAPI()


# ======== INTERNAL AUTH (must be before routes using it) ========
def require_internal_key(
    x_internal_api_key: Optional[str] = Header(default=None, alias="x-internal-api-key")
) -> bool:
    expected = os.getenv("INTERNAL_API_KEY")
    if not expected:
        raise HTTPException(status_code=500, detail="INTERNAL_API_KEY not configured")
    if not x_internal_api_key or x_internal_api_key != expected:
        raise HTTPException(status_code=401, detail="unauthorized")
    return True


# ======== INTERNAL USER-DATA ENDPOINTS ========

@app.get("/api/internal/user-data/strategies/{uid}", dependencies=[Depends(require_internal_key)])
async def get_user_data_strategies(uid: str):
    from core.user_strategies_store import ensure_starter_strategies, load_active_strategy_map  # type: ignore
    strategies, active_id = ensure_starter_strategies(uid)
    strategy_map = load_active_strategy_map(uid)
    return {"ok": True, "uid": uid, "strategies": strategies, "activeStrategyId": active_id, "activeStrategyMap": strategy_map, "count": len(strategies)}


@app.post("/api/internal/user-data/active-strategy/{uid}", dependencies=[Depends(require_internal_key)])
async def set_active_strategy(uid: str, payload: dict = Body(...)):
    from core.user_strategies_store import save_active_strategy_id, ensure_starter_strategies  # type: ignore
    strategy_id = payload.get("activeStrategyId", "")
    if not strategy_id:
        raise HTTPException(status_code=400, detail="activeStrategyId required")
    strategies, _ = ensure_starter_strategies(uid)
    valid_ids = [s.get("id") for s in strategies]
    if strategy_id not in valid_ids:
        raise HTTPException(status_code=404, detail="Strategy not found")
    save_active_strategy_id(uid, strategy_id)
    return {"ok": True, "uid": uid, "activeStrategyId": strategy_id}


@app.post("/api/internal/user-data/active-strategy-map/{uid}", dependencies=[Depends(require_internal_key)])
async def set_active_strategy_map(uid: str, payload: dict = Body(...)):
    from core.user_strategies_store import save_active_strategy_map, ensure_starter_strategies  # type: ignore
    from core.scan_engine_v2 import DEFAULT_15_SYMBOLS  # type: ignore
    strategy_map = payload.get("map", {})
    if not isinstance(strategy_map, dict):
        raise HTTPException(status_code=400, detail="map must be a dict")
    valid_symbols = set(DEFAULT_15_SYMBOLS)
    for symbol in strategy_map.keys():
        if symbol not in valid_symbols:
            raise HTTPException(status_code=400, detail=f"Invalid symbol: {symbol}")
    strategies, _ = ensure_starter_strategies(uid)
    valid_ids = {s.get("id") for s in strategies}
    for symbol, strat_id in strategy_map.items():
        if strat_id and strat_id not in valid_ids:
            raise HTTPException(status_code=400, detail=f"Strategy {strat_id} not found")
    save_active_strategy_map(uid, strategy_map)
    return {"ok": True, "uid": uid, "activeStrategyMap": strategy_map}


@app.get("/api/internal/engine/strategy-map-status/{uid}", dependencies=[Depends(require_internal_key)])
async def get_engine_strategy_map_status(uid: str):
    from core.user_strategies_store import ensure_starter_strategies, load_active_strategy_id, load_active_strategy_map, get_strategy_id_for_symbol, get_strategy_by_id  # type: ignore
    from core.scan_engine_v2 import DEFAULT_15_SYMBOLS, load_status  # type: ignore
    scanner_status = load_status().dict()
    strategies, _ = ensure_starter_strategies(uid)
    active_id = load_active_strategy_id(uid)
    strategy_map = load_active_strategy_map(uid)
    effective_symbols = []
    for symbol in DEFAULT_15_SYMBOLS:
        strat_id = get_strategy_id_for_symbol(uid, symbol)
        strat = get_strategy_by_id(uid, strat_id) if strat_id else {}
        strat_name = strat.get("name", "Unknown")
        try:
            from core.marketdata_store import get_last_candle_ts_from_file  # type: ignore
            last_candle_ts = get_last_candle_ts_from_file(symbol, "m5")
            if last_candle_ts:
                from datetime import datetime, timezone
                now = datetime.now(timezone.utc)
                age_sec = (now - last_candle_ts).total_seconds()
                lag_sec = age_sec - 300
                is_weekend = now.weekday() >= 5
                is_crypto = symbol in ("BTCUSD", "ETHUSD")
                if lag_sec <= 90:
                    delay_reason = "OK"
                elif is_weekend and not is_crypto:
                    delay_reason = "MARKET_CLOSED"
                elif lag_sec <= 300:
                    delay_reason = "PROVIDER_LAG"
                else:
                    delay_reason = "ENGINE_BEHIND"
            else:
                last_candle_ts = None
                lag_sec = -1
                delay_reason = "NO_DATA"
        except Exception:
            last_candle_ts = None
            lag_sec = -1
            delay_reason = "ERROR"
        per_sym = scanner_status.get("perSymbol", {}).get(symbol, {})
        effective_symbols.append({
            "symbol": symbol,
            "strategyIdUsed": strat_id,
            "strategyNameUsed": strat_name,
            "lastCandleTs": last_candle_ts.isoformat() if last_candle_ts else None,
            "lagSec": round(lag_sec, 1),
            "delayReason": delay_reason,
            "lastScanTs": per_sym.get("lastScanTs"),
            "lastSetupFoundTs": per_sym.get("lastSetupFoundTs"),
            "setupsFound24h": per_sym.get("setupsFoundCount", 0),
        })
    return {
        "ok": True,
        "uid": uid,
        "engineRunning": scanner_status.get("running", False),
        "scanMode": scanner_status.get("scanMode", "TICK"),
        "lastCycleTs": scanner_status.get("lastCycleAt"),
        "lastOutcome": scanner_status.get("lastOutcome", {}),
        "effectiveSymbols": effective_symbols,
    }
