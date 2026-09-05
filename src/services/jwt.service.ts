import jwt from "jsonwebtoken";

export class JwtService {
  private readonly secret: string;

  constructor() {
    const secret = process.env.JWT_SECRET;

    if (!secret) {
      throw new Error("JWT_SECRET is not defined");
    }

    this.secret = secret;
  }

  generateToken(userId: string, email: string): string {
    return jwt.sign(
      {
        userId,
        email,
      },
      this.secret,
      {
        expiresIn: "1h",
      },
    );
  }
}
