import nodemailer from "nodemailer";

export class EmailService {
  private readonly transporter;
  private readonly from: string;

  constructor() {
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT ?? 587);
    const secure = process.env.SMTP_SECURE === "true";
    const user = process.env.SMTP_USER;
    const password = process.env.SMTP_PASSWORD;
    const from = process.env.SMTP_FROM;

    if (!host || !from) {
      throw new Error("SMTP configuration is incomplete");
    }

    this.from = from;

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      ...(user && password
        ? {
            auth: {
              user,
              pass: password,
            },
          }
        : {}),
    });
  }

  async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    await this.transporter.sendMail({
      from: this.from,
      to: email,
      subject: "Password reset",
      text: `Use the following password reset token: ${token}`,
    });
  }
}
