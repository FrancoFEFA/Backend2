import mongoose from 'mongoose';
import userModel from '../models/user.model.js';
import {
    findMemoryUserByEmail,
    findMemoryUserById,
    findMemoryUserByGithubId,
    createMemoryUser,
    updateMemoryUser,
} from '../utils/memoryStore.js';

function isDbConnected() {
    return mongoose.connection.readyState === 1;
}

// DAO (Data Access Object): unico modulo que sabe si los usuarios viven en
// MongoDB o en el fallback en memoria (util cuando Atlas no esta
// disponible). El resto de la app (repository, passport) no necesita
// saber de donde vienen los datos, solo le habla a este DAO.
const userDao = {
    async findByEmail(email) {
        if (isDbConnected()) {
            try {
                return await userModel.findOne({ email });
            } catch (e) {
                console.log('Fallo DB en findByEmail, usando memoria:', e.message);
            }
        }
        return findMemoryUserByEmail(email);
    },

    async findById(id) {
        if (isDbConnected()) {
            try {
                const user = await userModel.findById(id);
                if (user) return user;
            } catch (e) {
                console.log('Fallo DB en findById, usando memoria:', e.message);
            }
        }
        return findMemoryUserById(id);
    },

    async findByGithubId(githubId) {
        if (isDbConnected()) {
            try {
                return await userModel.findOne({ githubId });
            } catch (e) {
                console.log('Fallo DB en findByGithubId, usando memoria:', e.message);
            }
        }
        return findMemoryUserByGithubId(githubId);
    },

    async create(data) {
        if (isDbConnected()) {
            try {
                return await userModel.create(data);
            } catch (e) {
                console.log('Fallo al crear en DB, usando memoria:', e.message);
            }
        }
        return createMemoryUser(data);
    },

    async updateById(id, changes) {
        if (isDbConnected()) {
            try {
                return await userModel.findByIdAndUpdate(id, changes, { new: true });
            } catch (e) {
                console.log('Fallo al actualizar en DB, usando memoria:', e.message);
            }
        }
        return updateMemoryUser(id, changes);
    },
};

export default userDao;
