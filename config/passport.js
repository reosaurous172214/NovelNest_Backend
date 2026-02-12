import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import User from '../models/User.js';
import dotenv from 'dotenv';

dotenv.config();

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // 1. Check if user already exists by Google ID
        let user = await User.findOne({ googleId: profile.id });

        if (!user) {
          // 2. Check if user exists by email (to link accounts)
          user = await User.findOne({ email: profile.emails[0].value });

          if (user) {
            // Link Google ID to existing email account
            user.googleId = profile.id;
            // Only update profile picture if they are using the dummy default
            if (user.profilePicture === "utilities/dummy.png") {
              user.profilePicture = profile.photos[0].value;
            }
            await user.save();
          } else {
            // 3. Create a brand new user
            // We generate a clean username from their Display Name
            const baseUsername = profile.displayName.replace(/\s+/g, '').toLowerCase();
            const uniqueUsername = `${baseUsername}${Math.floor(1000 + Math.random() * 9000)}`;

            user = await User.create({
              googleId: profile.id,
              username: uniqueUsername,
              email: profile.emails[0].value,
              profilePicture: profile.photos[0].value,
              // role defaults to "reader" as per your schema
              // preferences default to your schema's settings
            });
          }
        }
        return done(null, user);
      } catch (err) {
        return done(err, null);
      }
    }
  )
);

// Serializing the user for the temporary session handshake
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

export default passport;