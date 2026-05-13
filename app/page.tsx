import { Button } from "@/components/ui/button"
import { Card, CardBody, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Logo } from "@/components/brand/logo"
import { Divider } from "@/components/brand/divider"

export default function HomePage() {
  return (
    <main className="min-h-screen p-12 max-w-2xl mx-auto space-y-6">
      <Logo size="lg" />
      <h1 className="heading-display text-5xl">Lujo que <em className="text-gold-primary">se siente</em></h1>
      <Divider text="Coming Soon" />
      <Card>
        <CardHeader>
          <h2 className="font-serif text-2xl">Card Test</h2>
        </CardHeader>
        <CardBody className="space-y-3">
          <Input placeholder="Test input" />
          <div className="flex gap-2 flex-wrap">
            <Badge tone="success">Stock</Badge>
            <Badge tone="info">Pre-orden</Badge>
            <Badge tone="warning">Borrador</Badge>
            <Badge tone="gold">Destacado</Badge>
          </div>
          <div className="flex gap-2">
            <Button>Primary</Button>
            <Button variant="ghost">Ghost</Button>
          </div>
        </CardBody>
      </Card>
    </main>
  )
}
