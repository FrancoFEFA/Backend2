// DTO (Data Transfer Object): lo que viaja hacia afuera de la API nunca es
// el documento de Mongoose tal cual, siempre pasa por aca. Evita filtrar
// password, githubId, __v o cualquier otro campo interno/sensible,
// aunque el modelo crezca a futuro.
export function toCurrentUserDTO(user) {
    if (!user) return null;
    const plain = user.toObject ? user.toObject() : user;

    return {
        id: String(plain._id ?? plain.id),
        first_name: plain.first_name,
        last_name: plain.last_name,
        email: plain.email,
        age: plain.age ?? null,
        role: plain.role,
    };
}
