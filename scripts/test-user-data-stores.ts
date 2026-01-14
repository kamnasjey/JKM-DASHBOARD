/**
 * Test file for user-data stores
 * 
 * Run with: npx tsx scripts/test-user-data-stores.ts
 * 
 * Prerequisites:
 * - Firebase Admin credentials configured
 * - .env.local with FIREBASE_ADMIN_* set
 */

import { config } from "dotenv"
config({ path: ".env.local" })

// Test utilities
function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`)
  }
}

async function runTests() {
  console.log("=== User Data Stores Test Suite ===\n")
  
  const testUserId = `test-user-${Date.now()}`
  let passedTests = 0
  let failedTests = 0
  
  // Import stores
  const { 
    getUserDoc, 
    upsertUserIdentity, 
    updateUserPrefs, 
    deleteUserFromFirestore 
  } = await import("../lib/user-data/user-store")
  
  const { 
    getUserStrategiesFromFirestore, 
    setUserStrategiesInFirestore,
    MAX_STRATEGIES_PER_USER
  } = await import("../lib/user-data/strategies-store")
  
  const { 
    upsertUserSignal, 
    listUserSignals, 
    getUserSignal,
    deleteUserSignal 
  } = await import("../lib/user-data/signals-store")
  
  // ===== USER STORE TESTS =====
  console.log("--- User Store Tests ---")
  
  // Test 1: Create user identity
  try {
    console.log("Test 1: upsertUserIdentity creates new user...")
    await upsertUserIdentity(testUserId, {
      email: "test@example.com",
      name: "Test User",
      has_paid_access: true,
      plan: "pro",
    })
    
    const doc = await getUserDoc(testUserId)
    assert(doc !== null, "User doc should exist")
    assert(doc!.user_id === testUserId, "user_id should match")
    assert(doc!.email === "test@example.com", "email should match")
    assert(doc!.has_paid_access === true, "has_paid_access should be true")
    
    console.log("  ✓ PASSED\n")
    passedTests++
  } catch (err) {
    console.error("  ✗ FAILED:", err)
    failedTests++
  }
  
  // Test 2: Update user prefs
  try {
    console.log("Test 2: updateUserPrefs updates telegram settings...")
    await updateUserPrefs(testUserId, {
      telegram_chat_id: "123456789",
      telegram_enabled: true,
      scan_enabled: true,
    })
    
    const doc = await getUserDoc(testUserId)
    assert(doc !== null, "User doc should exist")
    assert(doc!.telegram_chat_id === "123456789", "telegram_chat_id should match")
    assert(doc!.telegram_enabled === true, "telegram_enabled should be true")
    assert(doc!.scan_enabled === true, "scan_enabled should be true")
    // Original identity should be preserved
    assert(doc!.email === "test@example.com", "email should still be preserved")
    
    console.log("  ✓ PASSED\n")
    passedTests++
  } catch (err) {
    console.error("  ✗ FAILED:", err)
    failedTests++
  }
  
  // ===== STRATEGIES STORE TESTS =====
  console.log("--- Strategies Store Tests ---")
  
  // Test 3: Set and get strategies
  try {
    console.log("Test 3: setUserStrategiesInFirestore and getUserStrategiesFromFirestore...")
    const testStrategies = [
      {
        strategy_id: "strat-1",
        name: "Test Strategy 1",
        enabled: true,
        detectors: ["swing_low", "double_bottom"],
        min_score: 5,
        min_rr: 2.0,
      },
      {
        strategy_id: "strat-2",
        name: "Test Strategy 2",
        enabled: false,
        detectors: ["breakout"],
      },
    ]
    
    await setUserStrategiesInFirestore(testUserId, testStrategies)
    const strategies = await getUserStrategiesFromFirestore(testUserId)
    
    assert(strategies.length === 2, "Should have 2 strategies")
    assert(strategies[0].strategy_id === "strat-1", "First strategy ID should match")
    assert(strategies[0].enabled === true, "First strategy should be enabled")
    assert(strategies[1].strategy_id === "strat-2", "Second strategy ID should match")
    
    console.log("  ✓ PASSED\n")
    passedTests++
  } catch (err) {
    console.error("  ✗ FAILED:", err)
    failedTests++
  }
  
  // Test 4: Max strategies limit
  try {
    console.log(`Test 4: MAX_STRATEGIES_PER_USER (${MAX_STRATEGIES_PER_USER}) enforcement...`)
    const tooManyStrategies = Array.from({ length: MAX_STRATEGIES_PER_USER + 1 }, (_, i) => ({
      strategy_id: `strat-${i}`,
      name: `Strategy ${i}`,
      enabled: true,
      detectors: ["test"],
    }))
    
    let threw = false
    try {
      await setUserStrategiesInFirestore(testUserId, tooManyStrategies)
    } catch (err) {
      threw = true
      assert(
        String(err).includes("Maximum"),
        "Error should mention maximum limit"
      )
    }
    
    assert(threw, "Should throw error for too many strategies")
    
    console.log("  ✓ PASSED\n")
    passedTests++
  } catch (err) {
    console.error("  ✗ FAILED:", err)
    failedTests++
  }
  
  // ===== SIGNALS STORE TESTS =====
  console.log("--- Signals Store Tests ---")
  
  // Test 5: Upsert and get signal
  try {
    console.log("Test 5: upsertUserSignal and getUserSignal...")
    const testSignalKey = `signal-${Date.now()}`
    const testSignal = {
      signal_key: testSignalKey,
      user_id: testUserId,
      symbol: "BTCUSDT",
      direction: "long",
      timeframe: "1h",
      entry: 50000,
      sl: 48000,
      tp: 55000,
      rr: 2.5,
      strategy_name: "Test Strategy",
      generated_at: new Date().toISOString(),
      status: "pending",
    }
    
    await upsertUserSignal(testUserId, testSignalKey, testSignal)
    const signal = await getUserSignal(testUserId, testSignalKey)
    
    assert(signal !== null, "Signal should exist")
    assert(signal!.symbol === "BTCUSDT", "Symbol should match")
    assert(signal!.direction === "long", "Direction should match")
    assert(signal!.rr === 2.5, "RR should match")
    
    console.log("  ✓ PASSED\n")
    passedTests++
  } catch (err) {
    console.error("  ✗ FAILED:", err)
    failedTests++
  }
  
  // Test 6: List signals
  try {
    console.log("Test 6: listUserSignals with filters...")
    
    // Add a few more signals
    for (let i = 0; i < 3; i++) {
      await upsertUserSignal(testUserId, `signal-list-${i}`, {
        signal_key: `signal-list-${i}`,
        user_id: testUserId,
        symbol: i === 0 ? "ETHUSDT" : "BTCUSDT",
        direction: "long",
        timeframe: "4h",
        entry: 3000 + i * 100,
        sl: 2900,
        tp: 3200,
        rr: 2.0,
        generated_at: new Date(Date.now() - i * 1000).toISOString(),
        status: "pending",
      })
    }
    
    const allSignals = await listUserSignals(testUserId, { limit: 10 })
    assert(allSignals.length >= 3, "Should have at least 3 signals")
    
    const ethSignals = await listUserSignals(testUserId, { limit: 10, symbol: "ETHUSDT" })
    assert(ethSignals.length >= 1, "Should have at least 1 ETH signal")
    assert(ethSignals.every(s => s.symbol === "ETHUSDT"), "All should be ETHUSDT")
    
    console.log("  ✓ PASSED\n")
    passedTests++
  } catch (err) {
    console.error("  ✗ FAILED:", err)
    failedTests++
  }
  
  // ===== CLEANUP =====
  console.log("--- Cleanup ---")
  try {
    console.log(`Deleting test user ${testUserId}...`)
    await deleteUserFromFirestore(testUserId)
    
    const doc = await getUserDoc(testUserId)
    assert(doc === null, "User should be deleted")
    
    console.log("  ✓ Cleanup complete\n")
  } catch (err) {
    console.error("  ✗ Cleanup failed:", err)
  }
  
  // ===== SUMMARY =====
  console.log("=== Test Summary ===")
  console.log(`Passed: ${passedTests}`)
  console.log(`Failed: ${failedTests}`)
  console.log(`Total: ${passedTests + failedTests}`)
  
  if (failedTests > 0) {
    process.exit(1)
  }
}

runTests().catch((err) => {
  console.error("Test suite crashed:", err)
  process.exit(1)
})
