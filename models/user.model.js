import mongoose from 'mongoose';

// Define el nombre de la coleccion en MongoDB
const userCollection = "usuarios";

// Define el esquema del usuario con campos de autenticacion local y terceros
const userSchema = new mongoose.Schema({
    first_name: { type: String, required: true, max: 100 },
    last_name: { type: String, required: true, max: 100 },
    email: { type: String, required: true, unique: true, max: 100 },
    age: { type: Number, required: false },
    password: {
        type: String,
        required: function() { return !this.githubId; }
    },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    githubId: { type: String, unique: true, sparse: true },
    provider: { type: String, enum: ["local", "github"], default: "local" }
});

// Crea el modelo a partir del esquema
const userModel = mongoose.model(userCollection, userSchema);

export default userModel;
