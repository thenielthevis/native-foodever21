const admin = require('firebase-admin');
const verifyIdToken = async (req, res, next) => {
    const idToken = req.headers.authorization?.split('Bearer ')[1];
    if (!idToken) {
        return res.status(401).send('Unauthorized');
    }
    try {
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        req.user = decodedToken; // Attach the decoded token to the request for further processing
        next();
    } catch (error) {
        console.error('Error verifying token:', error);
        return res.status(403).send('Invalid or expired token');
    }
};
