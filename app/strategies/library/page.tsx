"use client"

import { useState, useEffect } from "react"
import { Share2, Download, Search, Users, Clock, Star, X } from "lucide-react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { api } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { useAuthGuard } from "@/lib/auth-guard"

interface SharedStrategy {
  share_id: string
  strategy_id: string
  author_id: string
  detectors: string[]
  min_score: number
  min_rr: number
  allowed_regimes: string[]
  description?: string
  shared_at: string
  copies: number
  rating: number
}

interface UserStrategy {
  strategy_id: string
  enabled: boolean
  detectors: string[]
  min_score?: number
  min_rr?: number
  allowed_regimes?: string[]
}

export default function StrategySharingPage() {
  useAuthGuard(true)

  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [sharedStrategies, setSharedStrategies] = useState<SharedStrategy[]>([])
  const [myStrategies, setMyStrategies] = useState<UserStrategy[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [importing, setImporting] = useState<string | null>(null)
  
  // Share dialog state
  const [shareDialogOpen, setShareDialogOpen] = useState(false)
  const [selectedStrategy, setSelectedStrategy] = useState<UserStrategy | null>(null)
  const [shareDescription, setShareDescription] = useState("")
  const [sharing, setSharing] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [shared, myStrats] = await Promise.all([
        api.sharedStrategies().catch(() => ({ strategies: [] })),
        api.strategies().catch(() => ({ strategies: [] })),
      ])
      setSharedStrategies(shared?.strategies || [])
      setMyStrategies(myStrats?.strategies || [])
    } catch (err) {
      console.error("Failed to load data:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleImport = async (shareId: string) => {
    setImporting(shareId)
    try {
      const result = await api.importStrategy(shareId)
      if (result.ok) {
        toast({
          title: result.already_imported ? "⚠️ Анхааруулга" : "✅ Амжилттай",
          description: result.already_imported
            ? "Энэ стратеги аль хэдийн импортлогдсон байна"
            : `"${result.strategy_id}" стратеги импортлогдлоо. Идэвхжүүлэхийн тулд Strategies хуудас руу орно уу.`,
        })
        await loadData()
      }
    } catch (err: any) {
      toast({
        title: "Алдаа",
        description: err.message || "Импортлох үед алдаа гарлаа",
        variant: "destructive",
      })
    } finally {
      setImporting(null)
    }
  }

  const handleShare = async () => {
    if (!selectedStrategy) return

    setSharing(true)
    try {
      const result = await api.shareStrategy({
        strategy_id: selectedStrategy.strategy_id,
        detectors: selectedStrategy.detectors,
        min_score: selectedStrategy.min_score,
        min_rr: selectedStrategy.min_rr,
        allowed_regimes: selectedStrategy.allowed_regimes,
        description: shareDescription,
      })

      if (result.ok) {
        toast({
          title: "Амжилттай",
          description: `"${selectedStrategy.strategy_id}" стратеги хуваалцлаа`,
        })
        setShareDialogOpen(false)
        setSelectedStrategy(null)
        setShareDescription("")
        await loadData()
      }
    } catch (err: any) {
      toast({
        title: "Алдаа",
        description: err.message || "Хуваалцах үед алдаа гарлаа",
        variant: "destructive",
      })
    } finally {
      setSharing(false)
    }
  }

  const filteredStrategies = sharedStrategies.filter((s) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      s.strategy_id.toLowerCase().includes(query) ||
      s.description?.toLowerCase().includes(query) ||
      s.detectors.some((d) => d.toLowerCase().includes(query))
    )
  })

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString("mn-MN")
    } catch {
      return iso
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="py-12 text-center">
          <p className="text-muted-foreground">Ачааллаж байна...</p>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Strategy Library</h1>
            <p className="text-muted-foreground">
              Бусад хэрэглэгчдийн хуваалцсан стратегиуд
            </p>
          </div>
        </div>

        <Tabs defaultValue="browse">
          <TabsList>
            <TabsTrigger value="browse" className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              Browse
            </TabsTrigger>
            <TabsTrigger value="share" className="flex items-center gap-2">
              <Share2 className="h-4 w-4" />
              Share Mine
            </TabsTrigger>
          </TabsList>

          <TabsContent value="browse" className="space-y-4 pt-4">
            {/* Search */}
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Стратеги хайх..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Stats */}
            <div className="flex gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                {sharedStrategies.length} стратеги
              </span>
            </div>

            {/* Strategies grid */}
            {filteredStrategies.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">
                    {searchQuery
                      ? "Хайлтад тохирох стратеги олдсонгүй"
                      : "Хуваалцсан стратеги байхгүй байна"}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredStrategies.map((strategy) => (
                  <Card key={strategy.share_id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-lg">
                          {strategy.strategy_id}
                        </CardTitle>
                        <Badge variant="secondary" className="text-xs">
                          RR ≥ {strategy.min_rr}
                        </Badge>
                      </div>
                      {strategy.description && (
                        <CardDescription className="line-clamp-2">
                          {strategy.description}
                        </CardDescription>
                      )}
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {/* Detectors */}
                      <div>
                        <p className="mb-1.5 text-xs font-medium text-muted-foreground">
                          Detectors:
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {strategy.detectors.slice(0, 4).map((d) => (
                            <Badge key={d} variant="outline" className="text-xs">
                              {d}
                            </Badge>
                          ))}
                          {strategy.detectors.length > 4 && (
                            <Badge variant="outline" className="text-xs">
                              +{strategy.detectors.length - 4}
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Regimes */}
                      <div>
                        <p className="mb-1.5 text-xs font-medium text-muted-foreground">
                          Regimes:
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {strategy.allowed_regimes.map((r) => (
                            <Badge
                              key={r}
                              variant="secondary"
                              className="text-xs"
                            >
                              {r}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      {/* Meta */}
                      <div className="flex items-center justify-between pt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDate(strategy.shared_at)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Download className="h-3 w-3" />
                          {strategy.copies} imports
                        </span>
                      </div>

                      {/* Import button */}
                      <Button
                        className="w-full"
                        size="sm"
                        onClick={() => handleImport(strategy.share_id)}
                        disabled={importing === strategy.share_id}
                      >
                        <Download className="mr-2 h-4 w-4" />
                        {importing === strategy.share_id
                          ? "Импортлож байна..."
                          : "Импортлох"}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="share" className="space-y-4 pt-4">
            <Card>
              <CardHeader>
                <CardTitle>Миний стратегиуд</CardTitle>
                <CardDescription>
                  Өөрийн стратегиа бусадтай хуваалцах
                </CardDescription>
              </CardHeader>
              <CardContent>
                {myStrategies.length === 0 ? (
                  <p className="py-8 text-center text-muted-foreground">
                    Та стратеги үүсгээгүй байна
                  </p>
                ) : (
                  <div className="space-y-3">
                    {myStrategies.map((strategy) => (
                      <div
                        key={strategy.strategy_id}
                        className="flex items-center justify-between rounded-lg border p-3"
                      >
                        <div>
                          <p className="font-medium">{strategy.strategy_id}</p>
                          <p className="text-sm text-muted-foreground">
                            {strategy.detectors.length} detectors ·{" "}
                            {strategy.enabled ? "Идэвхтэй" : "Идэвхгүй"}
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={strategy.detectors.length === 0}
                          onClick={() => {
                            setSelectedStrategy(strategy)
                            setShareDescription("")
                            setShareDialogOpen(true)
                          }}
                        >
                          <Share2 className="mr-2 h-4 w-4" />
                          Хуваалцах
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Share Modal */}
            {shareDialogOpen && selectedStrategy && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                <Card className="w-full max-w-md mx-4">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>Стратеги хуваалцах</CardTitle>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShareDialogOpen(false)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <CardDescription>
                      &quot;{selectedStrategy.strategy_id}&quot; стратегиа бусадтай хуваалцах
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Тайлбар (заавал биш)</Label>
                      <Textarea
                        placeholder="Энэ стратеги яаж ажилладаг вэ?"
                        value={shareDescription}
                        onChange={(e) => setShareDescription(e.target.value)}
                      />
                    </div>
                    <div className="rounded-lg bg-muted p-3 text-sm">
                      <p className="font-medium">Хуваалцах мэдээлэл:</p>
                      <ul className="mt-2 space-y-1 text-muted-foreground">
                        <li>• Detectors: {selectedStrategy.detectors.join(", ")}</li>
                        <li>• Min Score: {selectedStrategy.min_score || 1.0}</li>
                        <li>• Min RR: {selectedStrategy.min_rr || 2.0}</li>
                      </ul>
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                      <Button
                        variant="outline"
                        onClick={() => setShareDialogOpen(false)}
                      >
                        Болих
                      </Button>
                      <Button onClick={handleShare} disabled={sharing}>
                        {sharing ? "Хуваалцаж байна..." : "Хуваалцах"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}
