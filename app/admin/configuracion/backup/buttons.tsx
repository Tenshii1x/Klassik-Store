"use client"

import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"

interface Props {
  csv: string
  productos: unknown[]
}

export function BackupButtons({ csv, productos }: Props) {
  const fecha = new Date().toISOString().slice(0, 10)

  function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  function downloadCSV() {
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" })
    downloadBlob(blob, `klassik-backup-${fecha}.csv`)
  }

  function downloadJSON() {
    const blob = new Blob([JSON.stringify(productos, null, 2)], { type: "application/json" })
    downloadBlob(blob, `klassik-backup-${fecha}.json`)
  }

  return (
    <div className="flex gap-3 flex-wrap">
      <Button onClick={downloadCSV} size="lg">
        <Download size={16} /> Descargar CSV (Excel)
      </Button>
      <Button onClick={downloadJSON} variant="ghost" size="lg">
        <Download size={16} /> Descargar JSON
      </Button>
    </div>
  )
}
