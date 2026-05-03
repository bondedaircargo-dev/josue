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
