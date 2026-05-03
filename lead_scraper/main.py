"""
Main CLI - GA Interpack Lead Scraper
Uso: python main.py --help
"""
import typer
from typing import Optional, List
from rich.console import Console
from rich.progress import track

app = typer.Typer(help="GA Interpack Lead Scraper - Sistema de captura de clientes")
console = Console()


@app.command()
def init():
    """Inicializa la base de datos."""
    from database import init_db
    init_db()
    console.print("[green]✓ Base de datos inicializada.[/]")


@app.command()
def search(
    keywords: Optional[List[str]] = typer.Option(None, "--keyword", "-k", help="Keywords custom"),
    use_all: bool = typer.Option(False, "--all", help="Usar todas las keywords predefinidas"),
    limit: int = typer.Option(5, "--limit", "-l", help="Max keywords a usar"),
):
    """Busca URLs usando keywords y las guarda para scrapear."""
    from database import init_db
    from search import search_keyword, search_all_keywords
    from config import SEARCH_KEYWORDS

    init_db()

    kws = keywords if keywords else (SEARCH_KEYWORDS if use_all else SEARCH_KEYWORDS[:limit])
    console.print(f"[cyan]Buscando con {len(kws)} keywords...[/]")

    all_urls = []
    for kw in track(kws, description="Buscando..."):
        urls = search_keyword(kw)
        all_urls.extend(urls)

    console.print(f"[green]✓ {len(all_urls)} URLs encontradas.[/]")
    _save_urls_file(list(set(all_urls)))


@app.command()
def scrape(
    url: Optional[str] = typer.Option(None, "--url", "-u", help="URL especifica"),
    from_file: bool = typer.Option(False, "--from-file", help="Scrapear desde data/pending_urls.txt"),
    ai: bool = typer.Option(False, "--ai", help="Enriquecer con IA (solo HOT/WARM)"),
    score_threshold: int = typer.Option(40, "--min-score", help="Score minimo para usar IA"),
):
    """Scrapea URLs y extrae leads."""
    from database import init_db, save_lead, url_exists
    from scraper import scrape_url
    from classifier import classify_lead
    from ai_enrichment import enrich_lead

    init_db()
    urls = []

    if url:
        urls = [url]
    elif from_file:
        urls = _load_urls_file()
    else:
        console.print("[yellow]Usa --url <url> o --from-file para scraping.[/]")
        raise typer.Exit()

    new_leads = 0
    skipped = 0

    for u in track(urls, description="Scrapeando..."):
        if url_exists(u):
            skipped += 1
            continue

        lead = scrape_url(u)
        if not lead:
            continue

        lead = classify_lead(lead)

        if ai and lead.classification in ("HOT", "WARM") and lead.score >= score_threshold:
            console.print(f"[yellow]AI enrichment: {u}[/]")
            lead = enrich_lead(lead)

        lead_id = save_lead(lead)
        if lead_id:
            new_leads += 1
            console.print(
                f"[green]+[/] [{lead.classification}] {lead.company_name or lead.website} "
                f"(score: {lead.score})"
            )

    console.print(f"\n[bold green]✓ {new_leads} leads nuevos | {skipped} duplicados saltados.[/]")


@app.command()
def enrich(
    lead_id: Optional[int] = typer.Option(None, "--id", help="ID del lead a enriquecer"),
    hot_only: bool = typer.Option(False, "--hot", help="Enriquecer todos los HOT"),
):
    """Enriquece leads con análisis de IA."""
    from database import init_db, get_all_leads, get_lead_by_id, update_lead
    from ai_enrichment import enrich_lead
    from models import Lead

    init_db()

    if lead_id:
        data = get_lead_by_id(lead_id)
        if not data:
            console.print(f"[red]Lead {lead_id} no encontrado.[/]")
            raise typer.Exit()
        lead = Lead(**{k: v for k, v in data.items() if k != "id"})
        lead.id = data["id"]
        lead = enrich_lead(lead)
        update_lead(lead_id, ai_analysis=lead.ai_analysis, outreach_message=lead.outreach_message)
        console.print(f"[green]✓ Lead {lead_id} enriquecido.[/]")
    elif hot_only:
        leads_data = get_all_leads(classification="HOT")
        for data in track(leads_data, description="Enriqueciendo HOT leads..."):
            if data.get("ai_analysis"):
                continue
            lead = Lead(**{k: v for k, v in data.items() if k != "id"})
            lead.id = data["id"]
            lead = enrich_lead(lead)
            update_lead(lead["id"] if isinstance(lead, dict) else data["id"],
                       ai_analysis=lead.ai_analysis, outreach_message=lead.outreach_message)
    else:
        console.print("[yellow]Usa --id <id> o --hot[/]")


@app.command()
def stats():
    """Muestra estadísticas del dashboard."""
    from database import init_db
    from dashboard import show_stats
    init_db()
    show_stats()


@app.command()
def leads(
    classification: Optional[str] = typer.Option(None, "--class", "-c", help="HOT/WARM/COLD/PARTNER/COMPETITOR"),
    limit: int = typer.Option(50, "--limit", "-l"),
):
    """Lista leads en tabla."""
    from database import init_db
    from dashboard import show_leads_table
    init_db()
    show_leads_table(classification=classification, limit=limit)


@app.command()
def detail(lead_id: int = typer.Argument(..., help="ID del lead")):
    """Muestra detalles completos de un lead con mensajes de contacto."""
    from database import init_db
    from dashboard import show_lead_detail
    init_db()
    show_lead_detail(lead_id)


@app.command()
def export(
    classification: Optional[str] = typer.Option(None, "--class", "-c"),
    filename: Optional[str] = typer.Option(None, "--file", "-f"),
):
    """Exporta leads a CSV."""
    from database import init_db
    from export import export_csv
    init_db()
    path = export_csv(classification=classification, filename=filename)
    if path:
        console.print(f"[green]✓ Exportado: {path}[/]")


@app.command()
def run_full(
    limit: int = typer.Option(3, "--limit", "-l", help="Keywords a procesar"),
    ai: bool = typer.Option(False, "--ai", help="Activar AI enrichment"),
):
    """Ejecuta ciclo completo: search + scrape + classify (+ AI opcional)."""
    from database import init_db, save_lead, url_exists
    from search import search_keyword
    from scraper import scrape_url
    from classifier import classify_lead
    from ai_enrichment import enrich_lead
    from config import SEARCH_KEYWORDS

    init_db()
    console.print(f"[bold cyan]Iniciando ciclo completo con {limit} keywords...[/]")

    all_urls = []
    for kw in SEARCH_KEYWORDS[:limit]:
        console.print(f"  Buscando: [dim]{kw}[/]")
        urls = search_keyword(kw)
        all_urls.extend(urls)

    all_urls = list(set(all_urls))
    console.print(f"[cyan]{len(all_urls)} URLs a scrapear[/]")

    new_leads = 0
    for u in track(all_urls, description="Procesando URLs..."):
        if url_exists(u):
            continue
        lead = scrape_url(u)
        if not lead:
            continue
        lead = classify_lead(lead)
        if ai and lead.classification in ("HOT", "WARM"):
            lead = enrich_lead(lead)
        if save_lead(lead):
            new_leads += 1

    console.print(f"\n[bold green]✓ Listo! {new_leads} leads nuevos guardados.[/]")

    from dashboard import show_stats
    show_stats()


@app.command()
def maps(
    query: Optional[str] = typer.Option(None, "--query", "-q", help="Ej: 'courier service'"),
    location: Optional[str] = typer.Option(None, "--location", "-loc", help="Ej: 'Miami, FL'"),
    all_searches: bool = typer.Option(False, "--all", help="Ejecutar todas las busquedas predefinidas"),
    max_results: int = typer.Option(100, "--max", "-m", help="Max resultados por busqueda"),
    ai: bool = typer.Option(False, "--ai", help="AI enrichment para HOT leads"),
):
    """Extrae leads de Google Maps (mayor fuente gratuita). Requiere: playwright install chromium"""
    from database import init_db, save_lead, url_exists
    from google_maps import scrape_google_maps, scrape_all_maps_searches, MAPS_SEARCHES
    from classifier import classify_lead
    from ai_enrichment import enrich_lead

    init_db()

    if all_searches:
        console.print(f"[bold cyan]Google Maps: {len(MAPS_SEARCHES)} busquedas predefinidas...[/]")
        leads = scrape_all_maps_searches(max_per_search=max_results)
    elif query and location:
        console.print(f"[cyan]Google Maps: '{query}' en '{location}'[/]")
        leads = scrape_google_maps(query, location, max_results=max_results)
    else:
        console.print("[yellow]Usa --query y --location, o --all para todas las busquedas.[/]")
        console.print("\nEjemplos:")
        console.print("  python main.py maps --query 'courier service' --location 'Miami, FL'")
        console.print("  python main.py maps --all --max 50")
        raise typer.Exit()

    new_leads = 0
    for lead in track(leads, description="Clasificando y guardando..."):
        if url_exists(lead.source_url):
            continue
        lead = classify_lead(lead)
        if ai and lead.classification in ("HOT", "WARM"):
            lead = enrich_lead(lead)
        if save_lead(lead):
            new_leads += 1

    console.print(f"\n[bold green]✓ {new_leads} leads nuevos de Google Maps.[/]")
    from dashboard import show_stats
    show_stats()


@app.command()
def dirs(
    all_sources: bool = typer.Option(True, "--all/--no-all", help="Scrapear todos los directorios"),
    pages: int = typer.Option(3, "--pages", "-p", help="Paginas por directorio"),
    ai: bool = typer.Option(False, "--ai"),
):
    """Extrae leads de Yellow Pages, Yelp, Manta, Paginas Amarillas RD."""
    from database import init_db, save_lead, url_exists
    from directories import scrape_all_directories
    from classifier import classify_lead
    from ai_enrichment import enrich_lead

    init_db()
    console.print(f"[bold cyan]Scrapeando directorios (max {pages} paginas c/u)...[/]")

    leads = scrape_all_directories(max_pages=pages)
    new_leads = 0

    for lead in track(leads, description="Clasificando y guardando..."):
        if url_exists(lead.source_url):
            continue
        lead = classify_lead(lead)
        if ai and lead.classification in ("HOT", "WARM"):
            lead = enrich_lead(lead)
        if save_lead(lead):
            new_leads += 1

    console.print(f"\n[bold green]✓ {new_leads} leads nuevos de directorios.[/]")
    from dashboard import show_stats
    show_stats()


@app.command()
def mega(
    pages: int = typer.Option(5, "--pages", "-p", help="Paginas por directorio"),
    maps_max: int = typer.Option(80, "--maps-max", help="Max resultados por busqueda en Maps"),
    ai: bool = typer.Option(False, "--ai"),
):
    """MODO MEGA: Ejecuta Google Maps + todos los directorios + search. Meta: 10,000 leads."""
    from database import init_db, save_lead, url_exists
    from google_maps import scrape_all_maps_searches
    from directories import scrape_all_directories
    from search import search_keyword
    from scraper import scrape_url
    from classifier import classify_lead
    from ai_enrichment import enrich_lead
    from config import SEARCH_KEYWORDS
    from dashboard import show_stats

    init_db()
    console.print("[bold magenta]🚀 MODO MEGA - Meta: 10,000 leads[/]")
    console.print("[dim]Google Maps + Yellow Pages + Yelp + Manta + PA-RD + Web Search[/]\n")

    all_leads = []
    new_leads = 0

    # 1. Google Maps
    console.print("[bold cyan]Fase 1: Google Maps...[/]")
    maps_leads = scrape_all_maps_searches(max_per_search=maps_max)
    all_leads.extend(maps_leads)
    console.print(f"  Google Maps: {len(maps_leads)} leads")

    # 2. Directorios
    console.print("[bold cyan]Fase 2: Directorios...[/]")
    dir_leads = scrape_all_directories(max_pages=pages)
    all_leads.extend(dir_leads)
    console.print(f"  Directorios: {len(dir_leads)} leads")

    # 3. Web search con todas las keywords
    console.print("[bold cyan]Fase 3: Web Search...[/]")
    web_urls = []
    for kw in SEARCH_KEYWORDS:
        web_urls.extend(search_keyword(kw))
    web_urls = list(set(web_urls))
    console.print(f"  URLs encontradas: {len(web_urls)}")
    for url in web_urls:
        if not url_exists(url):
            lead = scrape_url(url)
            if lead:
                all_leads.append(lead)

    # Clasificar y guardar todo
    console.print(f"\n[bold]Clasificando {len(all_leads)} leads totales...[/]")
    for lead in track(all_leads, description="Guardando en base de datos..."):
        if url_exists(lead.source_url):
            continue
        lead = classify_lead(lead)
        if ai and lead.classification in ("HOT", "WARM"):
            lead = enrich_lead(lead)
        if save_lead(lead):
            new_leads += 1

    console.print(f"\n[bold green]✓ MEGA completado: {new_leads} leads nuevos guardados.[/]")
    show_stats()

    # Auto-exportar
    from export import export_csv
    path_all = export_csv()
    path_hot = export_csv(classification="HOT")
    console.print(f"\n[green]CSVs exportados:[/]")
    console.print(f"  Todos: {path_all}")
    console.print(f"  HOT:   {path_hot}")


def _save_urls_file(urls: list):
    import os
    os.makedirs("data", exist_ok=True)
    with open("data/pending_urls.txt", "w") as f:
        f.write("\n".join(urls))
    console.print(f"[dim]{len(urls)} URLs guardadas en data/pending_urls.txt[/]")


def _load_urls_file() -> list:
    try:
        with open("data/pending_urls.txt") as f:
            return [line.strip() for line in f if line.strip()]
    except FileNotFoundError:
        console.print("[red]data/pending_urls.txt no encontrado. Ejecuta 'search' primero.[/]")
        return []


if __name__ == "__main__":
    app()
