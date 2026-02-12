import Request from "../models/Request.js";

export const createRequest = async (req, res) => {
  try {
    const { type, subject, description } = req.body;

    // 1. Check for existing pending request of the same type (Anti-spam)
    const existingRequest = await Request.findOne({
      user: req.user.id,
      type,
      status: "pending",
    });

    if (existingRequest) {
      return res.status(400).json({ 
        message: `You already have a pending ${type.replace('_', ' ')} request.` 
      });
    }

    // 2. Create the new request
    const newRequest = await Request.create({
      user: req.user.id,
      type,
      subject,
      description,
    });

    res.status(201).json({ message: "Request logged successfully", data: newRequest });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};