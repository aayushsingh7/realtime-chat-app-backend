import { Router } from "express";
import statusController from "../controllers/statusController";
const statusRoutes = Router();

statusRoutes.get("/status", statusController.getStatus);
statusRoutes.post("/status/add", statusController.addStatus);
statusRoutes.put("/status/seen", statusController.statusSeen);
statusRoutes.delete("/status/delete", statusController.removeStatus);

export default statusRoutes;
