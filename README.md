# Matías Vides · perfil web (SoccerMax)

Página de una sola vista con la ficha, trayectoria, video de jugadas y descarga del PDF.

## Usar

```bash
npm install
npm run dev      # http://localhost:5193
npm run build    # genera dist/ listo para subir a cualquier hosting estático
```

`dist/` funciona en cualquier carpeta o subdominio (rutas relativas).

## Archivos

- `assets/matias-vides-editada.jpg` foto editada en alta calidad
- `assets/Matias-Vides-SoccerMax.pdf` ficha de una página (también en `public/docs/`)
- `pdf/ficha.html` fuente de la ficha. Para regenerar el PDF:

```bash
"/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" --headless=new --no-pdf-header-footer --virtual-time-budget=4000 --print-to-pdf="public/docs/Matias-Vides-SoccerMax.pdf" "file:///D:/Proyectos/unman.ai/matias-vides/pdf/ficha.html"
```

## Librerías

- three + postprocessing: cancha 3D del hero (líneas de cal en partículas, dos trayectorias doradas, bloom y grano)
- @remotion/player + remotion: el video de jugadas como composición (intro, rótulo, marca de agua y cierre)
- lenis: scroll suave
- motion: animaciones ligadas al scroll (ruta del mapa, diagrama de zonas)
- d3-geo: proyección del mapa de Colombia
- Tipografías: Big Shoulders Display + Onest (self-hosted vía Fontsource)

Remotion es gratis para personas y empresas de hasta 3 empleados; empresas más grandes necesitan licencia (remotion.dev/license).
