import base64
import json
import sys
import tempfile
from pathlib import Path

from fastapi import Body, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse

# Reutilizamos exactamente el mismo código Python que corre en el APK.
PYTHON_DIR = Path(__file__).resolve().parent.parent / "mobile/modules/pdf-python/android/src/main/python"
sys.path.insert(0, str(PYTHON_DIR))
import pdf_tools  # noqa: E402

app = FastAPI(title="Lector PDF API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/", include_in_schema=False)
def root():
    # La interfaz la sirve Expo (puerto 8081); aquí se muestra la documentación de la API.
    return RedirectResponse("/docs")


def _write_data_uri(data_uri, folder):
    path = Path(folder) / "entrada.pdf"
    path.write_bytes(base64.b64decode(data_uri.split("base64,", 1)[1]))
    return str(path)


@app.post("/api/run/{command}")
def run(command: str, args: dict = Body(...)):
    """Versión web de la app: recibe el PDF como data URI."""
    with tempfile.TemporaryDirectory() as tmp:
        if "src" in args:
            args["src"] = _write_data_uri(args["src"], tmp)
        try:
            return json.loads(pdf_tools.run(command, json.dumps(args)))
        except Exception as e:
            raise HTTPException(status_code=400, detail=str(e))
