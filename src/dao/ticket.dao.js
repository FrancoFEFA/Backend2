import ticketModel from '../models/ticket.model.js';

// DAO: operaciones crudas de Mongoose sobre la coleccion de tickets.
const ticketDao = {
    create(data) {
        return ticketModel.create(data);
    },

    findById(id) {
        return ticketModel.findById(id);
    },
};

export default ticketDao;
