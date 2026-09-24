import { AppError } from "@/errors/app.error.js";

export class JwtAudienceNotDefinedError extends AppError {
  constructor() {
    super("JWT_AUDIENCE is not defined", 500);
    this.name = "JwtAudienceNotDefinedError";
  }
}
