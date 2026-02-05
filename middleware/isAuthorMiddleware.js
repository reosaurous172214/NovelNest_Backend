export const isAuthor = (req, res, next) => {
    if (req.user && req.user.role === 'author') {
        next(); // User is author, proceed to the controller
    } else {
        res.status(403).json({ 
            message: "Access denied. Author privileges required." 
        });
    }
};