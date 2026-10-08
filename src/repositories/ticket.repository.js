import ticketDao from '../dao/ticket.dao.js';

// Repository de tickets: por ahora es una envoltura fina del DAO, pero
// queda como punto unico para agregar reglas de negocio a futuro
// (por ejemplo, notificar por mail la compra confirmada).
const ticketRepository = {
    async create(data) {
        return ticketDao.create(data);
    },

    async getById(id) {
        return ticketDao.findById(id);
    },
};

export default ticketRepository;
