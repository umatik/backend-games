import nodemailer from "nodemailer";
import type { SendMailOptions, SentMessageInfo, Transporter } from "nodemailer";

import {
  beforeEach,
  describe,
  afterEach,
  jest,
  it,
  expect,
} from "@jest/globals";
import { EmailService } from "@/services/email.service.js";

describe("EmailService", () => {
  const sendMail = jest.fn(
    (mailOptions: SendMailOptions): Promise<SentMessageInfo> => {
      void mailOptions;

      return Promise.resolve({} as SentMessageInfo);
    },
  );

  beforeEach(() => {
    jest.clearAllMocks();

    jest.spyOn(nodemailer, "createTransport").mockReturnValue({
      sendMail,
    } as unknown as Transporter);

    process.env.SMTP_HOST = "localhost";
    process.env.SMTP_PORT = "1025";
    process.env.SMTP_SECURE = "false";
    process.env.SMTP_FROM = "no-reply@ecommerce.local";
    process.env.SMTP_USER = "";
    process.env.SMTP_PASSWORD = "";
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("should send password reset email", async () => {
    const emailService = new EmailService();

    await emailService.sendPasswordResetEmail(
      "alice@example.com",
      "test-reset-token",
    );

    expect(sendMail).toHaveBeenCalledTimes(1);

    const mailOptions = sendMail.mock.calls[0]?.[0];

    expect(mailOptions?.from).toBe("no-reply@ecommerce.local");
    expect(mailOptions?.to).toBe("alice@example.com");
    expect(mailOptions?.subject).toBe("Password reset");

    expect(mailOptions?.text).toBe(
      "Use the following password reset token: test-reset-token",
    );
  });
});
