import { AppError } from "@/errors/app.error.js";

export class JwtIssuerNotDefinedError extends AppError {
  constructor() {
    super("JWT_ISSUER is not defined", 500);
    this.name = "JwtIssuerNotDefinedError";
  }
}
