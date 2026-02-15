import mongoose from "mongoose";

const moderationLogSchema = new mongoose.Schema({
  adminId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  actionType: { 
    type: String, 
    enum: ['DELETE_NOVEL', 'BAN_USER', 'DELETE_USER'], 
    required: true 
  },
  // This field tells Mongoose which collection to look into
  targetModel: {
    type: String,
    required: true,
    enum: ['User', 'Novel']
  },
  targetId: { 
    type: mongoose.Schema.Types.ObjectId, 
    refPath: 'targetModel', // Dynamically chooses 'User' or 'Novel'
    required: true 
  },
  targetMetadata: {
    name: String, // Username or Novel Title
    image: String // Profile Pic or Cover Image
  },
  reason: { 
    type: String, 
    default: "No reason provided" 
  },
  timestamp: { 
    type: Date, 
    default: Date.now 
  }
});

export default mongoose.model("ModerationLog", moderationLogSchema);