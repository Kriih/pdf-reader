import { NativeModule, requireNativeModule } from 'expo';

declare class PdfPythonModule extends NativeModule<{}> {
  run(command: string, argsJson: string): Promise<string>;
}

const native = requireNativeModule<PdfPythonModule>('PdfPython');

// Llama a pdf_tools.run(command, args) en Python y devuelve el resultado ya parseado.
export async function runPython<T = any>(command: string, args: object): Promise<T> {
  return JSON.parse(await native.run(command, JSON.stringify(args)));
}

export default native;
