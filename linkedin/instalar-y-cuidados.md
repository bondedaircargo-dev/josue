# LinkedIn para Bonded Air Cargo — Instalación y Cuidados

**Objetivo:** que Claude **lea y analice** LinkedIn, te diga **con quién conectar y con quién no**,
y te **escriba el draft del mensaje**. Tú mandas las conexiones y mensajes **a mano**.
Claude **NUNCA** publica ni envía nada automático.

> ⚠️ Herramienta **no oficial**, no afiliada a LinkedIn. LinkedIn prohíbe el acceso
> automatizado y puede restringir cuentas. Por eso usamos **modo solo lectura** y
> volumen bajo. Úsala bajo tu propio riesgo.

---

## 1. Dónde se instala

**En TU computadora**, NO en las sesiones de la nube.
El lector necesita tu navegador con tu sesión normal de LinkedIn abierta (tu IP de casa).
Correrlo desde un servidor en la nube = bandera roja casi segura.

---

## 2. Instalación

### Opción A — Claude Desktop (más fácil)
1. Entra a las *releases* del proyecto: https://github.com/stickerdaniel/linkedin-mcp-server/releases
2. Descarga el archivo `.mcpb`.
3. Haz doble clic → se instala solo en Claude Desktop.

### Opción B — Claude Code (terminal, en tu PC)
```bash
claude plugin marketplace add stickerdaniel/linkedin-mcp-server
claude plugin install linkedin-mcp-server@linkedin-mcp-server
```

### Iniciar sesión (una sola vez)
La primera vez te abre un navegador para que **TÚ** inicies sesión en LinkedIn.
No le das tu contraseña al servidor; guarda tu sesión localmente en `~/.linkedin-mcp/profile/`.

**Nunca** pongas tu usuario/contraseña de LinkedIn en un chat ni en un archivo del repo.

---

## 3. Modo solo lectura (dícelo a Claude al empezar)

Pega esto como primera instrucción cada vez que lo uses:

> "Modo solo lectura de LinkedIn. NUNCA uses las herramientas de enviar conexión
> (`connect_with_person`) ni de mandar mensaje (`send_message`). Solo lee perfiles,
> empresas y búsquedas, analiza y dame drafts. Yo mando todo a mano."

---

## 4. Reglas para cuidar tu cuenta (tus "funciones")

1. **Solo lectura.** Jamás dejes que Claude mande conexiones o mensajes. Eso lo haces tú.
2. **Volumen bajo.** No abras cientos de perfiles de golpe. Máximo ~30–50 perfiles al día.
3. **Ritmo humano.** Deja pausas entre perfiles. Nada de ráfagas de 200 en 5 minutos.
4. **Tu IP y tu navegador de siempre.** Nada de VPN rara, nada de nube, nada de datacenter.
5. **Horario normal.** No lo corras 24/7 ni de madrugada. Como si lo navegaras tú.
6. **Si LinkedIn te pide captcha o verificación, o ves un aviso → PARA.** No lo uses por
   unos días. Esa es la señal de que te están mirando.
7. **Cuenta real y completa.** Un perfil con historial aguanta mucho más que uno nuevo.
8. **No exportes datos en masa.** Lee solo lo que revisarías tú mismo de todas formas.
9. **Tú apruebas y envías cada conexión/mensaje** desde LinkedIn normal.

---

## 5. Cómo lo usas día a día

1. Buscas prospectos en LinkedIn (o le pides a Claude que lea una búsqueda).
2. Claude puntúa cada perfil (ver `prospeccion.md`): **conecta / observa / salta**.
3. Claude te da el **draft** del mensaje de conexión.
4. **Tú** mandas la solicitud a mano desde LinkedIn.
5. Cuando acepten, Claude te da el mensaje de seguimiento. Tú lo mandas.
