const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");

dotenv.config();

const createTokens = (payload) => {
  const accessToken = jwt.sign(
    { user: payload, type: "ACCESS_TOKEN" },
    process.env.JWT_SECRET_KEY,
    {
      expiresIn: "15m",
    }
  );

  const refreshToken = jwt.sign(
    { user: payload, type: "REFRESH_TOKEN" },
    process.env.JWT_SECRET_KEY,
    {
      expiresIn: "15d",
    }
  );

  return {
    ACCESS_TOKEN: accessToken,
    REFRESH_TOKEN: refreshToken,
  };
};

module.exports = { createTokens };
