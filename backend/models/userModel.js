const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: [true, 'Please provide a username'],
    },
    email: {
        type: String,
        required: [true, 'Please provide an email'],
    },
    password: {
        type: String,
        required: function() {
            // Only require password for non-Google auth users
            return !this.isGoogleAuth;
        },
    },
    firebaseUid: {
        type: String,
        required: [true, 'Firebase UID is required'],
        unique: true,
    },
    isGoogleAuth: {
        type: Boolean,
        default: false
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
    deviceType: {
        type: String,
        enum: ['ios', 'android', 'web', 'unknown'],
        default: 'unknown'
    },
    tokenType: {
        type: String,
        enum: ['expo', 'fcm', 'apns'],
        default: 'expo'
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