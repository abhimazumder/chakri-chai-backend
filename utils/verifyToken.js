const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");

dotenv.config();

function verifyToken(authorizationHeader) {
  if (!authorizationHeader) {
    const error = new Error("Missing Authorization Token.");
    error.statusCode = 401;
    throw error;
  }

  const token = authorizationHeader.split(" ")[1];

  try {
    const verifiedToken = jwt.verify(token, process.env.JWT_SECRET_KEY);
    return verifiedToken;
  } catch (error) {
    return null;
  }
}

module.exports = { verifyToken };
