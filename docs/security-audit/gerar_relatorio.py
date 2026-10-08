#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Gerador do Relatório de Auditoria de Segurança — Tech Hub.

Lê os achados de `achados.json` e produz
`relatorio-auditoria-seguranca.pdf` (A4, margens de 2 cm, cabeçalho e rodapé).

Como regerar:

    cd docs/security-audit
    python -m venv .venv
    .venv/Scripts/python.exe -m pip install reportlab matplotlib   # Windows
    .venv/bin/python -m pip install reportlab matplotlib           # Linux/macOS
    .venv/Scripts/python.exe gerar_relatorio.py

Para atualizar o conteúdo do relatório, edite `achados.json` — este script não
contém nenhum dado da auditoria.
"""

from __future__ import annotations

import json
import os
import unicodedata
from datetime import date

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    Image,
    KeepTogether,
    NextPageTemplate,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)

AQUI = os.path.dirname(os.path.abspath(__file__))
DADOS = os.path.join(AQUI, "achados.json")
SAIDA = os.path.join(AQUI, "relatorio-auditoria-seguranca.pdf")
GRAFICOS = os.path.join(AQUI, "graficos")

# ---------------------------------------------------------------- paleta ----

COR = {
    "critica": colors.HexColor("#B91C1C"),
    "alta": colors.HexColor("#EA580C"),
    "media": colors.HexColor("#D97706"),
    "baixa": colors.HexColor("#2563EB"),
    "informativa": colors.HexColor("#64748B"),
    "forte": colors.HexColor("#059669"),
}

HEX = {k: v.hexval().replace("0x", "#") for k, v in COR.items()}

TINTA = colors.HexColor("#0F172A")
GRAFITE = colors.HexColor("#475569")
LINHA = colors.HexColor("#CBD5E1")
FUNDO_SUAVE = colors.HexColor("#F1F5F9")
FUNDO_CODIGO = colors.HexColor("#F8FAFC")

ROTULO = {
    "critica": "CRÍTICA",
    "alta": "ALTA",
    "media": "MÉDIA",
    "baixa": "BAIXA",
    "informativa": "INFORMATIVA",
}

ORDEM = ["critica", "alta", "media", "baixa", "informativa"]

LARGURA_UTIL = A4[0] - 4 * cm  # margens de 2 cm de cada lado

TITULO_RELATORIO = "Relatório de Auditoria de Segurança"


# --------------------------------------------------------------- estilos ----


def montar_estilos():
    base = getSampleStyleSheet()
    e = {}

    e["capa_selo"] = ParagraphStyle(
        "capa_selo", parent=base["Normal"], fontName="Helvetica-Bold",
        fontSize=9.5, leading=13, textColor=colors.white, alignment=TA_CENTER,
    )
    e["capa_titulo"] = ParagraphStyle(
        "capa_titulo", parent=base["Title"], fontName="Helvetica-Bold",
        fontSize=25, leading=31, textColor=TINTA, alignment=TA_CENTER,
        spaceBefore=0, spaceAfter=0,
    )
    e["capa_projeto"] = ParagraphStyle(
        "capa_projeto", parent=base["Normal"], fontName="Helvetica-Bold",
        fontSize=17, leading=22, textColor=COR["critica"], alignment=TA_CENTER,
    )
    e["capa_sub"] = ParagraphStyle(
        "capa_sub", parent=base["Normal"], fontName="Helvetica", fontSize=10.5,
        leading=15, textColor=GRAFITE, alignment=TA_CENTER,
    )

    e["h1"] = ParagraphStyle(
        "h1", parent=base["Heading1"], fontName="Helvetica-Bold", fontSize=16,
        leading=20, textColor=TINTA, spaceBefore=2, spaceAfter=9,
    )
    e["h2"] = ParagraphStyle(
        "h2", parent=base["Heading2"], fontName="Helvetica-Bold", fontSize=12,
        leading=15.5, textColor=TINTA, spaceBefore=13, spaceAfter=6,
    )
    e["h3"] = ParagraphStyle(
        "h3", parent=base["Heading3"], fontName="Helvetica-Bold", fontSize=10,
        leading=13.5, textColor=GRAFITE, spaceBefore=9, spaceAfter=4,
    )

    e["corpo"] = ParagraphStyle(
        "corpo", parent=base["Normal"], fontName="Helvetica", fontSize=9.3,
        leading=13.6, textColor=TINTA, alignment=TA_JUSTIFY, spaceAfter=5,
    )
    e["corpo_menor"] = ParagraphStyle(
        "corpo_menor", parent=e["corpo"], fontSize=8.5, leading=12.2,
    )
    e["celula"] = ParagraphStyle(
        "celula", parent=base["Normal"], fontName="Helvetica", fontSize=8,
        leading=11, textColor=TINTA, alignment=TA_JUSTIFY,
    )
    e["celula_mono"] = ParagraphStyle(
        "celula_mono", parent=base["Normal"], fontName="Courier", fontSize=7.4,
        leading=10, textColor=TINTA,
    )
    e["cabecalho_tabela"] = ParagraphStyle(
        "cabecalho_tabela", parent=base["Normal"], fontName="Helvetica-Bold",
        fontSize=8.2, leading=11, textColor=colors.white,
    )
    e["chip"] = ParagraphStyle(
        "chip", parent=base["Normal"], fontName="Helvetica-Bold", fontSize=7.4,
        leading=9.5, textColor=colors.white, alignment=TA_CENTER,
    )
    e["codigo"] = ParagraphStyle(
        "codigo", parent=base["Normal"], fontName="Courier", fontSize=7.2,
        leading=9.6, textColor=colors.HexColor("#1E293B"),
    )
    e["issue"] = ParagraphStyle(
        "issue", parent=base["Normal"], fontName="Courier", fontSize=7.1,
        leading=9.7, textColor=colors.HexColor("#0F172A"),
    )
    e["delimitador"] = ParagraphStyle(
        "delimitador", parent=base["Normal"], fontName="Courier-Bold",
        fontSize=8, leading=11, textColor=COR["critica"],
    )
    e["legenda"] = ParagraphStyle(
        "legenda", parent=base["Normal"], fontName="Helvetica-Oblique",
        fontSize=7.8, leading=10.5, textColor=GRAFITE, alignment=TA_CENTER,
    )
    return e


# ------------------------------------------------------------ utilitários ----


def esc(texto: str) -> str:
    """Escapa para o mini-HTML do reportlab."""
    return (
        str(texto)
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
    )


def mono(texto: str) -> str:
    """Escapa e preserva espaços e quebras em fonte monoespaçada.

    Linhas vazias viram &nbsp; para que sobrevivam à quebra de página: o
    reportlab descarta um <br/> solto no início ou no fim de um parágrafo,
    o que apagaria as linhas em branco do Markdown nas bordas dos pedaços.
    """
    linhas = [esc(l).replace(" ", "&nbsp;") or "&nbsp;"
              for l in texto.split("\n")]
    return "<br/>".join(linhas)


def quebrar_monoespaco(texto: str, largura: int) -> str:
    """Quebra linhas longas de código para não estourar a caixa."""
    saida = []
    for linha in texto.split("\n"):
        while len(linha) > largura:
            corte = linha.rfind(" ", 0, largura)
            if corte < largura // 2:
                corte = largura
            saida.append(linha[:corte])
            linha = "  " + linha[corte:].lstrip()
        saida.append(linha)
    return "\n".join(saida)


def fatiar_markdown(texto: str, maximo=26):
    """Divide o Markdown em pedaços curtos que cabem numa página.

    Cada pedaço vira uma linha de tabela; como tabelas quebram entre linhas,
    uma issue longa se distribui por várias páginas sem estourar o quadro.
    """
    pedacos, atual = [], []
    for linha in texto.split("\n"):
        atual.append(linha)
        fim_de_bloco = linha.strip() == "" and len(atual) >= 6
        if fim_de_bloco or len(atual) >= maximo:
            pedacos.append("\n".join(atual))
            atual = []
    if atual:
        pedacos.append("\n".join(atual))
    return pedacos or [texto]


def sem_acento(texto: str) -> str:
    return "".join(
        c for c in unicodedata.normalize("NFD", texto)
        if unicodedata.category(c) != "Mn"
    )


def caixa_codigo(trecho: str, estilos, largura=None, colunas=96):
    """Bloco de código com fundo e borda, para evidências."""
    largura = largura or LARGURA_UTIL
    p = Paragraph(mono(quebrar_monoespaco(trecho, colunas)), estilos["codigo"])
    t = Table([[p]], colWidths=[largura])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), FUNDO_CODIGO),
        ("BOX", (0, 0), (-1, -1), 0.5, LINHA),
        ("LINEBEFORE", (0, 0), (0, -1), 2.2, colors.HexColor("#94A3B8")),
        ("LEFTPADDING", (0, 0), (-1, -1), 7),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ]))
    return t


def chip(severidade, estilos, largura=2.05 * cm):
    """Chip colorido de severidade."""
    p = Paragraph(ROTULO[severidade], estilos["chip"])
    t = Table([[p]], colWidths=[largura], rowHeights=[0.46 * cm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), COR[severidade]),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("LEFTPADDING", (0, 0), (-1, -1), 1),
        ("RIGHTPADDING", (0, 0), (-1, -1), 1),
        ("TOPPADDING", (0, 0), (-1, -1), 2),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
    ]))
    return t


# --------------------------------------------------------------- gráficos ----


def grafico_rosca(contagem, caminho):
    rotulos, valores, cores = [], [], []
    for sev in ORDEM:
        if contagem.get(sev):
            rotulos.append(f"{ROTULO[sev].title()}\n{contagem[sev]}")
            valores.append(contagem[sev])
            cores.append(HEX[sev])

    fig, ax = plt.subplots(figsize=(4.5, 3.5), dpi=220)
    cunhas, textos, autotextos = ax.pie(
        valores, labels=rotulos, colors=cores, startangle=90,
        autopct=lambda p: f"{p:.0f}%", pctdistance=0.76,
        wedgeprops=dict(width=0.42, edgecolor="white", linewidth=2.2),
        textprops=dict(fontsize=8.8, color="#0F172A"),
    )
    for at in autotextos:
        at.set_color("white")
        at.set_fontweight("bold")
        at.set_fontsize(8.4)
    for t in textos:
        t.set_fontweight("bold")

    total = sum(valores)
    ax.text(0, 0.1, str(total), ha="center", va="center",
            fontsize=21, fontweight="bold", color="#0F172A")
    ax.text(0, -0.22, "achados", ha="center", va="center",
            fontsize=8.5, color="#475569")
    ax.set_aspect("equal")
    fig.tight_layout(pad=0.3)
    fig.savefig(caminho, transparent=True, bbox_inches="tight")
    plt.close(fig)


def grafico_barras(por_categoria, caminho):
    categorias = list(por_categoria.keys())
    rotulos = [c.split(". ", 1)[1] if ". " in c else c for c in categorias]
    rotulos = [r.replace(" ", "\n", 1) if len(r) > 18 else r for r in rotulos]

    fig, ax = plt.subplots(figsize=(7.0, 3.3), dpi=220)
    base = [0] * len(categorias)

    for sev in ORDEM:
        valores = [por_categoria[c].get(sev, 0) for c in categorias]
        if not any(valores):
            continue
        ax.bar(rotulos, valores, bottom=base, color=HEX[sev],
               label=ROTULO[sev].title(), width=0.58,
               edgecolor="white", linewidth=1.1)
        for i, v in enumerate(valores):
            if v:
                ax.text(i, base[i] + v / 2, str(v), ha="center", va="center",
                        color="white", fontsize=8.6, fontweight="bold")
        base = [b + v for b, v in zip(base, valores)]

    for i, total in enumerate(base):
        ax.text(i, total + 0.14, str(total), ha="center", va="bottom",
                fontsize=9, fontweight="bold", color="#0F172A")

    ax.set_ylim(0, max(base) + 1.2)
    ax.spines[["top", "right", "left"]].set_visible(False)
    ax.spines["bottom"].set_color("#CBD5E1")
    ax.tick_params(axis="x", labelsize=8.2, colors="#0F172A", length=0)
    ax.tick_params(axis="y", labelsize=8, colors="#64748B", length=0)
    ax.yaxis.grid(True, color="#E2E8F0", linewidth=0.8)
    ax.set_axisbelow(True)
    ax.set_ylabel("Achados", fontsize=8.5, color="#475569")
    ax.legend(loc="upper right", frameon=False, fontsize=8, ncol=2)
    fig.tight_layout(pad=0.4)
    fig.savefig(caminho, transparent=True, bbox_inches="tight")
    plt.close(fig)


# ------------------------------------------------- cabeçalho e rodapé -------


def decorar_pagina(canvas, doc):
    canvas.saveState()
    largura, altura = A4

    canvas.setFont("Helvetica", 7.6)
    canvas.setFillColor(GRAFITE)
    canvas.drawString(2 * cm, altura - 1.25 * cm,
                      f"{TITULO_RELATORIO} — Tech Hub")
    canvas.drawRightString(largura - 2 * cm, altura - 1.25 * cm,
                           "Confidencial")
    canvas.setStrokeColor(LINHA)
    canvas.setLineWidth(0.5)
    canvas.line(2 * cm, altura - 1.42 * cm, largura - 2 * cm, altura - 1.42 * cm)

    canvas.line(2 * cm, 1.42 * cm, largura - 2 * cm, 1.42 * cm)
    canvas.setFont("Helvetica", 7.6)
    canvas.drawString(2 * cm, 1.05 * cm, "relatorio-auditoria-seguranca.pdf")
    canvas.setFont("Helvetica-Bold", 8)
    canvas.setFillColor(TINTA)
    canvas.drawRightString(largura - 2 * cm, 1.05 * cm, f"Página {doc.page}")

    canvas.restoreState()


def decorar_capa(canvas, doc):
    canvas.saveState()
    largura, altura = A4
    canvas.setFillColor(COR["critica"])
    canvas.rect(0, altura - 0.52 * cm, largura, 0.52 * cm, stroke=0, fill=1)
    canvas.setFillColor(TINTA)
    canvas.rect(0, 0, largura, 0.52 * cm, stroke=0, fill=1)
    canvas.restoreState()


# ------------------------------------------------------------- seções -------


def bloco_capa(d, e):
    s = [Spacer(1, 0.35 * cm)]

    selo = Table(
        [[Paragraph("AUDITORIA DE SEGURANÇA DE APLICAÇÃO", e["capa_selo"])]],
        colWidths=[8.6 * cm], rowHeights=[0.66 * cm],
    )
    selo.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), TINTA),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
    ]))
    s += [selo, Spacer(1, 0.6 * cm)]

    s.append(Paragraph(TITULO_RELATORIO, e["capa_titulo"]))
    s.append(Spacer(1, 0.34 * cm))
    s.append(Paragraph(esc(d["projeto"]), e["capa_projeto"]))
    s.append(Spacer(1, 0.7 * cm))

    regua = Table([[""]], colWidths=[4.4 * cm], rowHeights=[2.6])
    regua.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), COR["critica"]),
    ]))
    s += [regua, Spacer(1, 0.5 * cm)]

    hoje = date.today()
    meses = ["janeiro", "fevereiro", "março", "abril", "maio", "junho",
             "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"]
    data_txt = f"{hoje.day} de {meses[hoje.month - 1]} de {hoje.year}"

    st = d["stack"]
    ident = [
        ("Data da auditoria", data_txt),
        ("Repositório", f"{d['repositorio']} · branch {d['branch']} · commit {d['commit']}"),
        ("Linguagem", st["linguagem"]),
        ("Framework", st["framework"]),
        ("ORM / acesso a dados", st["orm"]),
        ("Autenticação", st["auth"]),
        ("Frontend", st["frontend"]),
        ("Deploy / infraestrutura", st["deploy"]),
    ]
    linhas = [[Paragraph(f"<b>{esc(k)}</b>", e["celula"]),
               Paragraph(esc(v), e["celula"])] for k, v in ident]
    t = Table(linhas, colWidths=[4.3 * cm, LARGURA_UTIL - 4.3 * cm])
    t.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LINEBELOW", (0, 0), (-1, -2), 0.4, LINHA),
        ("TOPPADDING", (0, 0), (-1, -1), 3.5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3.5),
        ("LEFTPADDING", (0, 0), (0, -1), 0),
        ("BACKGROUND", (0, 0), (0, -1), colors.white),
    ]))
    s += [t, Spacer(1, 0.3 * cm)]

    s.append(Paragraph("Escopo auditado", e["h3"]))
    itens = "".join(f"&bull;&nbsp; {esc(i)}<br/>" for i in d["escopo"])
    s.append(Paragraph(itens, e["corpo_menor"]))
    s.append(Spacer(1, 0.2 * cm))

    s.append(Paragraph("Nota metodológica", e["h3"]))
    s.append(Paragraph(
        "As cinco categorias do roteiro foram mapeadas para os equivalentes "
        "desta stack antes da varredura. Nenhum achado abaixo é especulativo: "
        "todos foram lidos no código-fonte, com arquivo e linha.",
        e["corpo_menor"],
    ))
    linhas_m = [[Paragraph(f"<b>{esc(cat)}</b>", e["celula"]),
                 Paragraph(esc(txt), e["celula"])] for cat, txt in d["metodologia"]]
    tm = Table(linhas_m, colWidths=[4.3 * cm, LARGURA_UTIL - 4.3 * cm])
    tm.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LINEBELOW", (0, 0), (-1, -2), 0.4, LINHA),
        ("TOPPADDING", (0, 0), (-1, -1), 3.5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3.5),
        ("LEFTPADDING", (0, 0), (0, -1), 0),
    ]))
    s.append(tm)
    return s


def bloco_resumo(d, e, contagem, por_categoria):
    s = [Paragraph("Resumo executivo", e["h1"])]

    total = sum(contagem.values())
    criticas = contagem.get("critica", 0)
    altas = contagem.get("alta", 0)

    s.append(Paragraph(
        f"A auditoria percorreu os <b>{len(d['cobertura'])} recursos de API</b> do "
        f"projeto, handler por handler, e registrou <b>{total} achados</b>, dos quais "
        f"<b>{criticas} críticos</b> e <b>{altas} altos</b>. "
        "Os achados não são independentes: quase todos derivam de um único defeito "
        "estrutural — <b>não existe sessão autenticada no servidor</b>. Sem cookie, "
        "sem token assinado e sem <font face=\"Courier\">middleware.ts</font>, nenhum "
        "route handler consegue saber quem está chamando, e por isso nenhum deles "
        "consegue filtrar, autorizar ou verificar posse. As duas funções de privilégio "
        "que existem em <font face=\"Courier\">lib/permissoes.ts</font> estão escritas "
        "corretamente, mas recebem a identidade do próprio corpo ou da query string da "
        "requisição — ou seja, do atacante.",
        e["corpo"],
    ))
    s.append(Paragraph(
        "A consequência prática é que dinheiro real é alcançável por um anônimo: o "
        "saque PIX, a quitação de dívida sem pagamento e a leitura do saldo da loja "
        "formam uma cadeia completa de fraude financeira. Em contrapartida, a auditoria "
        "também encontrou um projeto bem construído nas dimensões que não dependem de "
        "sessão: zero SQL bruto, zero superfície de injeção de HTML, mascaramento "
        "consistente de CPF, webhook com comparação em tempo constante e nenhum segredo "
        "no histórico git ou no bundle do cliente.",
        e["corpo"],
    ))
    s.append(Spacer(1, 0.3 * cm))

    # Faixa de contagem por severidade: número e rótulo na mesma célula, para
    # que nunca se sobreponham.
    sevs = [s_ for s_ in ORDEM if contagem.get(s_)]
    celulas, estilo = [], [
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("LINEAFTER", (0, 0), (-2, -1), 2.2, colors.white),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]
    for i, sev in enumerate(sevs):
        celulas.append(Paragraph(
            f'<font size="20" color="white"><b>{contagem[sev]}</b></font><br/>'
            f'<font size="7.4" color="white">{ROTULO[sev]}</font>',
            e["chip"]))
        estilo.append(("BACKGROUND", (i, 0), (i, 0), COR[sev]))

    larg = LARGURA_UTIL / len(sevs)
    tf = Table([celulas], colWidths=[larg] * len(sevs), rowHeights=[1.5 * cm])
    tf.setStyle(TableStyle(estilo))
    s += [tf, Spacer(1, 0.6 * cm)]

    rosca = Image(os.path.join(GRAFICOS, "rosca.png"), width=7.2 * cm, height=5.6 * cm)
    rosca.hAlign = "CENTER"
    barras = Image(os.path.join(GRAFICOS, "barras.png"), width=16.6 * cm, height=7.4 * cm)
    barras.hAlign = "CENTER"

    # KeepTogether impede que a legenda fique órfã numa página seguinte.
    s.append(KeepTogether([
        Paragraph("Distribuição por severidade", e["h2"]),
        rosca,
        Paragraph(
            "Paleta: crítica #B91C1C · alta #EA580C · média #D97706 · "
            "baixa #2563EB · informativa #64748B", e["legenda"]),
    ]))
    s.append(Spacer(1, 0.5 * cm))

    s.append(KeepTogether([
        Paragraph("Achados por categoria do roteiro", e["h2"]),
        barras,
        Paragraph(
            "Barras empilhadas por severidade. A categoria 5 (XSS) concentra os achados "
            "mais leves porque o projeto não possui nenhuma injeção de HTML.",
            e["legenda"]),
    ]))
    return s


def bloco_cobertura(d, e):
    s = [Paragraph("Cobertura da auditoria", e["h1"])]
    s.append(Paragraph(
        "Todos os route handlers do backend foram percorridos individualmente. "
        "A tabela abaixo é a prova de cobertura: nenhuma rota foi amostrada.",
        e["corpo"],
    ))
    s.append(Spacer(1, 0.2 * cm))

    cab = [Paragraph(t, e["cabecalho_tabela"]) for t in
           ["Rota", "Métodos", "Situação", "Observação"]]
    linhas = [cab]
    estilo = [
        ("BACKGROUND", (0, 0), (-1, 0), TINTA),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("GRID", (0, 0), (-1, -1), 0.4, LINHA),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]

    for i, (rota, metodos, situacao, obs) in enumerate(d["cobertura"], start=1):
        ok = situacao == "ok"
        parcial = situacao == "parcial"
        cor_sit = COR["forte"] if ok else (COR["media"] if parcial else COR["critica"])
        texto_sit = "PROTEGIDA" if ok else ("PARCIAL" if parcial else "EXPOSTA")
        linhas.append([
            Paragraph(esc(rota), e["celula_mono"]),
            Paragraph(esc(metodos), e["celula"]),
            Paragraph(f'<font color="{cor_sit.hexval().replace("0x", "#")}">'
                      f"<b>{texto_sit}</b></font>", e["celula"]),
            Paragraph(esc(obs), e["celula"]),
        ])
        if i % 2 == 0:
            estilo.append(("BACKGROUND", (0, i), (-1, i), FUNDO_SUAVE))

    t = Table(linhas, colWidths=[5.9 * cm, 3.3 * cm, 2.3 * cm,
                                 LARGURA_UTIL - 11.5 * cm], repeatRows=1)
    t.setStyle(TableStyle(estilo))
    s.append(t)

    s.append(Spacer(1, 0.45 * cm))
    s.append(Paragraph("Mecanismo de isolamento do projeto", e["h2"]))
    aviso = Table(
        [[Paragraph(esc(d["mecanismo_isolamento"]), e["celula"])]],
        colWidths=[LARGURA_UTIL],
    )
    aviso.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#FEF2F2")),
        ("BOX", (0, 0), (-1, -1), 0.5, COR["critica"]),
        ("LINEBEFORE", (0, 0), (0, -1), 3, COR["critica"]),
        ("LEFTPADDING", (0, 0), (-1, -1), 9),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
    ]))
    s.append(aviso)
    return s


def bloco_fortes_fracos(d, e):
    s = [Paragraph("Pontos fortes e pontos fracos", e["h1"])]

    s.append(Paragraph("O que está protegido", e["h2"]))
    s.append(Paragraph(
        "Verificado no código e confirmado correto. Esta seção também comprova a "
        "extensão da varredura.", e["corpo"]))

    for pf in d["pontos_fortes"]:
        cabeca = Paragraph(
            f'<font color="{HEX["forte"]}"><b>&#10003; {esc(pf["titulo"])}</b></font>'
            f'<br/><font face="Courier" size="7.2" color="#475569">'
            f'{esc(pf["evidencia"])}</font>',
            e["celula"])
        corpo = Paragraph(esc(pf["detalhe"]), e["celula"])
        t = Table([[cabeca], [corpo]], colWidths=[LARGURA_UTIL])
        t.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#F0FDF4")),
            ("LINEBEFORE", (0, 0), (0, -1), 2.6, COR["forte"]),
            ("LEFTPADDING", (0, 0), (-1, -1), 9),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
            ("TOPPADDING", (0, 0), (-1, 0), 6),
            ("BOTTOMPADDING", (0, 0), (-1, 0), 2),
            ("TOPPADDING", (0, 1), (-1, 1), 0),
            ("BOTTOMPADDING", (0, 1), (-1, 1), 6),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ]))
        s += [KeepTogether([t, Spacer(1, 0.18 * cm)])]

    s.append(Spacer(1, 0.35 * cm))
    s.append(Paragraph("Os riscos centrais", e["h2"]))

    linhas = []
    for i, pt in enumerate(d["pontos_fracos"], start=1):
        linhas.append([
            Paragraph(f'<font color="{HEX["critica"]}"><b>{i}</b></font>', e["celula"]),
            Paragraph(esc(pt), e["celula"]),
        ])
    t = Table(linhas, colWidths=[0.9 * cm, LARGURA_UTIL - 0.9 * cm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#FEF2F2")),
        ("LINEBEFORE", (0, 0), (0, -1), 2.6, COR["critica"]),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("ALIGN", (0, 0), (0, -1), "CENTER"),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LINEBELOW", (0, 0), (-1, -2), 0.4, colors.HexColor("#FECACA")),
    ]))
    s.append(t)
    return s


def bloco_achados(d, e):
    s = [Paragraph("Achados detalhados", e["h1"])]
    s.append(Paragraph(
        "Agrupados pelas cinco categorias do roteiro e ordenados por severidade. "
        "Cada achado traz arquivo, linhas exatas, trecho de código, por que é "
        "explorável, impacto e condição de explorabilidade.", e["corpo"]))

    ordem_cat = []
    for a in d["achados"]:
        if a["categoria"] not in ordem_cat:
            ordem_cat.append(a["categoria"])
    ordem_cat.sort()

    for categoria in ordem_cat:
        achados = [a for a in d["achados"] if a["categoria"] == categoria]
        achados.sort(key=lambda a: ORDEM.index(a["severidade"]))

        faixa = Table([[Paragraph(
            f'<font color="white" size="11"><b>{esc(categoria.upper())}</b></font>',
            e["celula"])]], colWidths=[LARGURA_UTIL])
        faixa.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), TINTA),
            ("LEFTPADDING", (0, 0), (-1, -1), 9),
            ("TOPPADDING", (0, 0), (-1, -1), 7),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ]))
        s += [Spacer(1, 0.4 * cm), faixa, Spacer(1, 0.3 * cm)]

        # Tabela-resumo da categoria: Severidade | Arquivo:linha | Descrição.
        cab = [Paragraph(t, e["cabecalho_tabela"]) for t in
               ["Severidade", "Arquivo:linha", "Descrição"]]
        linhas = [cab]
        estilo = [
            ("BACKGROUND", (0, 0), (-1, 0), GRAFITE),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("GRID", (0, 0), (-1, -1), 0.4, LINHA),
            ("LEFTPADDING", (0, 0), (-1, -1), 5),
            ("RIGHTPADDING", (0, 0), (-1, -1), 5),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ]
        for i, a in enumerate(achados, start=1):
            primeiro = a["arquivos"][0]
            ref = f'{primeiro["caminho"]}:{primeiro["linhas"]}'
            if len(a["arquivos"]) > 1:
                ref += f'  (+{len(a["arquivos"]) - 1})'
            linhas.append([
                chip(a["severidade"], e, largura=2.0 * cm),
                Paragraph(esc(ref), e["celula_mono"]),
                Paragraph(f'<b>{esc(a["id"])}</b> — {esc(a["titulo"])}', e["celula"]),
            ])
            if i % 2 == 0:
                estilo.append(("BACKGROUND", (1, i), (-1, i), FUNDO_SUAVE))

        t = Table(linhas, colWidths=[2.35 * cm, 5.9 * cm,
                                     LARGURA_UTIL - 8.25 * cm], repeatRows=1)
        t.setStyle(TableStyle(estilo))
        s += [t, Spacer(1, 0.35 * cm)]

        # Ficha completa de cada achado.
        for a in achados:
            ficha = [Spacer(1, 0.12 * cm)]
            titulo = Table(
                [[chip(a["severidade"], e, largura=2.0 * cm),
                  Paragraph(f'<b>{esc(a["id"])}</b> &nbsp; {esc(a["titulo"])}',
                            e["celula"])]],
                colWidths=[2.35 * cm, LARGURA_UTIL - 2.35 * cm],
            )
            titulo.setStyle(TableStyle([
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING", (0, 0), (0, -1), 0),
                ("LEFTPADDING", (1, 0), (1, -1), 7),
                ("TOPPADDING", (0, 0), (-1, -1), 3),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
                ("LINEBELOW", (0, 0), (-1, -1), 1.1, COR[a["severidade"]]),
            ]))
            ficha += [titulo, Spacer(1, 0.2 * cm)]

            ficha.append(Paragraph("Evidência no código", e["h3"]))
            for arq in a["arquivos"]:
                ficha.append(Paragraph(
                    f'<font face="Courier" size="7.8" color="#0F172A"><b>'
                    f'{esc(arq["caminho"])}:{esc(arq["linhas"])}</b></font>',
                    e["celula"]))
                ficha.append(Spacer(1, 0.08 * cm))
                ficha.append(caixa_codigo(arq["trecho"], e))
                ficha.append(Spacer(1, 0.16 * cm))

            ficha.append(Paragraph("Por que é explorável", e["h3"]))
            ficha.append(Paragraph(esc(a["porque"]), e["corpo_menor"]))
            ficha.append(Paragraph("Impacto", e["h3"]))
            ficha.append(Paragraph(esc(a["impacto"]), e["corpo_menor"]))
            ficha.append(Paragraph("Condição de explorabilidade", e["h3"]))
            ficha.append(Paragraph(esc(a["condicao"]), e["corpo_menor"]))
            ficha.append(Spacer(1, 0.3 * cm))

            s += ficha

    return s


def bloco_recomendacoes(d, e):
    s = [Paragraph("Recomendações priorizadas", e["h1"])]
    s.append(Paragraph(
        "A ordem importa: a prioridade P1 estabelece a sessão no servidor, sem a qual "
        "as demais correções de autorização não são implementáveis.", e["corpo"]))

    cores_p = {"P1": COR["critica"], "P2": COR["alta"], "P3": COR["baixa"]}

    for rec in d["recomendacoes"]:
        cor = cores_p.get(rec["prioridade"], GRAFITE)
        cabeca = Table(
            [[Paragraph(f'<font color="white" size="11"><b>{rec["prioridade"]}</b></font>',
                        e["chip"]),
              Paragraph(f'<b>{esc(rec["prazo"])}</b>', e["celula"])]],
            colWidths=[1.5 * cm, LARGURA_UTIL - 1.5 * cm],
        )
        cabeca.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (0, -1), cor),
            ("BACKGROUND", (1, 0), (1, -1), FUNDO_SUAVE),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("LEFTPADDING", (1, 0), (1, -1), 8),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ]))

        linhas = [[Paragraph(f'<font color="{cor.hexval().replace("0x", "#")}">'
                             f"<b>&#9656;</b></font>", e["celula"]),
                   Paragraph(esc(item), e["celula"])]
                  for item in rec["itens"]]
        corpo = Table(linhas, colWidths=[0.7 * cm, LARGURA_UTIL - 0.7 * cm])
        corpo.setStyle(TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 7),
            ("RIGHTPADDING", (0, 0), (-1, -1), 7),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ("LINEBELOW", (0, 0), (-1, -2), 0.4, LINHA),
            ("BOX", (0, 0), (-1, -1), 0.5, LINHA),
        ]))
        s += [KeepTogether([cabeca, corpo]), Spacer(1, 0.4 * cm)]

    return s


def bloco_issues(d, e):
    s = [Paragraph("Issues para o GitHub", e["h1"])]
    s.append(Paragraph(
        f"As {len(d['issues'])} issues abaixo estão prontas para copiar e colar. "
        "Achados triviais relacionados foram agrupados numa issue única para não "
        "gerar ruído no backlog. Cada bloco vai do delimitador de abertura ao de "
        "fechamento; o conteúdo entre eles é Markdown.", e["corpo"]))
    s.append(Paragraph(
        "<b>Ordem sugerida de execução:</b> issue 7 primeiro (sessão no servidor), "
        "pois as issues 2, 3, 4, 5, 6 e 8 dependem dela. As issues 1, 9 e 10 são "
        "independentes e podem correr em paralelo.", e["corpo"]))
    s.append(Spacer(1, 0.25 * cm))

    for issue in d["issues"]:
        n = issue["n"]
        partes = []

        partes.append(Paragraph(f"--- ISSUE {n} ---", e["delimitador"]))
        partes.append(Spacer(1, 0.14 * cm))

        md = []
        md.append(f'# {issue["titulo"]}')
        md.append("")
        md.append(f'**Labels:** `{issue["labels"]}`')
        md.append("")
        md.append("## Problema")
        md.append("")
        md.append(issue["problema"])
        md.append("")
        md.append("## Evidência")
        md.append("")
        md.append(issue["evidencia"])
        md.append("")
        md.append("## Impacto")
        md.append("")
        md.append(issue["impacto"])
        md.append("")
        md.append("## Sugestão de correção")
        md.append("")
        md.append(issue["correcao"])
        md.append("")
        md.append("## Critérios de aceite")
        md.append("")
        for c in issue["criterios"]:
            md.append(f"- [ ] {c}")

        texto = quebrar_monoespaco("\n".join(md), 98)

        # Uma linha de tabela por bloco lógico: tabelas quebram entre linhas,
        # então uma issue longa se divide entre páginas em vez de estourar.
        linhas = [[Paragraph(mono(pedaco), e["issue"])]
                  for pedaco in fatiar_markdown(texto)]

        caixa = Table(linhas, colWidths=[LARGURA_UTIL], repeatRows=0)
        caixa.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), FUNDO_CODIGO),
            ("BOX", (0, 0), (-1, -1), 0.6, LINHA),
            ("LINEBEFORE", (0, 0), (0, -1), 2.6, COR["critica"]),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("RIGHTPADDING", (0, 0), (-1, -1), 7),
            ("TOPPADDING", (0, 0), (0, 0), 7),
            ("BOTTOMPADDING", (0, -1), (-1, -1), 7),
            ("TOPPADDING", (0, 1), (-1, -1), 0),
            ("BOTTOMPADDING", (0, 0), (-1, -2), 0),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ]))
        partes.append(caixa)
        partes.append(Spacer(1, 0.14 * cm))
        partes.append(Paragraph(f"--- FIM ISSUE {n} ---", e["delimitador"]))
        partes.append(Spacer(1, 0.55 * cm))

        s += partes

    return s


# ------------------------------------------------------------------ main ----


def main():
    with open(DADOS, encoding="utf-8") as f:
        d = json.load(f)

    os.makedirs(GRAFICOS, exist_ok=True)

    contagem = {}
    por_categoria = {}
    for a in d["achados"]:
        contagem[a["severidade"]] = contagem.get(a["severidade"], 0) + 1
        cat = a["categoria"]
        por_categoria.setdefault(cat, {})
        por_categoria[cat][a["severidade"]] = \
            por_categoria[cat].get(a["severidade"], 0) + 1
    por_categoria = dict(sorted(por_categoria.items()))

    grafico_rosca(contagem, os.path.join(GRAFICOS, "rosca.png"))
    grafico_barras(por_categoria, os.path.join(GRAFICOS, "barras.png"))

    e = montar_estilos()

    doc = BaseDocTemplate(
        SAIDA, pagesize=A4,
        leftMargin=2 * cm, rightMargin=2 * cm,
        topMargin=2 * cm, bottomMargin=2 * cm,
        title=f"{TITULO_RELATORIO} — {d['projeto']}",
        author="Auditoria de segurança de aplicação",
        subject="Controle de acesso, isolamento de dados, IDOR, segredos e XSS",
    )
    quadro = Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height,
                   id="normal", leftPadding=0, rightPadding=0,
                   topPadding=0, bottomPadding=0)
    doc.addPageTemplates([
        PageTemplate(id="capa", frames=[quadro], onPage=decorar_capa),
        PageTemplate(id="miolo", frames=[quadro], onPage=decorar_pagina),
    ])

    historia = []
    historia += [NextPageTemplate("miolo")]
    historia += bloco_capa(d, e)
    historia.append(PageBreak())
    historia += bloco_resumo(d, e, contagem, por_categoria)
    historia.append(PageBreak())
    historia += bloco_cobertura(d, e)
    historia.append(PageBreak())
    historia += bloco_fortes_fracos(d, e)
    historia.append(PageBreak())
    historia += bloco_achados(d, e)
    historia.append(PageBreak())
    historia += bloco_recomendacoes(d, e)
    historia.append(PageBreak())
    historia += bloco_issues(d, e)

    doc.build(historia)

    print(f"PDF gerado: {SAIDA}")
    print(f"Achados: {sum(contagem.values())} "
          f"({', '.join(f'{ROTULO[k].lower()} {contagem[k]}' for k in ORDEM if contagem.get(k))})")
    print(f"Issues: {len(d['issues'])}")


if __name__ == "__main__":
    main()
