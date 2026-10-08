import bcrypt from 'bcrypt';
import userDao from '../dao/user.dao.js';
import { RepositoryError } from '../utils/errors.js';

const SALT_ROUNDS = 10;

// Repository: punto unico por el que la logica de negocio (estrategias de
// Passport, controllers, servicios de mailing) accede a los usuarios.
// Nunca se llama a Mongoose directamente desde afuera: todo pasa por aca,
// que a su vez delega la persistencia en el userDao.
const userRepository = {
    async findByEmail(email) {
        return userDao.findByEmail(email);
    },

    async findById(id) {
        return userDao.findById(id);
    },

    async registerLocalUser({ first_name, last_name, email, age, password }) {
        const exists = await userDao.findByEmail(email);
        if (exists) throw new RepositoryError('El usuario ya existe', 400);

        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

        return userDao.create({
            first_name,
            last_name,
            email,
            age,
            password: hashedPassword,
            role: 'user',
            provider: 'local',
        });
    },

    async validateCredentials(email, password) {
        const user = await userDao.findByEmail(email);
        if (!user || !user.password) return null;

        const valid = await bcrypt.compare(password, user.password);
        return valid ? user : null;
    },

    // Busca o crea el usuario correspondiente a un perfil de GitHub.
    async findOrCreateGithubUser(profile) {
        const githubId = String(profile.id);
        const email = profile.emails?.[0]?.value || null;
        const displayName = profile.displayName || profile.username || 'GitHub User';

        const existingByGithub = await userDao.findByGithubId(githubId);
        if (existingByGithub) return existingByGithub;

        if (!email) {
            throw new RepositoryError('GitHub no proporciono un email publico para esta cuenta', 400);
        }

        // Si ya existia una cuenta local con ese email, se vincula el githubId
        const existingByEmail = await userDao.findByEmail(email);
        if (existingByEmail) {
            return userDao.updateById(existingByEmail._id, { githubId, provider: 'github' });
        }

        let first_name = displayName;
        let last_name = ' ';
        if (displayName.includes(' ')) {
            const parts = displayName.split(' ');
            first_name = parts[0];
            last_name = parts.slice(1).join(' ');
        }

        return userDao.create({
            first_name,
            last_name,
            email,
            password: null,
            age: null,
            role: 'user',
            githubId,
            provider: 'github',
        });
    },

    // Actualiza la contraseña verificando que no sea igual a la anterior.
    async updatePassword(userId, newPassword) {
        const user = await userDao.findById(userId);
        if (!user) throw new RepositoryError('Usuario no encontrado', 404);

        const sameAsBefore = user.password ? await bcrypt.compare(newPassword, user.password) : false;
        if (sameAsBefore) {
            throw new RepositoryError('La nueva contraseña no puede ser igual a la anterior', 400);
        }

        const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);
        return userDao.updateById(userId, { password: hashedPassword });
    },
};

export default userRepository;
