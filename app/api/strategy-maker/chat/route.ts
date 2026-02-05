import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";

function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY")
  }
  return new OpenAI({ apiKey })
}

// All 31 detectors with detailed info for AI context
const DETECTORS_CONTEXT = `
# JKM Trading Bot - 31 Detectors

## GATES (Шүүлт - Зах зээлийг шүүнэ) - 3 ширхэг
Заавал 1+ Gate сонгосон байх ёстой.

1. **gate_regime** (ЗААВАЛ) - Зах зээл Trend/Range/Chop горимд байгааг тодорхойлно
   - trending_up: ADX>25, HH/HL pattern
   - trending_down: ADX>25, LH/LL pattern
   - ranging: Price bouncing between S/R
   - volatile: High volatility, avoid trading

2. **gate_volatility** - ATR-based volatility filter
   - High vol: Good for breakouts
   - Low vol: Good for reversals
   - Adjusts position sizing

3. **gate_drift_sentinel** - Performance monitoring
   - Tracks detector hit rate
   - Alerts when system underperforming
   - Auto-pauses poor detectors

## TRIGGERS (Entry сигнал) - 15 ширхэг
Заавал 1+ Trigger сонгосон байх ёстой.

### SMC/ICT Triggers (Smart Money Concepts)
4. **bos** - Break of Structure
   - Trend continuation signal
   - Шинэ HH/LL үүссэнийг илрүүлнэ
   - Trending market-д хамгийн сайн ажиллана

5. **fvg** - Fair Value Gap (Imbalance zone)
   - Институционал ордер хийсэн бүс
   - Gap fill хүлээн entry хийнэ
   - High probability retracement zone

6. **ob** - Order Block
   - Институционал demand/supply zone
   - Last bullish/bearish candle before big move
   - Entry on retest of OB

7. **choch** - Change of Character
   - Trend reversal сигнал
   - Structure break in opposite direction
   - Early reversal entry

8. **eq_break** - Equal High/Low Break
   - Liquidity sweep + breakout
   - Double top/bottom break
   - Strong trend continuation

9. **sweep** - Liquidity Sweep
   - Stop hunt + reversal
   - Highs/lows sweep then reverse
   - Smart money accumulation/distribution

10. **imbalance** - Price Imbalance
    - FVG-тай төстэй
    - Aggressive move leaving gaps
    - Retracement zone

11. **sfp** - Swing Failure Pattern
    - Failed breakout = reversal
    - Higher high/lower low fail
    - Strong reversal signal

### Classic Triggers
12. **break_retest** - Break → Retest → Continue
    - Түвшин эвдээд буцаад retest хийж баталгаажуулна
    - Trend following entry-д түгээмэл

13. **sr_bounce** - Bounce from Support/Resistance
    - S/R түвшингээс эргэлт
    - Лимит ордер арга барилд тохиромжтой

14. **sr_break_close** - Clean close through S/R level
    - Breakout traders-д зориулсан
    - Close confirmation ашиглана

15. **compression_expansion** - Volatility squeeze breakout
    - Bollinger Bands narrowing → expansion
    - Good for breakout strategies

16. **momentum_continuation** - Impulse → Pullback → Break
    - Trend following арга барил
    - Pullback дээр entry

17. **mean_reversion_snapback** - Overextended price returning to mean
    - Counter-trend арга барил
    - Range market-д тохиромжтой

18. **triangle_breakout_close** - Triangle breakout close
    - Triangle-ийн хязгаарыг close-оор эвдсэнийг шалгана

## CONFLUENCE (Баталгаа) - 13 ширхэг
Confluence нэмж болно (optional but recommended).

19. **doji** - Indecision candle (open ≈ close)
    - Эргэлтийн дохио
    - Дангаар биш, бусадтай хамт хэрэглэх

20. **pinbar_at_level** - Pinbar at key level
    - Pinbar + S/R = stronger signal
    - High probability setup

21. **engulf_at_level** - Engulfing at key level
    - Key level дээр гарсан engulfing
    - Reversal confirmation-д тохиромжтой

22. **fibo_retrace_confluence** - Fibo retrace confluence zone
    - Олон retrace түвшнээс хамгийн ойрыг сонгож баталгаажуулна
    - Pullback/reversal setup-д хүчтэй zone

23. **fibo_extension** - Fibo extension targets
    - Take profit levels
    - Swing trades-д тохиромжтой

24. **fakeout_trap** - False breakout trap
    - Breakout fails, reverses
    - Counter-trend setup

25. **sr_role_reversal** - Support becomes Resistance (vice versa)
    - Classic S/R principle
    - Strong confluence signal

26. **rectangle_range_edge** - Reaction at rectangle/range boundary
    - Range trading fade setups
    - Buy low, sell high

27. **price_momentum_weakening** - Momentum weakening
    - Trend ядарч байгааг илтгэнэ
    - Reversal / pullback timing-д тусална

28. **trend_fibo** - Trend + fib retracement confluence
    - Trend + fib zone таарах үед signal quality өснө

29. **double_top_bottom** - Double top / bottom
    - Classic reversal pattern

30. **head_shoulders** - Head & Shoulders
    - Classic reversal pattern

31. **flag_pennant** - Flag / pennant
    - Continuation pattern

# Strategy Presets

## SMC/ICT (Smart Money Concepts)
- Gates: gate_regime
- Triggers: bos, fvg, ob, choch, sweep
- Confluence: fibo_retrace_confluence, sr_role_reversal
- Trending market дээр сайн ажиллана

## SMC Reversal
- Gates: gate_regime, gate_volatility
- Triggers: choch, sweep, sfp
- Confluence: engulf_at_level, pinbar_at_level
- Trend эргэлт барихад зориулсан

## Trend Following
- Gates: gate_regime, gate_volatility
- Triggers: bos, momentum_continuation, break_retest
- Confluence: trend_fibo, fibo_retrace_confluence, sr_role_reversal

## Mean Reversion / Range Trading
- Gates: gate_regime
- Triggers: mean_reversion_snapback, sr_bounce
- Confluence: rectangle_range_edge, fakeout_trap, doji

## Scalping (Low timeframe)
- Gates: gate_regime, gate_volatility
- Triggers: fvg, bos, sr_break_close
- Confluence: pinbar_at_level, engulf_at_level

## Swing Trading (High timeframe)
- Gates: gate_regime, gate_volatility
- Triggers: ob, choch, triangle_breakout_close
- Confluence: fibo_extension, flag_pennant, double_top_bottom

## Conservative (Low risk)
- Gates: gate_regime, gate_volatility, gate_drift_sentinel
- Triggers: sr_bounce, break_retest
- Confluence: fibo_retrace_confluence, sr_role_reversal, price_momentum_weakening
`;

const SYSTEM_PROMPT = `Та JKM Trading Bot-ийн Strategy Maker AI байна. Таны үүрэг бол хэрэглэгчийн trading арга барилыг ойлгоод тэдэнд зориулсан STRATEGY бүтээж, техникийн талаас тайлбарлах.

${DETECTORS_CONTEXT}

# ЧУХАЛ ДҮРЭМ - ХОРИОТОЙ ЗҮЙЛС:
- ХЭЗЭЭ Ч win rate, profit, ашиг, орлого гэж БИЧЭХГҮЙ
- ХЭЗЭЭ Ч амлалт өгөхгүй
- ХЭЗЭЭ Ч "өндөр win rate", "сайн ашиг", "их орлого" гэж бичэхгүй
- Зөвхөн ТЕХНИКИЙН тайлбар өгнө

# Таны үүрэг:
1. Хэрэглэгчийн арга барилыг ойлгох
2. Тэдний арга барилд тохирсон detector combination сонгох
3. Strategy-г ТЕХНИКИЙН талаас тайлбарлах:
   - Детектор бүрийн үүрэг
   - Хэзээ, яаж сигнал өгөх
   - Ямар зах зээлийн нөхцөлд ажиллах
4. Min Score санал болгох (0.5 - 3.0)

# Дүрэм:
- Заавал 1+ Context/Gate сонгох
- Заавал 1+ Trigger сонгох
- Confluence нэмж болно
- 3-5 детектор хамгийн оновчтой

# Хариу өгөх формат:
Монгол хэлээр, бүтэцтэй:

**📊 Таны Strategy:**
[Нэр]

**🎯 Детекторууд:**
- [detector_name] - [техникийн тайлбар]

**💡 Ажиллах зарчим:**
[Сигнал яаж үүсэх талаар техникийн тайлбар]

**📋 Онцлог:**
- [Техникийн онцлог 1]
- [Техникийн онцлог 2]

**⚠️ Анхаарах:**
- [Ямар нөхцөлд сигнал гарахгүй]
- [Хязгаарлалт]

**⚙️ Тохиргоо:**
- Min Score: [утга]

<DETECTORS>["detector1", "detector2", ...]</DETECTORS>
<MIN_SCORE>1.0</MIN_SCORE>`;

export async function POST(request: NextRequest) {
  try {
    const { messages, current_detectors } = await request.json();

    const openai = getOpenAIClient()

    // Build conversation history
    const conversationHistory = messages.map((msg: { role: string; content: string }) => ({
      role: msg.role,
      content: msg.content,
    }));

    // Add context about current selection
    const lastUserMessage = conversationHistory[conversationHistory.length - 1];
    if (current_detectors?.length > 0) {
      lastUserMessage.content += `\n\n[Одоо сонгосон детекторууд: ${current_detectors.join(", ")}]`;
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...conversationHistory,
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });

    const responseContent = completion.choices[0]?.message?.content || "";

    // Extract recommended detectors from response
    let recommended_detectors: string[] = [];
    const detectorsMatch = responseContent.match(/<DETECTORS>\[(.*?)\]<\/DETECTORS>/s);
    if (detectorsMatch) {
      try {
        recommended_detectors = JSON.parse(`[${detectorsMatch[1]}]`);
      } catch (e) {
        // Try alternative parsing
        recommended_detectors = detectorsMatch[1]
          .split(",")
          .map((s) => s.trim().replace(/['"]/g, ""))
          .filter(Boolean);
      }
    }

    // Extract recommended min_score
    let recommended_min_score = 1.0;
    const minScoreMatch = responseContent.match(/<MIN_SCORE>([\d.]+)<\/MIN_SCORE>/);
    if (minScoreMatch) {
      const parsed = parseFloat(minScoreMatch[1]);
      if (!isNaN(parsed) && parsed >= 0.5 && parsed <= 3.0) {
        recommended_min_score = parsed;
      }
    }

    // Clean the message (remove tags)
    const cleanMessage = responseContent
      .replace(/<DETECTORS>.*?<\/DETECTORS>/s, "")
      .replace(/<MIN_SCORE>.*?<\/MIN_SCORE>/s, "")
      .trim();

    return NextResponse.json({
      message: cleanMessage,
      recommended_detectors,
      recommended_min_score,
    });
  } catch (error: unknown) {
    console.error("Strategy Maker Chat Error:", error);
    
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    return NextResponse.json(
      {
        message: "Уучлаарай, алдаа гарлаа. Түр хүлээгээд дахин оролдоно уу.",
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}
