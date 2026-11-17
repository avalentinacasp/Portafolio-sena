
const fs = require("fs/promises");
const path = require("path");

// Ruta de almacenamiento de los archivos JSON
const DATA_PATH = path.join(__dirname, "../data");

// Leer información de un archivo JSON
async function leerArchivo(archivo) {
    const ruta = path.join(DATA_PATH, archivo);

    try {
        const contenido = await fs.readFile(ruta, "utf8");

        return JSON.parse(contenido);

    } catch (error) {

        if (error.code === "ENOENT") {
            await fs.writeFile(ruta, "[]", "utf8");

            return [];
        }

        throw error;
    }
}

// Guardar información en un archivo JSON
async function guardarArchivo(archivo, datos) {
    const ruta = path.join(DATA_PATH, archivo);

    await fs.writeFile(
        ruta,
        JSON.stringify(datos, null, 4),
        "utf8"
    );

    return datos;
}

// Exportar funciones del modelo
module.exports = {
    leerArchivo,
    guardarArchivo
};
