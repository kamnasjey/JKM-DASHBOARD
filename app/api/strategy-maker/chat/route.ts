import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// All 20 detectors with detailed info for AI context
const DETECTORS_CONTEXT = `
# JKM Trading Bot - 20 Detectors

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

4. **pinbar** - Long wick rejection candle
   - Хамгийн classic reversal pattern
   - Key level дээр маш хүчтэй
   
5. **engulfing** - Candle that fully engulfs previous
   - Strong reversal signal
   - Works well at S/R levels
   
6. **sr_bounce** - Bounce from Support/Resistance
   - Тодорхойлсон S/R түвшингээс эргэлт
   - Лимит ордер арга барилд тохиромжтой
   
7. **sr_breakout** - Break through S/R level
   - Breakout traders-д зориулсан
   - Volume confirmation needed ideally
   
8. **compression_expansion** - Volatility squeeze breakout
   - Bollinger Bands narrowing → expansion
   - Good for breakout strategies
   
9. **momentum_continuation** - Impulse → Pullback → Break
   - Trend following арга барил
   - Pullback дээр entry
   
10. **mean_reversion_snapback** - Overextended price returning to mean
    - Counter-trend арга барил
    - Range market-д тохиромжтой

## CONFLUENCE (Баталгаа)
Заавал 1+ Confluence сонгосон байх ёстой.

11. **doji** - Indecision candle (open ≈ close)
    - Эргэлтийн дохио
    - Дангаар биш, бусадтай хамт хэрэглэх
    
12. **pinbar_at_level** - Pinbar at key level
    - Pinbar + S/R = stronger signal
    - High probability setup
    
13. **fibo_retracement** - Fibo 38.2%, 50%, 61.8% levels
    - Pullback entry zones
    - Trend following-д заавал хэрэгтэй
    
14. **fibo_extension** - Fibo 127.2%, 161.8% targets
    - Take profit levels
    - Swing trades-д тохиромжтой
    
15. **fibo_retrace_confluence** - Multiple Fibo levels overlap
    - Very strong zone
    - High probability reversal area
    
16. **structure_trend** - HH/HL or LH/LL structure
    - Trend confirmation
    - Trend following арга барилд заавал хэрэгтэй
    
17. **swing_failure** - Swing Failure Pattern (SFP)
    - Sweep high/low then reverse
    - Liquidity grab pattern
    
18. **range_box_edge** - Reaction at range boundary
    - Range trading арга барил
    - Buy low, sell high
    
19. **fakeout_trap** - False breakout trap
    - Breakout fails, reverses
    - Counter-trend setup
    
20. **sr_role_reversal** - Support becomes Resistance (vice versa)
    - Classic S/R principle
    - Strong confluence signal

# Strategy Presets

## Trend Following
- Gates: gate_regime, gate_volatility
- Triggers: momentum_continuation, sr_breakout
- Confluence: structure_trend, fibo_retracement, sr_role_reversal

## Mean Reversion / Range Trading
- Gates: gate_regime
- Triggers: mean_reversion_snapback, sr_bounce
- Confluence: range_box_edge, fakeout_trap, doji

## Scalping (Low timeframe)
- Gates: gate_regime, gate_volatility
- Triggers: pinbar, engulfing
- Confluence: pinbar_at_level, fibo_retracement

## Swing Trading (High timeframe)
- Gates: gate_regime, gate_volatility
- Triggers: sr_breakout, compression_expansion
- Confluence: structure_trend, fibo_extension, swing_failure

## Conservative (Low risk)
- Gates: gate_regime, gate_volatility, gate_drift_sentinel
- Triggers: sr_bounce, pinbar
- Confluence: pinbar_at_level, fibo_retrace_confluence, sr_role_reversal
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
