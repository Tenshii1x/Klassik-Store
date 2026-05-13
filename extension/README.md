# Klassik Store · Extensión Chrome

Importa productos de Temu directamente al admin de Klassik Store con un click.

## Desarrollo local

```bash
cd extension
npm install
npm run build         # build una sola vez
npm run watch         # watch mode
```

Cargar en Chrome:

1. Abre `chrome://extensions`
2. Activa "Developer mode" (top right)
3. Click "Load unpacked"
4. Selecciona la carpeta `extension/`

## Configuración

Al abrir el popup por primera vez, te pedirá:

- **URL Edge Function**: `https://ackefqrcejicepksrwiz.supabase.co/functions/v1/import-temu-product`
- **API Key**: genérala en `/admin/configuracion/extension` de tu instalación de Klassik Store

## Uso

1. Navega a Temu, abre cualquier producto (logueada con tu sesión normal)
2. Click el ícono KS en la barra de extensiones
3. El popup muestra preview del producto detectado
4. Click "Importar a Klassik Store"
5. El producto aparece como borrador en `/admin/productos`
6. Las imágenes están marcadas como "Sin verificar" — revisa cada una y marca como "Limpia" antes de publicar

## Estructura

```
manifest.json            Manifest V3
popup/                   UI del popup (lo que se ve al click el ícono)
content/                 Content script que lee el DOM de Temu
background/              Service worker (mínimo)
lib/                     Tipos compartidos
build/                   Output de esbuild (gitignored)
icons/                   Iconos de la extensión
```

## Build de distribución (.crx)

Ver `docs/superpowers/plans/2026-05-13-plan-04-extension-chrome.md` sección Task 9.
