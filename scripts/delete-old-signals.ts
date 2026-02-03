import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import path from "path";

const serviceAccount = require(path.join(__dirname, "..", "firebase-service-account.json"));

if (!getApps().length) {
  initializeApp({ credential: cert(serviceAccount) });
}

const db = getFirestore();

async function deleteOldSignals() {
  const userId = "cmkaspmrp0000klwig8orkd7l";
  const signalsRef = db.collection("users").doc(userId).collection("signals");
  const snapshot = await signalsRef.get();
  
  console.log("Total signals:", snapshot.size);
  
  const validPrefixes = [
    "EURUSD_", "USDJPY_", "GBPUSD_", "AUDUSD_", "USDCAD_", 
    "USDCHF_", "NZDUSD_", "EURJPY_", "GBPJPY_", "EURGBP_", 
    "AUDJPY_", "EURAUD_", "EURCHF_", "XAUUSD_", "BTCUSD_"
  ];
  
  let deleted = 0;
  for (const doc of snapshot.docs) {
    const data = doc.data();
    const strategyId = String(data.strategy_id || "");
    const isValid = validPrefixes.some(p => strategyId.startsWith(p));
    
    if (!isValid) {
      await doc.ref.delete();
      deleted++;
      console.log("Deleted:", doc.id.slice(0,12), "strategy:", strategyId.slice(0, 20) || "none");
    }
  }
  console.log("\nTotal deleted:", deleted);
}

deleteOldSignals().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
