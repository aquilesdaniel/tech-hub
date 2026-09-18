# Auditoria de segurança — Tech Hub

Relatório da auditoria de controle de acesso, isolamento de dados, IDOR,
segredos e XSS realizada sobre o branch `development` (commit `da61796`).

## Arquivos

| Arquivo | O que é |
| --- | --- |
| `relatorio-auditoria-seguranca.pdf` | O relatório (38 páginas, A4). Inclui as 10 issues prontas para copiar no GitHub. |
| `achados.json` | Os dados da auditoria: achados, evidências, pontos fortes, cobertura, recomendações e issues. **É aqui que se edita o conteúdo.** |
| `gerar_relatorio.py` | Gerador do PDF. Não contém dado algum da auditoria — só layout. |
| `graficos/` | PNGs do gráfico de rosca e de barras, regerados a cada execução. |

## Regerar o relatório

Nada é instalado globalmente: o gerador roda num venv local.

```bash
cd docs/security-audit

# primeira vez
python -m venv .venv
.venv/Scripts/python.exe -m pip install reportlab matplotlib   # Windows
.venv/bin/python -m pip install reportlab matplotlib           # Linux/macOS

# a cada regeneração
.venv/Scripts/python.exe gerar_relatorio.py
```

Para mudar o conteúdo, edite `achados.json` e rode o gerador de novo. Ao
adicionar um achado, use uma das severidades `critica`, `alta`, `media`,
`baixa` ou `informativa` — o gráfico de rosca, o de barras, os chips coloridos
e os totais do resumo executivo são todos derivados desse campo.

## Paleta

| Severidade | Cor |
| --- | --- |
| Crítica | `#B91C1C` |
| Alta | `#EA580C` |
| Média | `#D97706` |
| Baixa | `#2563EB` |
| Informativa | `#64748B` |
| Ponto forte | `#059669` |
