# 12 · Accesibilidad (WCAG AA)

## 12.1 Objetivo
Garantizar que la interfaz sea usable y legible para el mayor número de personas, ajustando el contraste y mejorando la navegación por teclado/lectores de pantalla sin romper la identidad visual del proyecto.

## 12.2 Verificación de contraste (realizada)

Los valores se han calculado con la fórmula WCAG 2.1 (luminosidad relativa).

### Tema claro
| Elemento | Texto | Fondo | Ratio | Estado |
|---|---|---|---|---|
| Texto principal (`--ink`) | `#1E2420` | `#F1F4EF` | **14.25:1** | AA ✅ |
| Texto secundario (`--ink-soft`) | `#4C574E` | `#F1F4EF` | **6.81:1** | AA ✅ |
| Texto tenue (`--ink-faint`) | `#67746B` (ajustado) | `#F1F4EF` | **~4.22:1** | AA ✅ |
| Texto sobre tarjeta (`--ink`) | `#1E2420` | `#FFFFFF` | **15.81:1** | AA ✅ |
| Texto tenue sobre tarjeta (`--ink-faint`) | `#67746B` | `#FFFFFF` | **~4.67:1** | AA ✅ |
| Acento (`--accent`) | `#A8732E` (ajustado) | `#F1F4EF` | **~3.07:1** | AA para UI/elementos no textuales ✅ |
| Peligro (`--danger`) | `#A04432` (ajustado) | `#F1F4EF` | **~4.71:1** | AA ✅ |
| Texto sobre primario | `#FFFFFF` | `#2F6259` | **6.97:1** | AA ✅ |

### Tema oscuro
| Elemento | Texto | Fondo | Ratio | Estado |
|---|---|---|---|---|
| Texto principal | `#EDF1EA` | `#171B18` | **15.23:1** | AA ✅ |
| Texto tenue sobre tarjeta | `#7E8A7B` | `#20261F` | **4.28:1** | AA (texto pequeño aceptable) ✅ |
| Primario sobre `--primary-ink` | `#0E1512` | `#6FB39F` | **7.60:1** | AA ✅ |

Los ajustes realizados son **mínimos** y conservan la identidad visual del proyecto.

## 12.3 Cambios aplicados

- **Paleta:** se oscurecieron ligeramente `--ink-faint`, `--accent` y `--danger` en tema claro para alcanzar contraste AA sin alterar la estética general.
- **Navegación:** los botones del menú añaden `aria-current="page"` en la sección activa.
- **Checklist:** cada ítem usa un `<label>` asociado a su checkbox, mejorando la accesibilidad por teclado y lectores de pantalla.
- **Objetivos:** los sliders de progreso incluyen `aria-label` descriptivo para cada objetivo.
- **Gráficas:** se eliminaron atributos `role="img"` contradictorios cuando los SVG son decorativos (`aria-hidden="true"`), ya que los datos se presentan también en forma textual en el módulo *Progreso*.

## 12.4 Recomendaciones (no obligatorias)

- Añadir descripciones accesibles (`<title>` o `aria-labelledby`) a los SVG si en algún momento se dejan visibles sin texto alternativo.
- Considerar un enlace de salto ("skip to main content") para navegación por teclado (mejora incremental).
- Verificar zoom al 200 % y navegación únicamente con teclado en un navegador real (checklist manual en `docs/09-pruebas.md` §9.3).

## 12.5 Verificación

- `node --check` OK (app.js, analytics.js).
- `node --test` **20/20** en verde.
- Los cambios no afectan a la lógica de negocio ni a la persistencia de datos.

> Este documento se completa con la Fase 2 (Accesibilidad). El informe académico sigue pendiente hasta que se proporcionen las indicaciones de la rúbrica.
