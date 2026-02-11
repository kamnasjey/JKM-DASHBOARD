import type { DriveStep } from "driver.js"

type Lang = "mn" | "en"

interface BilingualStep {
  element?: string
  titleMn: string
  titleEn: string
  descMn: string
  descEn: string
  side?: "top" | "bottom" | "left" | "right"
}

function toDriverSteps(steps: BilingualStep[], lang: Lang): DriveStep[] {
  return steps.map((s) => ({
    element: s.element,
    popover: {
      title: lang === "mn" ? s.titleMn : s.titleEn,
      description: lang === "mn" ? s.descMn : s.descEn,
      side: s.side || "bottom",
    },
  }))
}

const dashboardSteps: BilingualStep[] = [
  {
    element: "[data-tour='sidebar-nav']",
    titleMn: "Навигаци",
    titleEn: "Navigation",
    descMn: "Энд бүх хуудсуудруу шилжинэ: Dashboard, Стратеги, Симулятор, Профайл.",
    descEn: "Navigate to all pages: Dashboard, Strategies, Simulator, Profile.",
    side: "right",
  },
  {
    element: "[data-tour='status-cards']",
    titleMn: "Сканнерийн статус",
    titleEn: "Scanner Status",
    descMn: "Сканнер хэзээ ажилласан, хэдэн стратеги идэвхтэй, хэдэн дохио олдсоныг харуулна.",
    descEn: "Shows when scanner last ran, active strategies count, and signals found.",
  },
  {
    element: "[data-tour='strategies-panel']",
    titleMn: "Идэвхтэй стратегиуд",
    titleEn: "Active Strategies",
    descMn: "Таны идэвхжүүлсэн стратегиуд энд харагдана. Стратеги бүр detector-уудын хослол юм.",
    descEn: "Your enabled strategies appear here. Each strategy is a combination of detectors.",
  },
  {
    element: "[data-tour='signals-panel']",
    titleMn: "Дохионы түүх",
    titleEn: "Signal History",
    descMn: "Сканнер олсон бүх дохионууд энд гарна. Symbol, чиглэл, score, RR харагдана.",
    descEn: "All signals found by the scanner appear here with symbol, direction, score, and RR.",
  },
  {
    element: "[data-tour='guide-link']",
    titleMn: "Дэлгэрэнгүй заавар",
    titleEn: "Full Guide",
    descMn: "Бүх функцийн тайлбар, стратегийн заавар, FAQ энд байна.",
    descEn: "Find full feature explanations, strategy guides, and FAQ here.",
    side: "right",
  },
]

const strategiesSteps: BilingualStep[] = [
  {
    element: "[data-tour='strategy-list']",
    titleMn: "Стратегиуд",
    titleEn: "Strategies",
    descMn: "Таны бүх стратегиудын жагсаалт. Идэвхжүүлсэн стратеги дээр скан ажиллана.",
    descEn: "List of all your strategies. Scanner runs on enabled strategies.",
  },
  {
    element: "[data-tour='new-strategy']",
    titleMn: "Шинэ стратеги үүсгэх",
    titleEn: "Create Strategy",
    descMn: "Өөрийн detector хослол, timeframe, RR тохиргоотой шинэ стратеги үүсгэнэ.",
    descEn: "Create a new strategy with your own detector combination, timeframe, and RR settings.",
  },
  {
    element: "[data-tour='detector-select']",
    titleMn: "Detector-ууд",
    titleEn: "Detectors",
    descMn: "Gate = шүүлтүүр, Trigger = гол дохио, Confluence = баталгаажуулалт. 2+ гэр бүлээс тохирвол score нэмэгддэг.",
    descEn: "Gate = filter, Trigger = main signal, Confluence = confirmation. Score increases with 2+ family match.",
  },
  {
    element: "[data-tour='strategy-config']",
    titleMn: "Тохиргоо",
    titleEn: "Configuration",
    descMn: "Entry TF = entry хайх timeframe. Trend TF = чиглэл тогтоох timeframe (1-2 сонгоно).",
    descEn: "Entry TF = timeframe for entry signals. Trend TF = timeframes for direction (select 1-2).",
  },
]

const profileSteps: BilingualStep[] = [
  {
    element: "[data-tour='risk-settings']",
    titleMn: "Эрсдэлийн тохиргоо",
    titleEn: "Risk Settings",
    descMn: "min_rr = TP-ийн доод R:R. min_score = дохионы итгэлийн доод хязгаар. Хэт өндөр болговол дохио цөөрнө.",
    descEn: "min_rr = minimum TP ratio. min_score = minimum confidence threshold. Too high = fewer signals.",
  },
  {
    element: "[data-tour='telegram-section']",
    titleMn: "Telegram холболт",
    titleEn: "Telegram Connection",
    descMn: "'Telegram холбох' товч дарахад Telegram нээгдэж, Start дарахад автоматаар холбогдоно.",
    descEn: "Click 'Connect Telegram' to open Telegram, press Start to connect automatically.",
  },
  {
    element: "[data-tour='scan-toggle']",
    titleMn: "Скан идэвхжүүлэх",
    titleEn: "Enable Scanning",
    descMn: "Идэвхжүүлснээр 5 минут тутам 15 валют хосыг скан хийж, Telegram-аар дохио илгээнэ.",
    descEn: "When enabled, scans 15 currency pairs every 5 minutes and sends signals via Telegram.",
  },
]

export function getTourSteps(page: string, lang: Lang): DriveStep[] {
  switch (page) {
    case "dashboard":
      return toDriverSteps(dashboardSteps, lang)
    case "strategies":
      return toDriverSteps(strategiesSteps, lang)
    case "profile":
      return toDriverSteps(profileSteps, lang)
    default:
      return []
  }
}
