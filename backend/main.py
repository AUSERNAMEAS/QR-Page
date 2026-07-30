import os
import uuid
from enum import Enum
from pathlib import Path

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pymongo.database import Database

from database import get_db
from qr_service import generate_qr_base64

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

SCAN_BASE_URL = os.getenv("SCAN_BASE_URL", "http://localhost:5173")

app = FastAPI(title="QR Kit Generator")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


class KitType(str, Enum):
    KIT1 = "KIT1"
    KIT2 = "KIT2"


class CodigoRequest(BaseModel):
    kit: KitType


class CodigoResponse(BaseModel):
    id: str
    url: str
    qr_image: str


@app.post("/api/codigos", response_model=CodigoResponse)
def crear_codigo(payload: CodigoRequest, db: Database = Depends(get_db)):
    unique_id = str(uuid.uuid4())
    db.codigos.insert_one({"_id": unique_id, "registrado": False})

    scan_url = f"{SCAN_BASE_URL}/scan/{payload.kit.value}/{unique_id}"
    qr_image = generate_qr_base64(scan_url)

    return CodigoResponse(
        id=unique_id,
        url=scan_url,
        qr_image=qr_image,
    )


@app.post("/api/codigos/{id}/scan")
def registrar_escaneo(id: str, db: Database = Depends(get_db)):
    codigo = db.codigos.find_one({"_id": id})
    if not codigo:
        raise HTTPException(status_code=404, detail="Codigo no encontrado")
    
    registrado_previo = codigo.get("registrado", False)
    if not registrado_previo:
        db.codigos.update_one({"_id": id}, {"$set": {"registrado": True}})
        registrado_actual = True
    else:
        registrado_actual = registrado_previo
        
    return {
        "id": id,
        "registrado_previo": registrado_previo,
        "registrado": registrado_actual
    }

