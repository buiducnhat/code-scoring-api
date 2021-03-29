const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
  const { authorization } = req.headers;
  if (!authorization) {
    return res.status(403).json({
      success: false,
      message: 'Token is required',
    });
  }
  if (authorization.indexOf('Bearer ') !== 0) {
    return res.status(401).json({
      success: false,
      message: 'Bearer token is required',
    });
  }

  const token = authorization.replace('Bearer ', '');

  jwt.verify(token, process.env.SECRET, (err, decoded) => {
    if (err) {
      return res
        .status(403)
        .json({ success: false, message: 'Not authenticated' });
    }
    req.userId = decoded.id;
    next();
  });
};

module.exports = Object.assign({}, { verifyToken });
