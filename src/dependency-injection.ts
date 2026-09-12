import { PostgresProductRepository } from "./repositories/product/product-postgres.repository.js";
import { PostgresProductVariantRepository } from "./repositories/product-variant/product-variant-postgres.repository.js";

import { ProductService } from "./services/product.service.js";
import { ProductController } from "./controllers/product.controller.js";
import { createProductRouter } from "./routes/product.routes.js";

import { OrderPostgresRepository } from "./repositories/order/order-postgres.repository.js";
import { OrderService } from "./services/order.service.js";
import { OrderController } from "./controllers/order.controller.js";
import { createOrderRouter } from "./routes/order.routes.js";

import { UserPostgresRepository } from "./repositories/user/user-postgres.repository.js";
import { UserContactPostgresRepository } from "./repositories/user/user-contact-postgres.repository.js";
import { UserService } from "./services/user.service.js";
import { UserController } from "./controllers/user.controller.js";
import { createUserRouter } from "./routes/user.routes.js";

import { AuthenticationPostgresRepository } from "./repositories/authentication/authentication-postgres.repository.js";
import { JwtService } from "./services/jwt.service.js";
import { AuthenticationService } from "./services/authentication.service.js";
import { AuthenticationController } from "./controllers/authentication.controller.js";
import { createAuthRouter } from "./routes/authentication.routes.js";

import { PermissionPostgresRepository } from "./repositories/permissions/permission-postgres.repository.js";

import { pool } from "./database/db.js";
import { AuthorizationService } from "./services/authorization.service.js";

const productRepository = new PostgresProductRepository();
const productVariantRepository = new PostgresProductVariantRepository();

const productService = new ProductService(
  productRepository,
  productVariantRepository,
  pool,
);

const productController = new ProductController(productService);
export const productRouter = createProductRouter(productController);

const orderRepository = new OrderPostgresRepository();
const orderService = new OrderService(orderRepository, pool);
const orderController = new OrderController(orderService);
export const orderRouter = createOrderRouter(orderController);

const userRepository = new UserPostgresRepository();
const userContactRepository = new UserContactPostgresRepository();
const userService = new UserService(userRepository, userContactRepository);
const userController = new UserController(userService);
export const userRouter = createUserRouter(userController);

const authRepository = new AuthenticationPostgresRepository();
const jwtService = new JwtService();
const authService = new AuthenticationService(authRepository, jwtService, pool);
const authController = new AuthenticationController(authService);
export const authRouter = createAuthRouter(authController);

const permissionRepository = new PermissionPostgresRepository();
const authorizationService = new AuthorizationService(
  permissionRepository,
  pool,
);

export { authorizationService };
