const jwt = require("jsonwebtoken");

class JwtService {
  constructor(secretKey, jwtExpiration) {
    this.secretKey = secretKey;
    this.jwtExpiration = jwtExpiration; // In milliseconds
  }

  extractEmail(token) {
    return this.extractClaim(token, (claims) => claims.sub);
  }

  extractClaim(token, claimResolver) {
    const claims = this.extractAllClaims(token);
    return claimResolver(claims);
  }

  generateToken(userAuth) {
    return this.generateTokenWithClaims({}, userAuth);
  }

  generateTokenWithClaims(extraClaims, userAuth) {
    return this.buildToken(extraClaims, userAuth, this.jwtExpiration);
  }

  getExpirationTime() {
    return this.jwtExpiration;
  }

  buildToken(extraClaims, userAuth, expiration) {
    const userRoles = userAuth.authorities.map((auth) => auth.authority);

    return jwt.sign(
      {
        ...extraClaims,
        roles: userRoles,
        sub: userAuth.email,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + expiration / 1000,
      },
      this.secretKey,
      { algorithm: "HS256" }
    );
  }

  isTokenValid(token, userAuth) {
    try {
      const email = this.extractEmail(token);
      return email === userAuth.email && !this.isTokenExpired(token);
    } catch (err) {
      console.log("err", err);
      return false;
    }
  }

  isTokenExpired(token) {
    return this.extractExpiration(token) < Date.now() / 1000;
  }

  extractExpiration(token) {
    return this.extractClaim(token, (claims) => claims.exp);
  }

  extractAllClaims(token) {
    console.log(
      ' jwt.verify(token, this.secretKey, { algorithms: ["HS256"] })',
      jwt.verify(token, this.secretKey, { algorithms: ["HS256"] })
    );
    return jwt.verify(token, this.secretKey, { algorithms: ["HS256"] });
  }
}

module.exports = JwtService;
