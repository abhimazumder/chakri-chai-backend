function verifyToken(authorizationHeader) {
  if (!authorizationHeader) {
    return null;
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
