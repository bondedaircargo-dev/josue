"""
Dashboard Module: muestra estadisticas y leads en la terminal usando Rich.
"""
from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from rich import box
from database import get_stats, get_all_leads, get_lead_by_id
from outreach import format_outreach_for_lead
from models import Lead

console = Console()


def show_stats():
    stats = get_stats()
    panel = Panel(
        f"[bold green]Total Leads:[/] {stats['total']}\n"
        f"[bold red]HOT 🔥:[/] {stats['hot']}   "
        f"[bold yellow]WARM ⚡:[/] {stats['warm']}   "
        f"[bold blue]COLD 🧊:[/] {stats['cold']}\n"
        f"[bold cyan]PARTNER 🤝:[/] {stats['partner']}   "
        f"[bold magenta]COMPETITOR ⚔️:[/] {stats['competitor']}\n\n"
        f"[bold]Rutas:[/] Haiti: {stats['haiti']} | RD: {stats['dr']}\n"
        f"[bold]Con Email:[/] {stats['with_email']} | "
        f"[bold]Con WhatsApp:[/] {stats['with_whatsapp']}",
        title="[bold white]📊 DASHBOARD - GA Interpack Lead System[/]",
        border_style="green",
    )
    console.print(panel)


def show_leads_table(classification: str = None, limit: int = 50):
    leads = get_all_leads(classification=classification)[:limit]
    if not leads:
        console.print("[yellow]No hay leads para mostrar.[/]")
        return

    title = f"Leads {classification or 'TODOS'} ({len(leads)})"
    table = Table(title=title, box=box.ROUNDED, show_lines=False)
    table.add_column("ID", style="dim", width=4)
    table.add_column("Empresa", style="bold", max_width=25)
    table.add_column("Email", max_width=25)
    table.add_column("Phone", max_width=15)
    table.add_column("WA", max_width=5)
    table.add_column("Ruta", max_width=20)
    table.add_column("Tipo", max_width=12)
    table.add_column("Score", justify="right", width=6)
    table.add_column("Clase", width=10)

    colors = {
        "HOT": "red", "WARM": "yellow", "COLD": "blue",
        "PARTNER": "cyan", "COMPETITOR": "magenta",
    }

    for lead in leads:
        cls = lead.get("classification", "COLD")
        color = colors.get(cls, "white")
        table.add_row(
            str(lead["id"]),
            lead["company_name"][:25] or "-",
            lead["email"][:25] or "-",
            lead["phone"][:15] or "-",
            "✓" if lead["whatsapp"] else "-",
            lead["route_interest"][:20] or "-",
            lead["lead_type"][:12] or "-",
            str(lead["score"]),
            f"[{color}]{cls}[/]",
        )

    console.print(table)


def show_lead_detail(lead_id: int):
    data = get_lead_by_id(lead_id)
    if not data:
        console.print(f"[red]Lead {lead_id} no encontrado.[/]")
        return

    lead = Lead(**{k: v for k, v in data.items() if k != "id"})
    lead.id = data["id"]

    console.print(Panel(
        f"[bold]ID:[/] {data['id']}\n"
        f"[bold]Empresa:[/] {data['company_name']}\n"
        f"[bold]Contacto:[/] {data['contact_name'] or '-'}\n"
        f"[bold]Email:[/] {data['email'] or '-'}\n"
        f"[bold]Teléfono:[/] {data['phone'] or '-'}\n"
        f"[bold]WhatsApp:[/] {data['whatsapp'] or '-'}\n"
        f"[bold]Web:[/] {data['website'] or '-'}\n"
        f"[bold]Social:[/] {data['social_url'] or '-'}\n"
        f"[bold]Ruta:[/] {data['route_interest']}\n"
        f"[bold]Producto:[/] {data['product_interest']}\n"
        f"[bold]Score:[/] {data['score']}\n"
        f"[bold]Clasificación:[/] {data['classification']}\n"
        f"[bold]Estado:[/] {data['status']}\n"
        f"[bold]Fuente:[/] {data['source_url']}",
        title=f"[bold]Lead #{data['id']}[/]",
        border_style="cyan",
    ))

    if data.get("ai_analysis"):
        console.print(Panel(data["ai_analysis"], title="[bold]Análisis IA[/]", border_style="yellow"))

    msg = format_outreach_for_lead(lead)
    console.print(Panel(msg, title="[bold]Mensajes de Contacto[/]", border_style="green"))
