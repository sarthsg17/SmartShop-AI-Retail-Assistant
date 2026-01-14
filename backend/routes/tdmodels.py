from fastapi import APIRouter
import os

model_router = APIRouter()

@model_router.get("/tdmodels")
def list_3d_models():
    model_dir = "static/3Dmodels"
    if not os.path.exists(model_dir):
        return []
    glb_files = [f for f in os.listdir(model_dir) if f.endswith(".glb")]
    return [{"name": os.path.splitext(f)[0], "file": f"/static/3Dmodels/{f}"} for f in glb_files]
