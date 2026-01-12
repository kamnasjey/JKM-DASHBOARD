export default function LandingPage() {
  const year = new Date().getFullYear()

  return (
    <main className="min-h-screen">
      <div className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center p-6 text-center">
        <div className="space-y-3">
          <h1 className="text-4xl font-bold tracking-tight">JKM Copilot</h1>
          <p className="text-lg text-muted-foreground">Coming Soon</p>
          <p className="text-sm text-muted-foreground">Бид удахгүй нээгдэнэ. Preview дээр тест хийгдэж байна.</p>
        </div>

        <footer className="mt-10 text-xs text-muted-foreground">© {year} JKM</footer>
      </div>
    </main>
  )
}
