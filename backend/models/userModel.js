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
    fcmTokenUpdatedAt: {
        type: Date,
        default: null,
    },
    fcmTokenStatus: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'inactive',
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
    mobileNumber: {
        type: String,
    },
    address: {
        type: String,
    },
});

// Add a method to update FCM token with timestamp
userSchema.methods.updateFcmToken = function(token) {
    this.fcmToken = token;
    this.fcmTokenUpdatedAt = new Date();
    this.fcmTokenStatus = 'active';
    return this.save();
};

// Add a method to invalidate FCM token
userSchema.methods.invalidateFcmToken = function() {
    this.fcmTokenStatus = 'inactive';
    return this.save();
};

const User = mongoose.model('User', userSchema);

module.exports = User;