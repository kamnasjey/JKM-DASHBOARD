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

// 24 detectors with detailed info for AI context
const DETECTORS_CONTEXT = `
# JKM Trading Bot - 24 Detectors

## GATES (Шүүлт - Зах зээлийг шүүнэ)
Заавал 1+ Gate сонгосон байх ёстой.

1. **gate_regime** (ЗААВАЛ) - Зах зээл Trend/Range/Chop горимд байгааг тодорхойлно
   - Trend: ADX>25, clear HH/HL or LH/LL
   - Range: Price bouncing between S/R
   - Chop: No clear direction, avoid trading
   
2. **gate_volatility** - ATR-based volatility filter
   - High vol: Good for breakouts
   - Low vol: Good for reversals
   - Adjusts position sizing
   
3. **gate_drift_sentinel** - Performance monitoring
   - Tracks detector hit rate
   - Alerts when system underperforming
   - Auto-pauses poor detectors

## TRIGGERS (Entry сигнал)
Заавал 1+ Trigger сонгосон байх ёстой.

4. **sr_bounce** - Bounce from Support/Resistance
   - Тодорхойлсон S/R түвшингээс эргэлт
   - Лимит ордер арга барилд тохиромжтой
   
5. **sr_break_close** - Clean close through S/R level
   - Breakout traders-д зориулсан
   - Close confirmation ашиглана (false break багасгана)
   
6. **break_retest** - Break → Retest → Continue
   - Түвшин эвдээд буцаад retest хийж баталгаажуулна
   - Trend following entry-д түгээмэл

7. **breakout_retest_entry** - Breakout → Retest → Confirmation (strict)
   - Breakout entry-г илүү шалгууртай болгоно
   - Signal quality өснө, signal count багасна

8. **compression_expansion** - Volatility squeeze breakout
   - Bollinger Bands narrowing → expansion
   - Good for breakout strategies
   
9. **momentum_continuation** - Impulse → Pullback → Break
   - Trend following арга барил
   - Pullback дээр entry
   
10. **mean_reversion_snapback** - Overextended price returning to mean
    - Counter-trend арга барил
    - Range market-д тохиромжтой

11. **triangle_breakout_close** - Triangle breakout close
  - Triangle-ийн хязгаарыг close-оор эвдсэнийг шалгана

## CONFLUENCE (Баталгаа)
Заавал 1+ Confluence сонгосон байх ёстой.

12. **doji** - Indecision candle (open ≈ close)
    - Эргэлтийн дохио
    - Дангаар биш, бусадтай хамт хэрэглэх
    
13. **pinbar_at_level** - Pinbar at key level
    - Pinbar + S/R = stronger signal
    - High probability setup
    
14. **engulf_at_level** - Engulfing at key level
  - Key level дээр гарсан engulfing
  - Reversal confirmation-д тохиромжтой

15. **fibo_extension** - Fibo extension targets
    - Take profit levels
    - Swing trades-д тохиромжтой
    
16. **fibo_retrace_confluence** - Fibo retrace confluence zone
  - Олон retrace түвшнээс хамгийн ойрыг сонгож баталгаажуулна
  - Pullback/reversal setup-д хүчтэй zone
    
17. **fakeout_trap** - False breakout trap
    - Breakout fails, reverses
    - Counter-trend setup
    
18. **sr_role_reversal** - Support becomes Resistance (vice versa)
    - Classic S/R principle
    - Strong confluence signal

19. **rectangle_range_edge** - Reaction at rectangle/range boundary
  - Range trading fade setups
  - Buy low, sell high

20. **price_momentum_weakening** - Momentum weakening
  - Trend ядарч байгааг илтгэнэ
  - Reversal / pullback timing-д тусална

21. **trend_fibo** - Trend + fib retracement confluence
  - Trend + fib zone таарах үед signal quality өснө

22. **double_top_bottom** - Double top / bottom
  - Classic reversal pattern

23. **head_shoulders** - Head & Shoulders
  - Classic reversal pattern

24. **flag_pennant** - Flag / pennant
  - Continuation pattern

# Strategy Presets

## Trend Following
- Gates: gate_regime, gate_volatility
- Triggers: momentum_continuation, break_retest, sr_break_close
- Confluence: trend_fibo, fibo_retrace_confluence, sr_role_reversal

## Mean Reversion / Range Trading
- Gates: gate_regime
- Triggers: mean_reversion_snapback, sr_bounce
- Confluence: rectangle_range_edge, fakeout_trap, doji

## Scalping (Low timeframe)
- Gates: gate_regime, gate_volatility
- Triggers: breakout_retest_entry, sr_break_close
- Confluence: pinbar_at_level, engulf_at_level, fibo_retrace_confluence

## Swing Trading (High timeframe)
- Gates: gate_regime, gate_volatility
- Triggers: triangle_breakout_close, compression_expansion
- Confluence: fibo_extension, flag_pennant, double_top_bottom

## Conservative (Low risk)
- Gates: gate_regime, gate_volatility, gate_drift_sentinel
- Triggers: sr_bounce, break_retest
- Confluence: fibo_retrace_confluence, sr_role_reversal, price_momentum_weakening
`;

const SYSTEM_PROMPT = `Та JKM Trading Bot-ийн Strategy Maker AI туслах юм. Таны зорилго нь хэрэглэгчийн trading арга барилыг ойлгоод хамгийн тохиромжтой detector combination сонгоход нь тусалах.

${DETECTORS_CONTEXT}

# Таны үүрэг:
1. Хэрэглэгчийн арга барилыг асуулт асуух замаар ойлгох
2. Тохирох detector-уудыг санал болгох
3. Яагаад эдгээр детектор тохирохыг тайлбарлах
4. Strategy-ийн давуу болон сул талыг тайлбарлах

# Дүрэм:
- Заавал 1+ Gate сонгосон байх ёстой (gate_regime заавал орох)
- Заавал 1+ Trigger сонгосон байх ёстой
- Заавал 1+ Confluence сонгосон байх ёстой
- Хэт олон детектор (7+) сонгохгүй байх - сигнал цөөрнө
- Хэт цөөн детектор (3 доош) сонгохгүй байх - эрсдэл өснө

# Хариу өгөх формат:
- Монгол хэлээр хариу өгөх
- Товч, ойлгомжтой байх
- Эцэстээ recommended_detectors-д санал болгож буй детекторуудын нэрийг JSON array-аар өгөх

JSON хариу формат (заавал):
Хариултын эцэст дараах формат ашиглана:
<DETECTORS>["detector1", "detector2", ...]</DETECTORS>`;

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

    // Clean the message (remove the DETECTORS tag)
    const cleanMessage = responseContent.replace(/<DETECTORS>.*?<\/DETECTORS>/s, "").trim();

    return NextResponse.json({
      message: cleanMessage,
      recommended_detectors,
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
