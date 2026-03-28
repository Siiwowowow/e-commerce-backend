import app from "./app";
import { envVars } from "./config/env";
import { seedSuperAdmin } from "./config/seed";

const bootstrap = async () => {
  try {
    await seedSuperAdmin();
    app.listen(envVars.PORT, () => {
      console.log(`Server is running on http://localhost:${envVars.PORT}`); 
    });
    } catch (error) {
    console.error("Error starting the server:", error);
  }
};

bootstrap();