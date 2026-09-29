package expo.modules.pdfpython

import com.chaquo.python.PyException
import com.chaquo.python.Python
import com.chaquo.python.android.AndroidPlatform
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class PythonError(message: String) : CodedException("ERR_PYTHON", message, null)

class PdfPythonModule : Module() {
  private val pdfTools by lazy {
    val context = requireNotNull(appContext.reactContext).applicationContext
    if (!Python.isStarted()) {
      Python.start(AndroidPlatform(context))
    }
    Python.getInstance().getModule("pdf_tools")
  }

  override fun definition() = ModuleDefinition {
    Name("PdfPython")

    // Ejecuta un comando de pdf_tools.py; args y resultado viajan como JSON.
    AsyncFunction("run") { command: String, argsJson: String ->
      try {
        pdfTools.callAttr("run", command, argsJson).toString()
      } catch (e: PyException) {
        // "ValueError: La página 9 no existe" -> "La página 9 no existe"
        throw PythonError(e.message?.substringAfter(": ") ?: "Error en Python")
      }
    }
  }
}
