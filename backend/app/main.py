from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import os
from dotenv import load_dotenv
from openai import OpenAI
from supabase import create_client, Client
import base64
from PIL import Image
import io
from typing import Optional, Dict, Any, List
import json
import re
import socket
import requests
import asyncio
import aiohttp
from datetime import datetime
import random

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

# Pydantic models
class WineData(BaseModel):
    name: Optional[str] = None
    winery: Optional[str] = None
    vintage: Optional[str] = None
    region: Optional[str] = None
    country: Optional[str] = None
    grape_variety: Optional[str] = None
    alcohol_content: Optional[str] = None
    wine_type: Optional[str] = None
    description: Optional[str] = None
    confidence: Optional[float] = None

class WineRatingRequest(BaseModel):
    wine_name: str
    winery: Optional[str] = None
    vintage: Optional[str] = None
    region: Optional[str] = None
    country: Optional[str] = None

class WinePriceRequest(BaseModel):
    wine_name: str
    winery: Optional[str] = None
    vintage: Optional[str] = None
    region: Optional[str] = None
    country: Optional[str] = None

class TastingNotesRequest(BaseModel):
    wine_name: str
    winery: Optional[str] = None
    grape_variety: Optional[str] = None
    wine_type: Optional[str] = None
    region: Optional[str] = None
    country: Optional[str] = None
    vintage: Optional[str] = None
    alcohol_content: Optional[str] = None

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

async def search_vivino_rating(wine_name: str, vintage: str = None, winery: str = None) -> Optional[Dict]:
    """Search Vivino for wine ratings (mock implementation)"""
    try:
        # This is a mock implementation - replace with actual Vivino API calls
        # For demo purposes, we'll simulate API responses
        await asyncio.sleep(0.5)  # Simulate API delay
        
        # Estimate rating based on wine characteristics
        base_rating = 3.8
        if vintage and int(vintage) < 2015:
            base_rating += 0.2  # Older wines might be rated higher
        if winery and any(premium in winery.lower() for premium in ['dom perignon', 'opus one', 'screaming eagle']):
            base_rating += 0.5
        
        rating = min(base_rating + random.uniform(-0.3, 0.4), 5.0)
        
        return {
            "rating": round(rating, 1),
            "max_rating": 5.0,
            "source": "Vivino",
            "review_count": random.randint(50, 500),
            "url": f"https://vivino.com/search/{wine_name.replace(' ', '-')}"
        }
    except Exception as e:
        print(f"Vivino search error: {e}")
        return None

async def search_wine_spectator_rating(wine_name: str, vintage: str = None, winery: str = None) -> Optional[Dict]:
    """Search Wine Spectator for wine ratings (mock implementation)"""
    try:
        # Mock implementation - replace with actual Wine Spectator API
        await asyncio.sleep(0.7)  # Simulate API delay
        
        # Estimate professional rating
        base_rating = 85
        if vintage and int(vintage) < 2015:
            base_rating += 3
        if winery and any(premium in winery.lower() for premium in ['caymus', 'silver oak', 'opus one']):
            base_rating += 5
            
        rating = min(base_rating + random.randint(-5, 8), 100)
        
        return {
            "rating": rating,
            "max_rating": 100,
            "source": "Wine Spectator",
            "review_count": 1,
            "description": f"Professional review for {wine_name}",
            "url": f"https://winespectator.com/search/{wine_name.replace(' ', '-')}"
        }
    except Exception as e:
        print(f"Wine Spectator search error: {e}")
        return None

async def search_wine_prices(wine_name: str, vintage: str = None, winery: str = None, region: str = None) -> List[Dict]:
    """Search for wine prices across multiple platforms"""
    try:
        # Mock implementation - replace with actual price APIs
        prices = []
        
        # Simulate different price sources
        base_price = 25
        
        # Adjust price based on characteristics
        if region:
            if any(premium in region.lower() for premium in ['napa', 'bordeaux', 'burgundy', 'champagne']):
                base_price *= 3
            elif any(mid in region.lower() for mid in ['chianti', 'rioja', 'rhone']):
                base_price *= 1.5
        
        if vintage:
            current_year = datetime.now().year
            vintage_year = int(vintage)
            if vintage_year < current_year - 10:
                base_price *= 1.5  # Older wines cost more
        
        # Generate mock prices from different sources
        sources = [
            {"name": "Wine.com", "markup": 1.0},
            {"name": "Total Wine", "markup": 0.85},
            {"name": "Vivino Marketplace", "markup": 0.95},
            {"name": "Wine-Searcher", "markup": 1.1}
        ]
        
        for source in sources:
            price = base_price * source["markup"] * random.uniform(0.9, 1.2)
            prices.append({
                "price": round(price, 2),
                "currency": "USD",
                "source": source["name"],
                "availability": "In Stock" if random.random() > 0.2 else "Limited",
                "url": f"https://{source['name'].lower().replace(' ', '')}.com/search/{wine_name.replace(' ', '-')}"
            })
        
        await asyncio.sleep(1.0)  # Simulate API delay
        return sorted(prices, key=lambda x: x["price"])
        
    except Exception as e:
        print(f"Price search error: {e}")
        return []

def estimate_wine_rating(wine_data: Dict) -> Dict:
    """Fallback rating estimation based on wine characteristics"""
    base_rating = 85
    
    # Adjust based on region
    region = wine_data.get("region", "").lower()
    prestigious_regions = ["bordeaux", "burgundy", "napa valley", "chianti classico", "barolo", "rioja"]
    if any(pr in region for pr in prestigious_regions):
        base_rating += 5
    
    # Adjust based on grape variety
    grape = wine_data.get("grape_variety", "").lower()
    premium_grapes = ["cabernet sauvignon", "pinot noir", "chardonnay", "sangiovese"]
    if any(pg in grape for pg in premium_grapes):
        base_rating += 3
    
    # Add randomness
    final_rating = base_rating + random.randint(-5, 10)
    
    return {
        "rating": min(max(final_rating, 75), 95),
        "max_rating": 100,
        "source": "Expert Estimate",
        "confidence": "estimated"
    }

def estimate_wine_price(wine_data: Dict) -> Dict:
    """Fallback price estimation based on wine characteristics"""
    base_price = 25
    
    # Adjust based on region
    region = wine_data.get("region", "").lower()
    if any(expensive in region for expensive in ["bordeaux", "burgundy", "napa", "champagne"]):
        base_price *= 2.5
    elif any(mid in region for mid in ["chianti", "rioja", "rhone"]):
        base_price *= 1.5
    
    # Adjust based on vintage
    vintage = wine_data.get("vintage")
    if vintage and vintage.isdigit():
        current_year = datetime.now().year
        if int(vintage) < current_year - 5:
            base_price *= 1.3
    
    final_price = base_price * random.uniform(0.8, 1.4)
    
    return {
        "price": round(final_price, 2),
        "currency": "USD",
        "source": "Market Estimate",
        "confidence": "estimated"
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

@app.post("/api/v1/wine-rating")
async def get_wine_rating(request: WineRatingRequest):
    """
    Fetch wine ratings from multiple sources
    """
    try:
        print(f"Fetching rating for: {request.wine_name}")
        
        # Search multiple sources concurrently
        tasks = [
            search_vivino_rating(request.wine_name, request.vintage, request.winery),
            search_wine_spectator_rating(request.wine_name, request.vintage, request.winery)
        ]
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Filter successful results
        ratings = [r for r in results if r is not None and not isinstance(r, Exception)]
        
        if ratings:
            # Return the highest rated from available sources
            best_rating = max(ratings, key=lambda x: x.get("rating", 0))
            return JSONResponse(content={
                "success": True,
                "data": best_rating,
                "all_ratings": ratings,
                "message": "Wine rating retrieved successfully"
            })
        else:
            # Fallback to estimated rating
            estimated = estimate_wine_rating(request.dict())
            return JSONResponse(content={
                "success": True,
                "data": estimated,
                "message": "Wine rating estimated (no online data found)"
            })
            
    except Exception as e:
        print(f"Rating fetch error: {e}")
        # Return estimated rating as fallback
        estimated = estimate_wine_rating(request.dict())
        return JSONResponse(content={
            "success": True,
            "data": estimated,
            "message": f"Fallback rating provided due to error: {str(e)}"
        })

@app.post("/api/v1/wine-price")
async def get_wine_price(request: WinePriceRequest):
    """
    Fetch wine prices from multiple sources
    """
    try:
        print(f"Fetching prices for: {request.wine_name}")
        
        # Search for prices
        prices = await search_wine_prices(
            request.wine_name, 
            request.vintage, 
            request.winery, 
            request.region
        )
        
        if prices:
            # Calculate average price
            avg_price = sum(p["price"] for p in prices) / len(prices)
            lowest_price = min(prices, key=lambda x: x["price"])
            
            return JSONResponse(content={
                "success": True,
                "data": {
                    "average_price": round(avg_price, 2),
                    "lowest_price": lowest_price,
                    "all_prices": prices,
                    "currency": "USD",
                    "updated_at": datetime.now().isoformat()
                },
                "message": "Wine prices retrieved successfully"
            })
        else:
            # Fallback to estimated price
            estimated = estimate_wine_price(request.dict())
            return JSONResponse(content={
                "success": True,
                "data": estimated,
                "message": "Wine price estimated (no online data found)"
            })
            
    except Exception as e:
        print(f"Price fetch error: {e}")
        # Return estimated price as fallback
        estimated = estimate_wine_price(request.dict())
        return JSONResponse(content={
            "success": True,
            "data": estimated,
            "message": f"Fallback price provided due to error: {str(e)}"
        })

@app.post("/api/v1/tasting-notes")
async def generate_tasting_notes(request: TastingNotesRequest):
    """
    Generate AI-powered tasting notes based on wine characteristics
    """
    try:
        print(f"Generating tasting notes for: {request.wine_name}")
        
        # Build context for AI
        wine_context = f"""
        Wine Name: {request.wine_name}
        Winery: {request.winery or 'Unknown'}
        Grape Variety: {request.grape_variety or 'Unknown'}
        Wine Type: {request.wine_type or 'Unknown'}
        Region: {request.region or 'Unknown'}, {request.country or 'Unknown'}
        Vintage: {request.vintage or 'Unknown'}
        Alcohol Content: {request.alcohol_content or 'Unknown'}
        """
        
        # Call OpenAI for tasting notes
        response = client.chat.completions.create(
            model="gpt-4",
            messages=[
                {
                    "role": "system",
                    "content": """You are a professional sommelier and wine expert with decades of experience. 
                    Generate detailed, authentic tasting notes for wines based on their characteristics. 
                    Focus on aroma, flavor profile, texture, and finish. Be specific and use professional 
                    wine tasting terminology. Keep it to 2-3 sentences that sound natural and expert-level."""
                },
                {
                    "role": "user",
                    "content": f"""Generate professional tasting notes for this wine:
                    
                    {wine_context}
                    
                    Please provide detailed tasting notes covering aroma, palate, and finish. 
                    Make it sound authentic and professional, as if written by a sommelier."""
                }
            ],
            max_tokens=200,
            temperature=0.7
        )
        
        tasting_notes = response.choices[0].message.content.strip()
        
        return JSONResponse(content={
            "success": True,
            "data": {
                "tasting_notes": tasting_notes,
                "generated_by": "AI Sommelier",
                "wine_context": request.dict(),
                "generated_at": datetime.now().isoformat()
            },
            "message": "Tasting notes generated successfully"
        })
        
    except Exception as e:
        print(f"Tasting notes generation error: {e}")
        
        # Fallback to grape-based notes
        grape_profiles = {
            "sangiovese": "Medium-bodied with bright acidity and firm tannins. Notes of cherry, plum, and herbs with earthy undertones. The finish is persistent with hints of leather and tobacco.",
            "cabernet sauvignon": "Full-bodied with structured tannins and dark fruit flavors. Aromas of blackcurrant, cedar, and vanilla with a long, elegant finish showing notes of chocolate and spice.",
            "pinot noir": "Light to medium-bodied with silky tannins. Delicate aromas of red cherry, strawberry, and violet with earthy minerality. The finish is smooth and refined.",
            "chardonnay": "Medium to full-bodied with balanced acidity. Flavors of green apple, citrus, and mineral notes. Creamy texture with a clean, refreshing finish.",
            "merlot": "Medium to full-bodied with soft tannins. Rich flavors of black cherry, plum, and chocolate with hints of herbs and vanilla. Smooth, approachable finish."
        }
        
        grape_variety = (request.grape_variety or "").lower()
        fallback_notes = grape_profiles.get(grape_variety, grape_profiles["sangiovese"])
        
        return JSONResponse(content={
            "success": True,
            "data": {
                "tasting_notes": fallback_notes,
                "generated_by": "Grape Profile Database",
                "wine_context": request.dict(),
                "generated_at": datetime.now().isoformat()
            },
            "message": f"Fallback tasting notes provided due to error: {str(e)}"
        })

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
async def save_wine(wine_data: WineData):
    """
    Save wine information to database
    """
    try:
        print(f"Attempting to save wine: {wine_data}")
        
        # Convert Pydantic model to dict and clean the data
        wine_dict = wine_data.dict()
        clean_data = {}
        for key, value in wine_dict.items():
            if value is not None and value != "null":
                clean_data[key] = value
        
        print(f"Clean data: {clean_data}")
        
        response = supabase.table('wines').insert(clean_data).execute()
        print(f"Supabase insert response: {response}")
        
        return JSONResponse(content={
            "success": True,
            "data": response.data,
            "message": "Wine saved successfully"
        })
    except Exception as e:
        print(f"Save wine error: {str(e)}")
        print(f"Error type: {type(e).__name__}")
        import traceback
        traceback.print_exc()
        
        return JSONResponse(content={
            "success": False,
            "data": [],
            "message": f"Error saving wine: {str(e)}"
        }, status_code=500)