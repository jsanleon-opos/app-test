# Plan de Implementación: Estandarización de Puntuaciones al Modelo Oficial en Gráficos KPIs

## Resumen de Cambios

### 1. Conversión de Puntuación Proporcional al Modelo Oficial (70 Preguntas para Tests / 20 para Supuestos)
- **Problema resuelto**: Anteriormente, al realizar tests con diferente número de preguntas (por ejemplo, 10, 20 o 50 preguntas), su puntuación directa (PD) bruta se comparaba directamente con las notas de corte oficiales fijadas sobre el modelo oficial de 70 preguntas (p. ej. corte AGE 2025 de 31,67 PD). Esto provocaba que obtener 10 PD en 20 preguntas (un 50% de acierto neto) pareciese un resultado por debajo del corte, cuando en la escala oficial de 70 preguntas equivale exactamente a **35,00 PD** (superando el corte de 31,67 PD).
- **Fórmula de conversión estandarizada aplicada**:
  $$\text{PD}_{\text{convertida}} = \left(\frac{\text{PD}_{\text{real}}}{\text{Total Preguntas Test}}\right) \times \text{Base Oficial}$$
  - Para tests ordinarios / unitarios: $\text{Base Oficial} = 70$ preguntas.
  - Para supuestos prácticos: $\text{Base Oficial} = 20$ preguntas.
  - Para tests que ya cuenten con 70 preguntas, la puntuación se mantiene idéntica y sin variaciones.

### 2. Dataset y Agrupaciones en Gráfico 2 (`SeccionAnaliticaKPIs.tsx`)
- **Vista por Examen**: Cada barra representa la puntuación convertida al modelo oficial, coloreándose en verde esmeralda (`#10b981`) si supera el corte de la convocatoria o rojo coral (`#f43f5e`) si no lo supera.
- **Vista Día Actual (`hoy`)**: Refleja la puntuación convertida de cada prueba realizada durante el día en curso.
- **Vista Semanal (`semanal`)**:
  - En modo *Cada Test Individual*: se muestran las pruebas con sus notas convertidas.
  - En modo *Día a Día (Media diaria)*: el promedio diario se calcula a partir de las notas ya estandarizadas sobre 70 Q, de modo que la barra de media diaria sea plenamente comparable con la línea de corte de 70 preguntas.
- **Vista Mensual (`mensual`)**: El promedio acumulado de cada mes se computa a partir de las puntuaciones normalizadas.

### 3. Estadísticas Comparativas y Tarjetas Superiores
- Las métricas del bloque de corte (**Tasa de Superación**, **Tu Nota Media**, **Diferencia con el Corte** y **Puntuación Máxima**) calculan sus valores sobre la escala estandarizada oficial, asegurando que la comparativa con el corte de la CPS sea 100% fidedigna e intuitiva.

### 4. Tooltips Detallados y Distintivos Visuales
- **Tooltip personalizado (`CustomTooltipPuntuacion`)**:
  - Destaca la puntuación estandarizada en la cabecera: `PD Estandarizada (70 Q): 35.00 PD [Apto / No apto]`.
  - Muestra un desglose explicativo si el test tenía un número diferente de preguntas:
    `Nota original del test: 10.00 PD (20 preguntas)`.
    `Conversión oficial: (10.00 ÷ 20) × 70 = 35.00 PD`.
  - Refleja la diferencia exacta con la línea de corte: `+3.33 PD`.
- **Cabecera y Banner Informativo**:
  - Distintivo en la cabecera del gráfico: `Escala oficial convertida (Base 70 Q)`.
  - Banner explicativo con icono de calculadora que clarifica al opositor el funcionamiento de la equivalencia oficial automática.
