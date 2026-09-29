// En web no hay Python en el dispositivo: el mismo pdf_tools.py se ejecuta
// en el backend FastAPI (backend/main.py). Los PDFs viajan como data URIs.
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000';

async function toDataUri(uri: string): Promise<string> {
  if (uri.startsWith('data:')) return uri;
  const blob = await (await fetch(uri)).blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export async function runPython<T = any>(command: string, args: Record<string, any>): Promise<T> {
  const body = { ...args };
  if (body.src) body.src = await toDataUri(body.src);

  let res: Response;
  try {
    res = await fetch(`${API_URL}/api/run/${command}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error(`No se pudo conectar con el backend en ${API_URL}. ¿Está arrancado?`);
  }
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail ?? 'Error en Python');
  return data;
}
