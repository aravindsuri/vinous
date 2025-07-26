from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import os
from dotenv import load_dotenv
from openai import OpenAI
from supabase import create_client, Client
import base64
from PIL import Image
import io
from typing import Optional, Dict, Any
import json
import re
import socket
import requests


load_dotenv()

app = FastAPI(
    title="Vinous API",
    description="AI-powered wine label scanning API for Vinous app",
    version="1.0.0"
)

# CORS middleware for React Native
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize clients
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
supabase: Client = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_SERVICE_KEY")  # Use service key instead of anon key
)

def extract_json_from_response(text: str) -> dict:
    """Extract JSON from OpenAI response, handling markdown formatting"""
    try:
        # First, try to parse as direct JSON
        return json.loads(text)
    except json.JSONDecodeError:
        try:
            # Try to extract JSON from markdown code blocks
            json_match = re.search(r'`(?:json)?\s*(\{.*?\})\s*`', text, re.DOTALL)
            if json_match:
                json_str = json_match.group(1)
                return json.loads(json_str)
            
            # Try to find JSON object without markdown
            json_match = re.search(r'\{.*\}', text, re.DOTALL)
            if json_match:
                json_str = json_match.group(0)
                return json.loads(json_str)
                
        except json.JSONDecodeError:
            pass
    
    # If all parsing fails, return default structure
    return {
        "name": "Unknown Wine",
        "winery": "Unknown Winery",
        "vintage": "Unknown",
        "region": "Unknown",
        "country": "Unknown",
        "grape_variety": "Unknown",
        "alcohol_content": "Unknown",
        "wine_type": "red",
        "description": text,
        "confidence": 0.5
    }

@app.get("/")
async def root():
    return {"message": "Vinous API is running", "app": "Vinous Wine Scanner"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "vinous-api"}


@app.get("/debug/network")
async def debug_network():
    """Debug network connectivity to Supabase"""
    results = {}
    
    # Test DNS resolution
    try:
        ip = socket.gethostbyname("tbnmmnquvvqjcchbovo.supabase.co")
        results["dns_resolution"] = f"Success: {ip}"
    except Exception as e:
        results["dns_resolution"] = f"Failed: {str(e)}"
    
    # Test HTTP connection
    try:
        response = requests.get("https://tbnmmnquvvqjcchbovo.supabase.co", timeout=10)
        results["http_connection"] = f"Success: {response.status_code}"
    except Exception as e:
        results["http_connection"] = f"Failed: {str(e)}"
    
    # Test with different URL format
    try:
        response = requests.get("https://supabase.co", timeout=10)
        results["supabase_main_site"] = f"Success: {response.status_code}"
    except Exception as e:
        results["supabase_main_site"] = f"Failed: {str(e)}"
    
    return results


@app.post("/api/v1/scan-wine-label")
async def scan_wine_label(file: UploadFile = File(...)):
    """
    Scan wine label using OpenAI Vision API
    """
    try:
        print(f"Received file: {file.filename}, content type: {file.content_type}")
        
        # Validate file type
        if not file.content_type or not file.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="File must be an image")
        
        # Read and process image
        image_data = await file.read()
        print(f"Image data size: {len(image_data)} bytes")
        
        # Convert to base64 for OpenAI API
        base64_image = base64.b64encode(image_data).decode('utf-8')
        print("Image converted to base64")
        
        # Call OpenAI Vision API
        print("Calling OpenAI Vision API...")
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": """Analyze this wine label image and extract the following information. Return ONLY a valid JSON object without any markdown formatting or code blocks:
                            {
                                "name": "wine name or null",
                                "winery": "winery name or null",
                                "vintage": "year or null",
                                "region": "wine region or null",
                                "country": "country or null",
                                "grape_variety": "grape varieties or null",
                                "alcohol_content": "alcohol percentage or null",
                                "wine_type": "red/white/rosé/sparkling or null",
                                "description": "brief description or null",
                                "confidence": "confidence level 0-1"
                            }"""
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{base64_image}"
                            }
                        }
                    ]
                }
            ],
            max_tokens=500,
        )
        
        print("OpenAI API response received")
        
        # Parse response
        wine_info_text = response.choices[0].message.content
        print(f"OpenAI raw response: {wine_info_text}")
        
        # Extract JSON from response
        wine_info = extract_json_from_response(wine_info_text)
        print(f"Parsed wine info: {wine_info}")
        
        return JSONResponse(content={
            "success": True,
            "data": wine_info,
            "message": "Wine label scanned successfully"
        })
        
    except Exception as e:
        print(f"Error processing image: {str(e)}")
        print(f"Error type: {type(e).__name__}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error processing image: {str(e)}")

@app.get("/api/v1/wines")
async def get_wines():
    """
    Get all scanned wines from database
    """
    try:
        # Debug environment variables
        supabase_url = os.getenv("SUPABASE_URL")
        supabase_key = os.getenv("SUPABASE_SERVICE_KEY")
        
        print(f"Environment variables:")
        print(f"SUPABASE_URL: '{supabase_url}'")
        print(f"SUPABASE_URL length: {len(supabase_url) if supabase_url else 'None'}")
        print(f"SUPABASE_SERVICE_KEY exists: {bool(supabase_key)}")
        print(f"All env vars containing 'SUPABASE': {[k for k in os.environ.keys() if 'SUPABASE' in k]}")
        
        if not supabase_url:
            return JSONResponse(content={
                "success": False,
                "data": [],
                "message": "SUPABASE_URL environment variable not found"
            })
            
        if not supabase_key:
            return JSONResponse(content={
                "success": False,
                "data": [],
                "message": "SUPABASE_SERVICE_KEY environment variable not found"
            })
        
        print("Attempting to query wines table...")
        response = supabase.table('wines').select('*').execute()
        print(f"Success! Retrieved {len(response.data)} wines")
        
        return JSONResponse(content={
            "success": True,
            "data": response.data,
            "message": f"Retrieved {len(response.data)} wines"
        })
    except Exception as e:
        print(f"Database error: {str(e)}")
        print(f"Error type: {type(e).__name__}")
        return JSONResponse(content={
            "success": False,
            "data": [],
            "message": f"Database error: {str(e)}"
        })

@app.post("/api/v1/wines")
async def save_wine(wine_data: dict):
    """
    Save wine information to database
    """
    try:
        response = supabase.table('wines').insert(wine_data).execute()
        return JSONResponse(content={
            "success": True,
            "data": response.data,
            "message": "Wine saved successfully"
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error saving wine: {str(e)}")