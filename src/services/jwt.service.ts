import jwt from "jsonwebtoken";
import type {StringValue} from "ms";
import {JwtSecretNotDefinedError} from "@/errors/jwt-secret-not-defined.error.js";
import {JwtExpiresInInvalidError} from "@/errors/jwt-expires-in-invalid.error.js";
import {JwtAlgorithmInvalidError} from "@/errors/jwt-algorithm-invalid.error.js";
import {JwtIssuerNotDefinedError} from "@/errors/jwt-issuer-not-defined.error.js";
import {JwtAudienceNotDefinedError} from "@/errors/jwt-audience-not-defined.error.js";

const isJwtAlgorithm = (value: string): value is jwt.Algorithm => {
  return [
    "HS256",
    "HS384",
    "HS512",
    "RS256",
    "RS384",
    "RS512",
    "ES256",
    "ES384",
    "ES512",
    "PS256",
    "PS384",
    "PS512",
  ].includes(value);
};

const isJwtExpiresIn = (value: string): value is StringValue => {
  return /^\d+(ms|s|m|h|d|w|y)?$/.test(value);
};

export class JwtService {
  private readonly secret: string;
  private readonly expiresIn: StringValue;
  private readonly algorithm: jwt.Algorithm;
  private readonly issuer: string;
  private readonly audience: string;

  constructor() {
    const secret = process.env.JWT_SECRET;
    const expiresIn = process.env.JWT_EXPIRES_IN;
    const algorithm = process.env.JWT_ALGORITHM;
    const issuer = process.env.JWT_ISSUER;
    const audience = process.env.JWT_AUDIENCE;

    if (!secret) {
      throw new JwtSecretNotDefinedError()
    }

    if (!expiresIn || !isJwtExpiresIn(expiresIn)) {
      throw new JwtExpiresInInvalidError();
    }

    if (!algorithm || !isJwtAlgorithm(algorithm)) {
      throw new JwtAlgorithmInvalidError()
    }

    if (!issuer) {
      throw new JwtIssuerNotDefinedError();
    }

    if (!audience) {
      throw new JwtAudienceNotDefinedError();
    }

    this.secret = secret;
    this.expiresIn = expiresIn;
    this.algorithm = algorithm;
    this.issuer = issuer;
    this.audience = audience;
  }

  generateToken(userId: string, email: string): string {
    return jwt.sign(
      {
        userId: String(userId),
        email,
      },
      this.secret,
      {
        expiresIn: this.expiresIn,
        algorithm: this.algorithm,
        issuer: this.issuer,
        audience: this.audience,
      },
    );
  }

  verifyToken(token: string): jwt.JwtPayload {
    const payload = jwt.verify(token, this.secret, {
      algorithms: [this.algorithm],
      issuer: this.issuer,
      audience: this.audience,
    });

    if (typeof payload === "string") {
      throw new Error("Invalid token payload");
    }

    return payload;
  }
}