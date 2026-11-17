
function validarBody(req, res, next) {

    if (
        !req.body ||
        typeof req.body !== "object" ||
        Array.isArray(req.body)
    ) {
        return res.status(400).json({
            mensaje: "Debes enviar un objeto JSON válido"
        });
    }

    next();
}

module.exports = validarBody;
