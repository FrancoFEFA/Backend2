// Almacen en memoria para fallback cuando MongoDB no esta disponible
// Se usa solo si la conexion a Atlas falla por IP no whitelisteada

// Mapa en memoria para usuarios
const memoryUsers = [];

// Genera un id simple para el usuario en memoria
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}

// Busca un usuario por email en memoria
export function findMemoryUserByEmail(email) {
    return memoryUsers.find(u => u.email === email) || null;
}

// Busca un usuario por id en memoria
export function findMemoryUserById(id) {
    return memoryUsers.find(u => String(u._id) === String(id)) || null;
}

// Crea un usuario en memoria
export function createMemoryUser(data) {
    const newUser = {
        _id: generateId(),
        ...data
    };
    memoryUsers.push(newUser);
    return newUser;
}

// Lista todos los usuarios en memoria para debug
export function listMemoryUsers() {
    return memoryUsers;
}
