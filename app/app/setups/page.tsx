"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { api } from "@/lib/api"
import { Plus, Search, Play, Pause, Copy, Trash2 } from "lucide-react"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export default function SetupsPage() {
  const [setups, setSetups] = useState<any[]>([])
  const [search, setSearch] = useState("")
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    loadSetups()
  }, [])

  const loadSetups = async () => {
    try {
      const data = await api.getStrategies()
      setSetups(data.strategies || [])
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Алдаа гарлаа",
        description: error.message,
      })
    }
  }

  const handleTogglePause = async (setup: any) => {
    const updated = setups.map((s) =>
      s.id === setup.id ? { ...s, status: s.status === "Active" ? "Paused" : "Active" } : s,
    )
    setSetups(updated)
    toast({
      title: "Амжилттай",
      description: `Setup ${setup.status === "Active" ? "түр зогссон" : "идэвхжүүлсэн"}`,
    })
  }

  const handleDelete = async () => {
    if (!deleteId) return
    setSetups(setups.filter((s) => s.id !== deleteId))
    setDeleteId(null)
    toast({
      title: "Устгасан",
      description: "Setup амжилттай устгагдлаа",
    })
  }

  const filtered = setups.filter((s) => s.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Setup-ууд</h1>
          <p className="text-muted-foreground">Таны үүсгэсэн арга барилууд</p>
        </div>
        <Button asChild>
          <Link href="/strategies/maker">
            <Plus className="mr-2 h-4 w-4" />
            Шинэ Setup
          </Link>
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Setup хайх..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              {search ? "Хайлтын үр дүн олдсонгүй" : "Setup үүсгээгүй байна. Эхний setup-аа үүсгэнэ үү?"}
            </p>
            {!search && (
              <Button asChild className="mt-4">
                <Link href="/strategies/maker">
                  <Plus className="mr-2 h-4 w-4" />
                  Шинэ Setup үүсгэх
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((setup) => (
            <Card key={setup.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg">{setup.name}</CardTitle>
                  <Badge variant={setup.status === "Active" ? "default" : "secondary"}>{setup.status}</Badge>
                </div>
                <CardDescription>{setup.description || "Тайлбар байхгүй"}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">{setup.market}</Badge>
                  <Badge variant="outline">{setup.timeframe}</Badge>
                  <Badge variant="outline">{setup.cadence}мин</Badge>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleTogglePause(setup)}
                    className="flex-1 bg-transparent"
                  >
                    {setup.status === "Active" ? <Pause className="mr-2 h-3 w-3" /> : <Play className="mr-2 h-3 w-3" />}
                    {setup.status === "Active" ? "Зогсоох" : "Эхлүүлэх"}
                  </Button>
                  <Button variant="outline" size="sm" asChild className="bg-transparent">
                    <Link href={`/app/setups/${setup.id}`}>Дэлгэрэнгүй</Link>
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" className="flex-1">
                    <Copy className="mr-2 h-3 w-3" />
                    Хуулах
                  </Button>
                  <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setDeleteId(setup.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Setup устгах уу?</AlertDialogTitle>
            <AlertDialogDescription>
              Энэ үйлдлийг буцаах боломжгүй. Setup болон түүний бүх түүх устах болно.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Болих</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Устгах
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
