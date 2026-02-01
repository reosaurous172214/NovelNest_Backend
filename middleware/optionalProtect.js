import jwt from "jsonwebtoken";
import User from "../models/User.js";

const optionalProtect = async (req, res, next) => {
  try {
    let token;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    // If there is no token, we DON'T send a 401. 
    // We just set user to null and let them through as a guest.
    if (!token) {
      req.user = null;
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select("-password");

    next();
  } catch (err) {
    // If a token was provided but it's expired/fake, 
    // we still treat them as a guest instead of blocking them.
    req.user = null;
    next();
  }
};

export default optionalProtect;