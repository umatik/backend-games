import { createClient } from "redis";
import { SettingsIntegrationProvider } from "@/integrations/integration-provider.js";
import { SecretCipher } from "@/settings/secret-cipher.js";
import { SettingsService } from "@/services/settings.service.js";
import { SettingsPostgresRepository } from "@/repositories/settings/settings-postgres.repository.js";
import { SettingsController } from "@/controllers/settings.controller.js";
import { createSettingsRouter } from "@/routes/settings.routes.js";
import { RecordLookupService } from "@/services/record-lookup.service.js";
import { RecordLookupController } from "@/controllers/record-lookup.controller.js";
import { createRecordLookupRouter } from "@/routes/record-lookup.routes.js";
import multer from "multer";

import { pool } from "@/database/db.js";
import type { ProductDetails } from "@/types/product.types.js";

import { RedisCache } from "@/cache/redis-cache.js";
import { LocalStorage } from "@/storage/local-storage.js";
import { PendingUploadPostgresRepository } from "@/repositories/pending-upload/pending-upload-postgres.repository.js";

import { AuthenticationPostgresRepository } from "@/repositories/authentication/authentication-postgres.repository.js";
import { OrderPostgresRepository } from "@/repositories/order/order-postgres.repository.js";
import { PasswordResetTokenPostgresRepository } from "@/repositories/password-reset-token/password-reset-token-postgres.repository.js";
import { PermissionPostgresRepository } from "@/repositories/permissions/permission-postgres.repository.js";
import { PostgresProductRepository } from "@/repositories/products/product/product-postgres.repository.js";
import { PostgresProductVariantRepository } from "@/repositories/products/product-variant/product-variant-postgres.repository.js";
import { ProductVariantMediaPostgresRepository } from "@/repositories/products/product-media/product-variant-media-postgres.repository.js";
import { RolePostgresRepository } from "@/repositories/role/role-postgres.repository.js";
import { UserContactPostgresRepository } from "@/repositories/user/user-contact-postgres.repository.js";
import { UserPostgresRepository } from "@/repositories/user/user-postgres.repository.js";

import { AuthenticationController } from "@/controllers/authentication.controller.js";
import { OrderController } from "@/controllers/order.controller.js";
import { ProductController } from "@/controllers/product.controller.js";
import { ProductVariantMediaController } from "@/controllers/product-variant-media.controller.js";
import { UserController } from "@/controllers/user.controller.js";

import { createAuthRouter } from "@/routes/authentication.routes.js";
import { createOrderRouter } from "@/routes/order.routes.js";
import { createProductRouter } from "@/routes/product.routes.js";
import { createProductVariantMediaRoutes } from "@/routes/product-variant-media.routes.js";
import { createUserRouter } from "@/routes/user.routes.js";

import { AuthenticationService } from "@/services/authentication.service.js";
import { AuthorizationService } from "@/services/authorization.service.js";
import { EmailService } from "@/services/email.service.js";
import { JwtService } from "@/services/jwt.service.js";
import { OrderService } from "@/services/order.service.js";
import { PasswordResetService } from "@/services/password-reset.service.js";
import { ProductService } from "@/services/product.service.js";
import { ProductVariantMediaService } from "@/services/product-variant-media.service.js";
import { UserService } from "@/services/user.service.js";
import { PassThroughAudioProcessor } from "@/audio/pass-through-audio-processor.js";
import {
  type ExchangeRateProvider,
  FixedExchangeRateProvider,
  NbpExchangeRateProvider,
} from "@/services/exchange-rate.service.js";

// Redis
export const redisClient = createClient({
  url: "redis://localhost:6379",
});

redisClient.on("error", (error) => {
  console.error("Redis error:", error);
});

try {
  await redisClient.connect();
} catch (error) {
  console.error(
    "Redis unavailable. Starting application without Redis cache.",
    error,
  );
}

// Authentication
const authRepository = new AuthenticationPostgresRepository();
const jwtService = new JwtService();

const authService = new AuthenticationService(authRepository, jwtService, pool);

const authController = new AuthenticationController(authService);

export const authRouter = createAuthRouter(authController);

// Authorization
const permissionRepository = new PermissionPostgresRepository();

const authorizationService = new AuthorizationService(
  permissionRepository,
  pool,
);

// Product
const productRepository = new PostgresProductRepository();
const productVariantRepository = new PostgresProductVariantRepository();

const productVariantMediaRepository =
  new ProductVariantMediaPostgresRepository();

const productCache = new RedisCache<{
  products: ProductDetails[];
  total: number;
}>(redisClient);

const storage = new LocalStorage();
const pendingUploadRepository = new PendingUploadPostgresRepository();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB
  },
});

const productVariantMediaService = new ProductVariantMediaService(
  productVariantMediaRepository,
  storage,
  pool,
  productCache,
  new PassThroughAudioProcessor(),
);

// Ustawienia sklepu (panel admina). Sekrety są szyfrowane kluczem z SETTINGS_ENCRYPTION_KEY;
// w testach używamy stałego klucza testowego.
const isTest = process.env.NODE_ENV === "test";

const encryptionKey =
  process.env.SETTINGS_ENCRYPTION_KEY ??
  (isTest ? "MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=" : undefined);

const createSecretCipher = (): SecretCipher | null => {
  if (!encryptionKey) {
    console.warn("SETTINGS_ENCRYPTION_KEY is not set: secrets cannot be saved in settings.");
    return null;
  }

  try {
    return new SecretCipher(encryptionKey);
  } catch (error) {
    console.error("Invalid SETTINGS_ENCRYPTION_KEY:", error);
    return null;
  }
};

const settingsService = new SettingsService(
  new SettingsPostgresRepository(),
  pool,
  createSecretCipher(),
);

// Kurs EUR → PLN: stały z EUR_PLN_RATE (w testach domyślnie 4.3), inaczej NBP z cache w Redis,
// a gdy NBP zawiedzie, kurs zapasowy z ustawień.
const fixedEurPlnRate = process.env.EUR_PLN_RATE ?? (isTest ? "4.3" : undefined);

const exchangeRates: ExchangeRateProvider = fixedEurPlnRate
  ? new FixedExchangeRateProvider(Number(fixedEurPlnRate))
  : new NbpExchangeRateProvider(
      new RedisCache<number>(redisClient),
      async () => (await settingsService.get("eurPlnFallbackRate")) ?? null,
    );

const productService = new ProductService(
  productRepository,
  productVariantRepository,
  pool,
  productCache,
  storage,
  exchangeRates,
  pendingUploadRepository,
  productVariantMediaRepository,
);

const productController = new ProductController(productService);

const productVariantMediaController = new ProductVariantMediaController(
  productVariantMediaService,
);

export const productRouter = createProductRouter(
  productController,
  authorizationService,
);

export const productVariantMediaRouter = createProductVariantMediaRoutes(
  productVariantMediaController,
  upload,
);

// Rozpoznawanie płyt (Claude + Discogs). Klucze i model pochodzą z ustawień; bez nich endpointy odpowiadają 503.
// W testach integracje są zawsze wyłączone, żeby testy nie łączyły się z siecią.
const integrations = new SettingsIntegrationProvider(settingsService, {
  enabled: !isTest && process.env.INTEGRATIONS_ENABLED !== "false",
});

const recordLookupService = new RecordLookupService(
  integrations,
  storage,
  pendingUploadRepository,
  pool,
);

export const recordLookupRouter = createRecordLookupRouter(
  new RecordLookupController(recordLookupService, productService),
  authorizationService,
  upload,
);

export const settingsRouter = createSettingsRouter(
  new SettingsController(settingsService, integrations),
  authorizationService,
);

// Order
const orderRepository = new OrderPostgresRepository();

const orderService = new OrderService(orderRepository, pool, productCache);

const orderController = new OrderController(orderService, authorizationService);

export const orderRouter = createOrderRouter(
  orderController,
  authorizationService,
);

// User
const userRepository = new UserPostgresRepository();
const userContactRepository = new UserContactPostgresRepository();
const roleRepository = new RolePostgresRepository();

const userService = new UserService(
  userRepository,
  userContactRepository,
  roleRepository,
  pool,
);

const passwordResetTokenRepository = new PasswordResetTokenPostgresRepository();

const emailService = new EmailService();

const passwordResetService = new PasswordResetService(
  userRepository,
  passwordResetTokenRepository,
  pool,
  emailService,
);

const userController = new UserController(
  userService,
  authorizationService,
  passwordResetService,
);

export const userRouter = createUserRouter(
  userController,
  authorizationService,
);

export { authorizationService };
