import { PostgresProductRepository } from "./repositories/postgres-product.repository.js";
import { PostgresInventoryRepository } from "./repositories/postgres-inventory.repository.js";

import { ProductService } from "./services/product.service.js";
import { ProductController } from "./controllers/product.controller.js";
import { createProductRouter } from "./routes/product.routes.js";

import { PostgresOrderRepository } from "./repositories/postgres-order.repository.js";
import { OrderService } from "./services/order.service.js";
import { OrderController } from "./controllers/order.controller.js";
import { createOrderRouter } from "./routes/order.routes.js";

import { PostgresUserRepository } from "./repositories/postgres-user.repository.js";
import { PostgresUserContactRepository } from "./repositories/postgres-user-contact.repository.js";
import { UserService } from "./services/user.service.js";
import { UserController } from "./controllers/user.controller.js";
import { createUserRouter } from "./routes/user.routes.js";

import { PostgresAuthRepository } from "./repositories/postgres-auth.repository.js";
import { JwtService } from "./services/jwt.service.js";
import { AuthService } from "./services/auth.service.js";
import { AuthController } from "./controllers/auth.controller.js";
import { createAuthRouter } from "./routes/auth.routes.js";

const productRepository = new PostgresProductRepository();
const inventoryRepository = new PostgresInventoryRepository();

const productService = new ProductService(
  productRepository,
  inventoryRepository,
);

const productController = new ProductController(productService);
export const productRouter = createProductRouter(productController);

const orderRepository = new PostgresOrderRepository();
const orderService = new OrderService(orderRepository);
const orderController = new OrderController(orderService);
export const orderRouter = createOrderRouter(orderController);

const userRepository = new PostgresUserRepository();
const userContactRepository = new PostgresUserContactRepository();
const userService = new UserService(userRepository, userContactRepository);
const userController = new UserController(userService);
export const userRouter = createUserRouter(userController);

const authRepository = new PostgresAuthRepository();
const jwtService = new JwtService();
const authService = new AuthService(authRepository, jwtService);
const authController = new AuthController(authService);
export const authRouter = createAuthRouter(authController);
