// Flash de mensajes aprovechando la sesion de express-session: permite
// mostrar un mensaje (por ej. "Registro exitoso") en la proxima vista, y
// consumirlo una sola vez. Sin dependencias extra: se guarda en req.session
// y se expone en las vistas via res.locals.
export function flashMiddleware(req, res, next) {
    if (req.session?.flash) {
        res.locals.flash = req.session.flash;
        delete req.session.flash;
    } else {
        res.locals.flash = null;
    }
    next();
}