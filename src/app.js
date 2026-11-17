
const express = require("express");

// Importar middlewares
const registrarPeticion = require("./middlewares/logger.middleware");
const manejarError = require("./middlewares/error.middleware");

// Importar rutas
const crearRutas = require("./routes/portafolio.routes");

// Crear aplicación
const app = express();
const PORT = 3000;

// Permitir recibir información en formato JSON
app.use(express.json());

// Registrar las peticiones
app.use(registrarPeticion);

// Ruta principal
app.get("/", (req, res) => {
    res.status(200).json({
        mensaje: "API Portafolio Digital SENA funcionando",
        entidades: [
            "Aprendices",
            "Instructores",
            "Evidencias"
        ]
    });
});

// Conectar rutas de las entidades
app.use("/api/aprendices", crearRutas("aprendices"));
app.use("/api/instructores", crearRutas("instructores"));
app.use("/api/evidencias", crearRutas("evidencias"));

// Manejar rutas inexistentes
app.use((req, res) => {
    res.status(404).json({
        mensaje: "La ruta solicitada no existe"
    });
});

// Manejar errores
app.use(manejarError);

// Iniciar servidor
app.listen(PORT, () => {
    console.log("--------------------------------");
    console.log(" PORTAFOLIO DIGITAL SENA");
    console.log("--------------------------------");
    console.log(`Servidor: http://localhost:${PORT}`);
    console.log("Estado: En funcionamiento");
    console.log("--------------------------------");
});
