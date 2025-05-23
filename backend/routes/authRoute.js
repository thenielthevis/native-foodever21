const express = require('express');
const protect = require('../middleware/protect');
const adminProtect = require('../middleware/adminprotect');
const userProtect = require('../middleware/userprotect');
const router = express.Router();

const {
    login,
    updateUser,
    resetPassword,
    uploadAvatar,
    getCurrentUser,
    signup,
    checkEmail,  
    deleteUser,
    getUsers,
    getAllUsers,
    updateFcmToken,
    removeFcmToken,
    cleanStaleTokens
} = require('../controllers/authController');

// Routes
router.post('/signup', signup);
router.post('/login', login);
router.patch('/updateUser', protect, updateUser);
router.put('/updateUser', protect, updateUser);
router.post('/resetPassword', protect, resetPassword);
router.post('/update-fcm-token', protect, updateFcmToken);
router.delete('/remove-fcm-token', protect, removeFcmToken);
router.post('/clean-stale-tokens', protect, adminProtect, cleanStaleTokens);
router.post('/upload-avatar', uploadAvatar);
router.get('/me', protect, getCurrentUser);

// Remove this duplicate route
// router.get('/users', getUsers);

// Keep only one route for getting all users and protect it
router.get('/users', protect, getAllUsers);

//checking email and deleting user
router.get('/check-email/:email', checkEmail);
router.delete('/delete-user/:email', deleteUser);

module.exports = router;
