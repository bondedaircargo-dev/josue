# Estrategia: 10,000+ Leads sin gastar mucho

## Resumen de fuentes y potencial real

| Fuente | Costo | Leads estimados | Tiempo |
|--------|-------|-----------------|--------|
| Google Maps (Playwright) | GRATIS | 3,000 – 8,000 | 4-8 horas |
| Yellow Pages | GRATIS | 500 – 1,500 | 1-2 horas |
| Yelp | GRATIS | 300 – 800 | 1 hora |
| Manta.com | GRATIS | 300 – 600 | 1 hora |
| Paginas Amarillas RD | GRATIS | 200 – 500 | 1 hora |
| Web search (DuckDuckGo) | GRATIS | 200 – 500 | 1-2 horas |
| **Total GRATIS** | **$0** | **~5,000–12,000** | **8-14 horas** |
| Outscraper.com (Maps extra) | ~$15 | +5,000 | 30 min |
| Apollo.io (con emails) | $49/mes | +10,000 con email | 1 hora |

---

## OPCION 1: 100% GRATIS (comando mega)

```powershell
# Instalar Playwright (una sola vez)
playwright install chromium

# Ejecutar modo MEGA - todas las fuentes
python main.py mega --pages 5 --maps-max 100

# Ver resultados
python main.py stats
python main.py leads --class HOT
python main.py export --class HOT
```

**Resultado esperado: 5,000 – 12,000 leads en 8-14 horas**
Deja correr de noche o en segundo plano.

---

## OPCION 2: Mas rapido con $15 (Outscraper)

Outscraper extrae Google Maps sin Playwright, mas rapido y estable.

### Paso a paso:
1. Ir a https://outscraper.com
2. Registrarse (plan gratuito: 500 resultados)
3. Plan de pago: ~$15 por 5,000 resultados

### Keywords a usar en Outscraper:
```
courier service, Miami, FL, USA
freight forwarder, Miami, FL, USA
shipping company, Miami, FL, USA
electronics wholesale, Miami, FL, USA
cell phone store, Miami, FL, USA
import export, Miami, FL, USA
courier service, Hialeah, FL, USA
cargo company, Miami, FL, USA
tienda celulares, Santo Domingo, Dominican Republic
importadora, Santo Domingo, Dominican Republic
courier, Santo Domingo, Dominican Republic
electronics store, Port-au-Prince, Haiti
cargo Haiti, Miami, FL, USA
```

### Importar CSV de Outscraper al sistema:
```powershell
python main.py import-csv --file outscraper_export.csv
```
*(Agregar este comando al sistema si necesitas)*

---

## OPCION 3: Con emails verificados ($49/mes Apollo)

Apollo.io tiene la base de datos mas grande de contactos B2B.

### Busquedas en Apollo:
- Job title: "Owner", "Manager", "Director of Operations"
- Industry: "Transportation/Trucking/Railroad", "Import and Export", "Retail"
- Location: Miami FL, Santo Domingo, Port-au-Prince
- Keywords: "courier", "shipping", "cargo", "freight"

### Resultado: 10,000+ leads con email verificado

---

## OPCION 4: Facebook Groups (GRATIS, manual pero CALIENTE)

Los leads de Facebook son los mas calientes porque ya estan buscando el servicio.

### Grupos donde buscar:
- "Dominicanos en Miami"
- "Haitianos en Miami"
- "Envios a Republica Dominicana"
- "Haitian Miami Community"
- "Dominican Shipping Miami"
- "Caribbean Cargo Miami"
- "Importadores Dominicanos"
- "Marketplace Dominicano Miami"

### Que buscar dentro del grupo:
- Posts que digan: "busco courier", "quien envia a RD", "how to ship to Haiti"
- Personas preguntando precios
- Negocios anunciando productos que necesitan importar

### Herramienta gratis: Phantom Buster (14 dias de prueba)
Extrae posts y contactos de grupos de Facebook automaticamente.

---

## OPCION 5: Instagram (GRATIS con manual o Phantom Buster)

### Hashtags a buscar:
```
#dominicancourier
#miamitohaiti
#enviosrd
#couriermiamisd
#haitiancargo
#importadorasrd
#celularessantodomingo
#tiendacelularesrd
#cargohaiti
#dominicashippping
```

### Que hacer:
1. Buscar el hashtag en Instagram
2. Ver quien comenta o postea
3. Guardar su @usuario, contactar por DM

---

## PLAN DE ATAQUE RECOMENDADO (orden de prioridad)

### Dia 1 - GRATIS, manos a la obra:
```powershell
# Instalar todo
pip install -r requirements.txt
playwright install chromium

# Iniciar
python main.py init

# Modo Mega (dejar corriendo toda la noche)
python main.py mega --pages 5 --maps-max 100
```

### Dia 2 - Revisar y contactar HOT leads:
```powershell
python main.py stats
python main.py leads --class HOT
python main.py export --class HOT
# Abrir CSV en Excel y contactar manualmente
```

### Dia 3 - Enriquecer con IA los mejores:
```powershell
python main.py enrich --hot
python main.py leads --class HOT
# Ver mensajes personalizados para cada lead
python main.py detail 1
```

### Semana 2 - Si quieres mas volumen ($15):
1. Outscraper.com con las keywords de arriba
2. Importar CSV al sistema
3. Clasificar y contactar

---

## Estructura del lead perfecto

Un lead HOT tiene:
- ✓ Email
- ✓ Telefono o WhatsApp
- ✓ Website
- ✓ Ruta de interes detectada (Haiti o RD)
- ✓ Tipo de negocio claro (courier, importer, electronics)

**Score >= 60 = HOT automaticamente**

---

## Tips para maximizar resultados

1. **Corre el sistema de noche** - No hay limite de tiempo, mientras mas tiempo corre mas leads acumula
2. **Aumenta --maps-max a 200** para busquedas de Google Maps
3. **Aumenta --pages a 10** para directorios (mas paginas = mas leads)
4. **Agrega keywords** personalizadas en config.py
5. **No borres la base de datos** - Los duplicados se detectan automaticamente
6. **Exporta cada dia** y trabaja los HOT antes de los WARM

---

## Costo total estimado

| Escenario | Costo | Leads |
|-----------|-------|-------|
| Solo GRATIS | $0 | 5,000–12,000 |
| GRATIS + Outscraper | $15 | 10,000–15,000 |
| GRATIS + Apollo | $49/mes | 15,000+ con emails |
| Setup completo | $64/mes | 20,000+ |

**Para empezar a conseguir clientes = $0**
