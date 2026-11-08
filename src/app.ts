import "@/config/env.js";
import helmet from "helmet";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import openapi from "@/docs/openapi.js";
import express, { type ErrorRequestHandler } from "express";
import multer from "multer";

import {
  productRouter,
  productVariantMediaRouter,
  recordLookupRouter,
  settingsRouter,
  orderRouter,
  userRouter,
  authRouter,
} from "./dependency-injection.js";
import { AppError } from "@/errors/app.error.js";
import { parseCorsOrigins, uploadsPath } from "@/config/http.js";
import { ValidationError } from "@/errors/validation.error.js";
import { toLoggableError } from "@/errors/loggable-error.js";

const app = express();

// Adds security-related HTTP headers to protect the API from common web attacks.
app.use(helmet());

app.use(
  cors({
    origin: parseCorsOrigins(process.env.CORS_ORIGIN),
  }),
);

app.use(express.json({ limit: "1mb" }));

// Middleware, Request logging
app.use((req, res, next) => {
  const startedAt = Date.now();

  res.on("finish", () => {
    console.log(
      `${new Date().toISOString()} ${req.ip} ${req.method} ${req.originalUrl} ${
        res.statusCode
      } ${Date.now() - startedAt}ms`,
    );
  });

  next();
});

app.get("/", (req, res) => {
  res.json({
    message: "E-commerce API is running",
  });
});

// Pliki z LocalStorage (zdjęcia, nagrania). Nazwy plików są unikalne, więc przeglądarka może je długo trzymać w cache.
// Helmet domyślnie blokuje wczytywanie zasobów z innej domeny, a panel i sklep działają pod innymi adresami niż API.
app.use(
  "/uploads",
  (_req, res, next) => {
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    next();
  },
  express.static(uploadsPath, {
    index: false,
    dotfiles: "ignore",
    redirect: false,
    immutable: true,
    maxAge: "30d",
  }),
);

// Specyfikacja OpenAPI jako JSON, np. do generowania typów w panelu.
app.get("/api-docs.json", (_req, res) => {
  res.json(openapi);
});

// Kolejność ma znaczenie: /products/lookup musi być przed /products/:id.
app.use("/products", recordLookupRouter);
app.use("/products", productRouter);
app.use("/products", productVariantMediaRouter);
app.use("/orders", orderRouter);
app.use("/settings", settingsRouter);
app.use("/users", userRouter);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(openapi));

app.use(authRouter);

// 404
app.use((req, res) => {
  res.status(404).json({
    message: "Route not found",
  });
});

// 500
const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  console.error(
    `${new Date().toISOString()} ERROR ${req.ip} ${req.method} ${req.originalUrl}`,
    toLoggableError(err),
  );

  if (err?.type === "entity.too.large") {
    res.status(413).json({
      message: "Request body too large",
    });

    return;
  }

  if (err instanceof multer.MulterError) {
    res.status(err.code === "LIMIT_FILE_SIZE" ? 413 : 400).json({
      message: err.message,
    });

    return;
  }

  if (err instanceof ValidationError) {
    res.status(err.statusCode).json({
      message: err.message,
      errors: err.errors,
    });

    return;
  }

  // Komunikat parsera potrafi zacytować fragment body (np. klucz API), więc nie odsyłamy go klientowi.
  if (err?.type === "entity.parse.failed") {
    res.status(400).json({
      message: "Malformed JSON",
    });

    return;
  }

  // Błędy klienta z bibliotek Express (np. ścieżka z „..” w /uploads) mają własny status 4xx.
  if (
    typeof err?.status === "number" &&
    err.status >= 400 &&
    err.status < 500 &&
    !(err instanceof AppError)
  ) {
    res.status(err.status).json({
      message: err.expose && typeof err.message === "string" ? err.message : "Bad Request",
    });

    return;
  }

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      message: err.message,
    });

    return;
  }

  res.status(500).json({
    message: "Internal Server Error",
  });
};

app.use(errorHandler);

export default app;
