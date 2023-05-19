const express = require('express');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');

const app = express();

// Middleware
app.use(bodyParser.json());

// Store OTPs and blocked accounts in memory
const otpStore = {};
const blockedAccounts = {};

// Generate OTP endpoint
app.post('/generate-otp', (req, res) => {
  const { email } = req.body;

  // Check if the account is blocked
  if (blockedAccounts[email]) {
    return res.status(401).json({ message: 'Account is blocked. Please try again after 1 hour.' });
  }

  // Check if OTP has been generated within the last 1 minute
  if (otpStore[email] && otpStore[email].timestamp + 60000 > Date.now()) {
    return res.status(429).json({ message: 'Please wait for 1 minute before requesting OTP again.' });
  }

  // Generate a 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000);

  // Store the OTP and its timestamp
  otpStore[email] = { otp, timestamp: Date.now() };

  // Send the OTP to the user (replace with your own logic to send OTP)
  console.log(`OTP generated for ${email}: ${otp}`);

  // Return a success response
  res.json({ message: 'OTP generated successfully.' });
});

// Login endpoint
app.post('/login', (req, res) => {
  const { email, otp } = req.body;

  // Check if the account is blocked
  if (blockedAccounts[email]) {
    return res.status(401).json({ message: 'Account is blocked. Please try again after 1 hour.' });
  }

  // Check if OTP is valid and within the 5-minute validity period
  if (otpStore[email] && otpStore[email].otp === otp && otpStore[email].timestamp + 300000 > Date.now()) {
    // Delete the used OTP
    delete otpStore[email];

    // Generate a new JWT token
    const token = jwt.sign({ email }, 'secret_key'); // Replace 'secret_key' with your own secret key for JWT signing

    // Return the token to the user
    res.json({ token });
  } else {
    // Increase the failed attempt count for the account
    blockedAccounts[email] = (blockedAccounts[email] || 0) + 1;

    // Block the account for 5 consecutive failed attempts
    if (blockedAccounts[email] >= 5) {
      // Unblock the account after 1 hour
      setTimeout(() => {
        delete blockedAccounts[email];
      }, 3600000);

      return res.status(401).json({ message: 'Account is blocked. Please try again after 1 hour.' });
    }

    res.status(401).json({ message: 'Invalid OTP. Please try again.' });
  }
});

app.listen(3000, () => {
  console.log('Server is running on port 3000');
});
