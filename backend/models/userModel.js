const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: [true, 'Please provide a username'],
    },
    email: {
        type: String,
        required: [true, 'Please provide an email'],
        // unique: true,
    },
    password: {
        type: String,
        required: [true, 'Please provide a password'],
    },
    firebaseUid: {
        type: String,
        required: [true, 'Firebase UID is required'],
        unique: true,
    },
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user',
    },
    fcmToken: {
        type: String,
        default: null,
    },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active',
    },
    userImage: {
        type: String,
    },
    cloudinary_id: {
        type: String,
    },
});

const User = mongoose.model('User', userSchema);

module.exports = User;