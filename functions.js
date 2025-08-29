import jwt from "jsonwebtoken";

export function signUserToken(token, privKey = "secretkey") {
  return jwt.sign({ userID: token }, privKey, {
    expiresIn: "72h",
    issuer: "Applick",
    audience: "applick",
    subject: "user-auth",
  });
}

export function verifyUserToken(token, privKey = "secretkey") {
  try {
    return jwt.verify(token, privKey, {
      issuer: "Applick",
      audience: "applick",
      subject: "user-auth",
    });
  } catch (error) {
    return false;
  }
}
