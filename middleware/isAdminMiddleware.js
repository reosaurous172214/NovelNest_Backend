// This middleware runs AFTER the 'protect' middleware
export const isAdmin = (req, res, next) => {
    // req.user is populated by your 'protect' middleware
    if (req.user && req.user.role === 'admin' ) {
        next(); // User is admin, proceed to the controller
    } else {
        res.status(403).json({ 
            message: "Access denied. Administrative privileges required." 
        });
    }
};