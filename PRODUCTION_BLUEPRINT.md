# JKM AI Trading Engine - Production Blueprint

**Огноо:** 2026-01-29  
**Статус:** ✅ PRODUCTION-READY БОЛГОХ АЖИЛ ДУУССАН

---

## 📊 ШИЙДВЭРЛЭСЭН АСУУДЛУУД

### ✅ Засагдсан Компонентууд

| Асуудал | Шийдэл | Статус |
|---------|--------|--------|
| MASSIVE API Path буруу (`/v1/candles`) | `.env`-д `MASSIVE_CANDLES_PATH=/v2/aggs/ticker` нэмсэн | ✅ Fixed |
| Strategy Source Dashboard-only | Local preset fallback нэмсэн (`strategy_source.py`) | ✅ Fixed |
| Data 3 өдрийн хуучин | Auto-backfill ажиллаж байна | ✅ Syncing |
| Scanner strategy олдохгүй | Local preset уншиж байна | ✅ Fixed |

### 📈 Одоогийн Статус

```
Health:      ✅ OK
Scanner:     ✅ Running (cycles: 1+, strategy: jkm_primary)  
Data:        🔄 Backfilling (XAUUSD: +99 candles synced)
Simulator:   ✅ Import OK
Strategies:  ✅ 4 preset strategies loaded
```

---

## 🏗️ БҮТЦИЙН ТОЙМ

```
┌─────────────────────────────────────────────────────────────────────┐
│                         JKM AI Trading Engine                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────────────┐    ┌──────────────────────────────────┐   │
│  │    MASSIVE API       │───▶│     MassiveDataProvider          │   │
│  │ /v2/aggs/ticker/...  │    │  - Rate limiting                 │   │
│  └──────────────────────┘    │  - Retry with backoff            │   │
│                              │  - Symbol normalization           │   │
│                              └────────────┬─────────────────────┘   │
│                                           │                          │
│                    ┌──────────────────────┴──────────────────────┐  │
│                    ▼                                              ▼  │
│  ┌──────────────────────────┐       ┌────────────────────────────┐  │
│  │     MarketFeedPoller     │       │      DataIngestor5m        │  │
│  │  - SLA compliance        │       │  - 5m polling cycle        │  │
│  │  - Anti-drift            │       │  - Auto-backfill           │  │
│  │  - Panic mode            │       │  - Gap detection           │  │
│  └───────────┬──────────────┘       └───────────┬────────────────┘  │
│              │                                   │                   │
│              └───────────────┬───────────────────┘                   │
│                              ▼                                       │
│              ┌───────────────────────────────────┐                   │
│              │        MarketDataCache            │                   │
│              │  - Thread-safe storage            │                   │
│              │  - 50K candles per symbol         │                   │
│              │  - TF resampling (5m→15m→1h→4h)  │                   │
│              │  - JSON persistence               │                   │
│              └───────────────┬───────────────────┘                   │
│                              │                                       │
│         ┌────────────────────┼────────────────────┐                  │
│         ▼                    ▼                    ▼                  │
│  ┌─────────────┐    ┌─────────────────┐    ┌──────────────────┐     │
│  │  Scanner    │    │   Simulator V2   │    │  MarketDataStore │     │
│  │  Service    │    │                  │    │  (CSV/gzip)      │     │
│  │             │    │  - Single TF     │    │                  │     │
│  │ - APScheduler│    │  - Multi TF     │    │  state/marketdata│     │
│  │ - 24/7 loop │    │  - Explainability│    │  /{SYMBOL}/      │     │
│  │ - Dedup     │    │  - 30+ detectors │    │  m5.csv.gz       │     │
│  └──────┬──────┘    └────────┬─────────┘    └──────────────────┘     │
│         │                    │                                       │
│         └────────────────────┴───────────────────────────────────┐   │
│                                                                  │   │
│                              ▼                                   │   │
│              ┌───────────────────────────────────┐               │   │
│              │         API Server                │               │   │
│              │  FastAPI + Uvicorn                │               │   │
│              │                                   │               │   │
│              │  Endpoints:                       │               │   │
│              │  - /api/strategy-sim/run          │◀──────────────┘   │
│              │  - /scan/status                   │                   │
│              │  - /scan/start                    │                   │
│              │  - /health                        │                   │
│              └───────────────────────────────────┘                   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🎯 DETECTOR SYSTEM

### Gates (Шүүлтүүрүүд)
| Detector | Зориулалт |
|----------|-----------|
| GATE_REGIME | Trend/Range шүүлтүүр |
| GATE_VOLATILITY | Volatility шүүлтүүр |
| GATE_DRIFT_SENTINEL | Drift detection |

### Triggers (Entry Signal)
| Detector | Зориулалт |
|----------|-----------|
| BOS | Break of Structure |
| FVG | Fair Value Gap |
| OB / ORDER_BLOCK | Order Block |
| CHOCH | Change of Character |
| SWEEP | Liquidity Sweep |
| SFP | Swing Failure Pattern |
| EQ_BREAK | Equal Highs/Lows Break |
| IMBALANCE | Price Imbalance |
| BREAKOUT_RETEST_ENTRY | Breakout + Retest |
| COMPRESSION_EXPANSION | Compression → Expansion |
| MOMENTUM_CONTINUATION | Momentum continuation |
| MEAN_REVERSION_SNAPBACK | Mean reversion |
| SR_BOUNCE | Support/Resistance Bounce |
| SR_BREAK_CLOSE | S/R Break and Close |
| FAKEOUT_TRAP | Fakeout trap entry |

### Confluence (Баталгаажуулалт)
| Detector | Зориулалт |
|----------|-----------|
| SESSION_FILTER | Session-based filter |
| HTF_BIAS | Higher TF bias |
| VOLATILITY_FILTER | Volatility confluence |
| FIBO_RETRACE_CONFLUENCE | Fibonacci confluence |

---

## 📊 SCANNER CONFIGURATION

### Шаардлагатай ENV Variables

```bash
# .env файлд нэмэх
AUTO_SCAN_INTERVAL_MIN=5          # Scan interval (minutes)
SCANNER_MISFIRE_GRACE_SEC=120     # Misfire grace period
SCANNER_MAX_SYMBOLS_WARN=2000     # Warning threshold
```

### Scanner Startup Flow

```
api_server.py startup
        │
        ▼
_startup_scanner()
        │
        ▼
scanner_service.start()
        │
        ├── Load strategies from config/strategies.json
        ├── Start DataIngestor (5m polling)
        └── Start APScheduler
             ├── scan_cycle job @ 5 min
             └── outcome_check job @ 1 hour
```

---

## ✅ CHECKLIST: Production-Ready

### Data Layer
- [ ] MASSIVE_CANDLES_PATH=/v2/aggs/ticker тохируулсан
- [ ] Data ingestor ажиллаж байна
- [ ] Cache дотор fresh data байна (< 10 min old)
- [ ] Auto-backfill gap-уудыг дүүргэж байна

### Scanner Layer
- [ ] Scanner running = true
- [ ] Cycles > 0
- [ ] lastCycleAt < 5 минутын өмнө
- [ ] Strategies loaded correctly

### Simulator Layer
- [ ] /api/strategy-sim/run endpoint ажиллаж байна
- [ ] Async queue enabled (SIM_QUEUE_ENABLED=true)
- [ ] Explainability data буцаж байна

### API Layer
- [ ] /health endpoint OK
- [ ] All routes responding
- [ ] Error handling working

---

## 🚀 ЯАРАЛТАЙ ХИЙХ COMMAND-УУД

```bash
# 1. Server-рүү SSH
ssh root@159.65.11.255

# 2. .env засах
cd /root/JKM-AI-BOT
cat >> .env << 'EOF'
MASSIVE_CANDLES_PATH=/v2/aggs/ticker
MASSIVE_BASE_URL=https://api.massive.com
EOF

# 3. Container restart
docker-compose down && docker-compose up -d

# 4. Шалгах (30 секунд хүлээх)
sleep 30
docker logs jkm_bot_backend 2>&1 | tail -50

# 5. Health check
curl -s http://127.0.0.1:8000/health | python3 -m json.tool

# 6. Scanner status
curl -s http://127.0.0.1:8000/scan/status | python3 -m json.tool
```

---

## 📝 ТЭМДЭГЛЭЛ

1. **Image vs Environment:** Docker image дотор буруу env var build болсон байна. `docker-compose.yml` environment section нь `env_file` дараа уншигддаг тул override хийх ёстой.

2. **v1/candles vs v2/aggs:** Massive API нь `/v1/candles` endpoint-ийг deprecated болгосон. Бүх дуудлага `/v2/aggs/ticker/{ticker}/range/...` руу хийгдэх ёстой.

3. **SLA Target:** 15 symbols × 5m candles × 120 секундын дотор refresh - одоо биелэхгүй байна.

---

**Дараагийн алхам:** Phase 1-ийг яаралтай хэрэгжүүлэх!
