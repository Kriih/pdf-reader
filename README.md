# Lector PDF

App de Android para leer PDFs **sin conexión**.
La interfaz está hecha en **React Native (Expo)** y el tratamiento de los PDFs en **Python** (`pypdf`), que se ejecuta dentro del propio móvil gracias a [Chaquopy](https://chaquo.com/chaquopy/).

**Biblioteca**
- Importa uno o varios PDFs; la app guarda su propia copia, así que funcionan sin conexión.
- Muestra el progreso de lectura de cada documento y recuerda la página y el modo en que lo dejaste.
- Menú ⋮ de cada documento: renombrar, poner una portada desde la galería, borrar.

**Configuración** (icono de engranaje en la biblioteca)
- Color de la app: azul, rojo, verde o morado.
- Vista de la biblioteca: lista o cuadrícula con las portadas grandes.
- Estilo de lectura predeterminado: fuente, tamaño, interlineado, alineación, fondo (claro, sepia, oscuro o AMOLED) y paso de página, con vista previa.
- Botón para restablecer todo a los valores por defecto.
- **Actualizaciones**: busca la última release en [GitHub](https://github.com/Kriih/pdf-reader/releases) y, si es más nueva, descarga el APK y abre el instalador de Android (la biblioteca se conserva).

**Lector**
- Tres vistas, en la barra superior:
  - **PDF original**, continua o por páginas (se elige en "Vista").
  - **Texto ajustado**: el texto se adapta al ancho de la pantalla, en scroll vertical.
  - **Horizontal**: el texto ajustado en páginas del tamaño de la pantalla, que se pasan en horizontal, como en un e-reader.
- En las vistas de texto: fuente, tamaño, interlineado, alineación y fondo (claro, sepia, oscuro o AMOLED) a elegir.
- Los párrafos cortados por un salto de página se unen.
- **Capítulos** separados visualmente, sacados del índice del PDF o detectados por sus títulos, y un índice para saltar entre ellos.
- **Marcadores** en cualquier página.

## Estructura

```
mobile/                             App (React Native + Expo)
├── src/app/                        Pantallas (Expo Router)
│   ├── _layout.js                  Pila de navegación y ajustes compartidos
│   ├── index.js                    Biblioteca
│   ├── settings.js                 Configuración (estilo de lectura predeterminado)
│   └── reader/[id].js              Lector
├── library/                        Documentos guardados, progreso, portadas y marcadores
├── reader/                         Tema, ajustes, texto ajustado (unión de párrafos, capítulos, paginado)
├── components/                     Visor PDF, modo texto, paneles
├── updates/                        Buscar e instalar actualizaciones desde las releases de GitHub
├── modules/pdf-python/             Puente React ⇄ Python
│   └── android/src/main/python/
│       └── pdf_tools.py            Lógica de PDFs en Python
├── scripts/make-icons.py           Genera los iconos de assets/ (python3 scripts/make-icons.py)
├── app.json                        Configuración de la app (permisos, plugins)
└── android/                        Proyecto Android generado con prebuild (no editar a mano)
backend/                            API FastAPI: ejecuta pdf_tools.py para la versión web
```

En el navegador (localhost), el mismo `pdf_tools.py` se ejecuta en el backend en lugar de en el móvil: así se puede probar la app sin Java ni el SDK de Android.

## Preparación (una sola vez)

### 1. Node.js 20+

Comprueba si lo tienes con `node -v`. Si dice `command not found`, instálalo con [nvm](https://github.com/nvm-sh/nvm):

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
source ~/.bashrc
nvm install 24
```

### 2. Dependencias de la app

```bash
cd ~/Desktop/android-app/mobile
npm install        # repítelo cuando cambie package.json
```

### 3. Entorno de Python del backend

```bash
sudo apt install python3-venv
cd ~/Desktop/android-app/backend
rm -rf .venv
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
```

### 4. Solo para el APK: Java, SDK de Android y Python 3.13

- **JDK 17** y **Android SDK**, instalados en `~/Android` (`~/Android/jdk-17` y `~/Android/sdk`).
- **Python 3.13**: Chaquopy lo usa al compilar para empaquetar `pypdf`. Linux Mint 22 / Ubuntu 24.04 traen el 3.12; el 3.13 se instala al lado sin tocar el del sistema:

  ```bash
  sudo add-apt-repository ppa:deadsnakes/ppa
  sudo apt update
  sudo apt install python3.13
  python3.13 --version    # debe decir Python 3.13.x
  ```

- **Swap** (recomendado si tienes poca RAM): sin swap, la compilación puede agotar la memoria y congelar el PC.

  ```bash
  sudo fallocate -l 8G /swapfile
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile
  sudo swapon /swapfile
  echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
  ```

  Comprueba con `free -h` que en la línea `Swap` aparece `8,0Gi`.

> **VS Code instalado como Flatpak:** su terminal integrada es un entorno aislado, con su propio Python y su propio Node.
> Un `.venv`, un Node o un Python 3.13 instalados o vistos desde ahí no sirven en una terminal normal, y al revés.
> Usa siempre una terminal normal del sistema; si el backend no arranca, rehaz el `.venv` (paso 3) desde esa terminal.

## Detalles

### Versión web

- El PDF original se ve con el visor del navegador: no hay contador de página ni modo "por páginas" en esa vista (el texto ajustado sí los tiene).
- La biblioteca se guarda en el navegador (IndexedDB): borrar los datos del sitio la vacía.
- Los cambios en el código JavaScript y en `pdf_tools.py` se recargan solos.
- http://localhost:8000 muestra la documentación de la API; la app está en el 8081.

### El APK, paso a paso

1. **Variables de entorno.** Cada terminal nueva necesita `JAVA_HOME`, `ANDROID_HOME` y el `PATH`; sin ellas, `gradlew` falla con `JAVA_HOME is not set`. Para no repetirlas, añádelas al final de `~/.bashrc`.
2. **`npx expo prebuild -p android --clean`** crea la carpeta `android/` a partir de `app.json` y de los módulos instalados.
   Es seguro borrarla y regenerarla: la configuración propia vive en `app.json` y en `modules/pdf-python`.
   Repítelo cuando cambies `app.json`, los iconos de `assets/` o instales una librería con código nativo: `./gradlew` solo compila lo que ya hay en `android/`.
   Si avisa de cambios de git sin confirmar, puedes continuar; para que no pregunte: `EXPO_NO_GIT_STATUS=1 npx expo prebuild -p android --clean`.
3. **`./gradlew assembleRelease`** compila. La primera vez tarda bastante porque descarga dependencias; las siguientes, mucho menos.
   Con poca RAM, usa estas opciones:

   | Opción | Qué hace |
   |---|---|
   | `-PreactNativeArchitectures=arm64-v8a` | Compila solo para móviles (`arm64-v8a`), no para emuladores (`x86_64`): la mitad del trabajo en C++ y un APK más pequeño. El APK no sirve en un emulador. |
   | `--max-workers=2` | Como máximo 2 tareas a la vez (por defecto, una por núcleo). |
   | `--no-parallel` | Compila los módulos de uno en uno. |

   Tarda más, pero no satura la memoria. En el móvil la app funciona igual con o sin ellas.
4. **El APK** queda en `mobile/android/app/build/outputs/apk/release/app-release.apk`.
   Está firmado con la clave de depuración: sirve para instalarlo en tus dispositivos, no para subirlo a Google Play.
5. **Instalarlo:** copia el archivo al móvil y ábrelo (Android pedirá permitir "orígenes desconocidos"), o por USB con la **depuración USB** activada (Ajustes → Opciones de desarrollador) y `adb install -r`.
   Instalar encima de una versión anterior conserva la biblioteca (documentos, progreso, portadas y marcadores).
   Si Android se niega por un conflicto de firma, desinstala la app antigua; eso **borra la biblioteca**.

### Desarrollo con recarga en caliente en el móvil

Con el móvil conectado por USB (o un emulador abierto) y las variables de entorno cargadas:

```bash
cd ~/Desktop/android-app/mobile
npx expo run:android
```

Instala una versión de desarrollo y arranca Metro: los cambios en el código JavaScript se ven al instante.
Los cambios en Kotlin, Python, `app.json` o dependencias nativas necesitan volver a ejecutar ese comando.

> **Expo Go no sirve** para esta app, porque incluye código nativo propio (Python y el visor de PDF).

### Comprobaciones antes de compilar

```bash
cd ~/Desktop/android-app/mobile
npx expo lint        # estilo y errores comunes
npx tsc --noEmit     # tipos
npx expo-doctor      # dependencias y configuración de Expo
```

### Probar la lógica de Python en el PC

```bash
cd ~/Desktop/android-app
backend/.venv/bin/python -c "
import sys; sys.path.insert(0, 'mobile/modules/pdf-python/android/src/main/python')
import pdf_tools; print(pdf_tools.info('ruta/a/un.pdf'))"
```

## Problemas frecuentes

| Error | Solución |
|---|---|
| `JAVA_HOME is not set` | Carga las variables de entorno en esa misma terminal (ver "Crear el APK" abajo). |
| `SDK location not found` | Falta `ANDROID_HOME`: carga las variables de entorno. |
| `Couldn't find Python 3.13` | Instala Python 3.13 (Preparación, paso 4) y comprueba `python3.13 --version` en una terminal normal, no en la de VS Code Flatpak. |
| El PC se congela al compilar | Falta memoria: compila con `-PreactNativeArchitectures=arm64-v8a --max-workers=2 --no-parallel` y añade swap. Si se congela, espera un par de minutos o pulsa `Ctrl+Alt+F3`, entra con tu usuario y ejecuta `pkill -f gradle`. |
| Falta un permiso o un módulo en el APK (p. ej. la galería no abre) | Vuelve a ejecutar `npx expo prebuild -p android --clean` y compila de nuevo. |
| El backend no arranca (`.venv` no existe o no funciona) | Rehaz el `.venv` (Preparación, paso 3) desde la terminal que vayas a usar. |
| La web dice que no puede conectar con el backend | Arranca el backend en el puerto 8000. |
| Los puertos 8000 u 8081 están ocupados | Quedaron servidores en segundo plano: `pkill -f "uvicorn main:app"; pkill -f "expo start"`. |

---

## Instrucciones rápidas

Antes de la primera vez, haz la [Preparación](#preparación-una-sola-vez).

### Levantar el backend (http://localhost:8000)

En una terminal:

```bash
cd ~/Desktop/android-app/backend
.venv/bin/uvicorn main:app --reload --reload-dir . --reload-dir ../mobile/modules/pdf-python/android/src/main/python --port 8000
```

### Levantar el frontend (http://localhost:8081)

En otra terminal, con el backend ya arrancado:

```bash
cd ~/Desktop/android-app/mobile
npx expo start --web
```

Abre **http://localhost:8081** en el navegador. Para parar cada uno, `Ctrl+C` en su terminal.

### Crear el APK

Con el backend y el frontend apagados (consumen memoria):

```bash
export JAVA_HOME=$HOME/Android/jdk-17
export ANDROID_HOME=$HOME/Android/sdk
export PATH=$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$PATH

cd ~/Desktop/android-app/mobile
npm install
npx expo prebuild -p android --clean     # solo si cambiaste app.json, iconos o librerías nativas

cd android
./gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a --max-workers=2 --no-parallel
```

El APK queda en `~/Desktop/android-app/mobile/android/app/build/outputs/apk/release/app-release.apk`.
Para instalarlo en el móvil conectado por USB:

```bash
adb install -r ~/Desktop/android-app/mobile/android/app/build/outputs/apk/release/app-release.apk
```

### Subir cambios a GitHub

```bash
cd ~/Desktop/android-app
git add -A
git commit -m "Describe el cambio"
git push
```

### Publicar una actualización

La app busca actualizaciones en las [releases de GitHub](https://github.com/Kriih/pdf-reader/releases) (Configuración → Actualizaciones):
compara la etiqueta de la última release con su versión y, si es más nueva, descarga el primer `.apk` adjunto.

1. En `mobile/app.json`, sube `version` (p. ej. `1.1.0` → `1.2.0`) y `android.versionCode` (un número entero, siempre mayor que el anterior).
2. Crea el APK como arriba, con `npx expo prebuild -p android --clean` (la versión se lee de `app.json`).
3. Sube los cambios a GitHub.
4. En GitHub → **Releases → Draft a new release**: etiqueta `v` + la versión (p. ej. `v1.2.0`), escribe las novedades y adjunta el APK (`app-release.apk`, se puede renombrar a `lector-pdf-v1.2.0.apk`).

Las actualizaciones solo se instalan encima si el APK está firmado con la misma clave que el instalado (la de depuración de este proyecto).
