const mongoose = require('mongoose');

const connectDatabase = () => {
    mongoose.connect(process.env.DB_URI)
    .then(con => {
        console.log(`MongoDB Database connected with HOST: ${con.connection.client.s.options.srvHost}`);
    })
    .catch(err => {
        console.error('Error connecting to MongoDB:', err);
    });
}

module.exports = connectDatabase;