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
    updateFcmToken
} = require('../controllers/authController');

// Routes
router.post('/signup', signup);
router.post('/login', login);
router.patch('/updateUser', protect, updateUser);
router.put('/updateUser', protect, updateUser);
router.post('/resetPassword', protect, resetPassword);
router.post('/update-fcm-token', protect, updateFcmToken);
router.post('/upload-avatar', uploadAvatar);
router.get('/me', protect, getCurrentUser);
router.get('/users', getUsers);

//checking email and deleting user
router.get('/check-email/:email', checkEmail);
router.delete('/delete-user/:email', deleteUser);

//fetching all users
router.get('/users', protect, getAllUsers);

module.exports = router;
