from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, date, timedelta
from collections import defaultdict

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Define Models
class TimeEntry(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    start_time: str  # Format: "HH:MM AM/PM"
    end_time: str    # Format: "HH:MM AM/PM"
    date: str        # Format: "YYYY-MM-DD"
    description: str
    tag: str
    duration_minutes: int
    created_at: datetime = Field(default_factory=datetime.utcnow)

class TimeEntryCreate(BaseModel):
    start_time: str
    end_time: str
    date: str
    description: str
    tag: str

class WeeklyStats(BaseModel):
    tag: str
    current_week_avg: float
    previous_week_avg: float
    change_percentage: float
    trend: str  # "increasing", "decreasing", "stable"

def parse_time_to_minutes(time_str: str) -> int:
    """Convert time string like '1:25 PM' to minutes since midnight"""
    try:
        time_part, am_pm = time_str.split()
        hours, minutes = map(int, time_part.split(':'))
        
        if am_pm.upper() == 'PM' and hours != 12:
            hours += 12
        elif am_pm.upper() == 'AM' and hours == 12:
            hours = 0
            
        return hours * 60 + minutes
    except:
        return 0

def calculate_duration(start_time: str, end_time: str) -> int:
    """Calculate duration in minutes between start and end time"""
    start_minutes = parse_time_to_minutes(start_time)
    end_minutes = parse_time_to_minutes(end_time)
    
    # Handle overnight entries
    if end_minutes < start_minutes:
        end_minutes += 24 * 60
    
    return end_minutes - start_minutes

# Routes
@api_router.get("/")
async def root():
    return {"message": "Time Tracking API"}

@api_router.post("/time-entries", response_model=TimeEntry)
async def create_time_entry(entry_data: TimeEntryCreate):
    # Calculate duration
    duration = calculate_duration(entry_data.start_time, entry_data.end_time)
    
    entry_dict = entry_data.dict()
    entry_dict['duration_minutes'] = duration
    
    time_entry = TimeEntry(**entry_dict)
    await db.time_entries.insert_one(time_entry.dict())
    return time_entry

@api_router.get("/time-entries", response_model=List[TimeEntry])
async def get_time_entries(date: Optional[str] = None):
    query = {}
    if date:
        query['date'] = date
    
    entries = await db.time_entries.find(query).sort('start_time', 1).to_list(1000)
    return [TimeEntry(**entry) for entry in entries]

@api_router.get("/analytics/daily/{date}")
async def get_daily_analytics(date: str):
    entries = await db.time_entries.find({'date': date}).to_list(1000)
    
    tag_totals = defaultdict(int)
    total_tracked = 0
    
    for entry in entries:
        tag_totals[entry['tag']] += entry['duration_minutes']
        total_tracked += entry['duration_minutes']
    
    return {
        'date': date,
        'tag_totals': dict(tag_totals),
        'total_tracked_minutes': total_tracked,
        'total_tracked_hours': round(total_tracked / 60, 2),
        'entries_count': len(entries)
    }

@api_router.get("/analytics/weekly", response_model=List[WeeklyStats])
async def get_weekly_analytics():
    today = date.today()
    
    # Current week (Monday to Sunday)
    current_week_start = today - timedelta(days=today.weekday())
    current_week_end = current_week_start + timedelta(days=6)
    
    # Previous week
    previous_week_start = current_week_start - timedelta(days=7)
    previous_week_end = previous_week_start + timedelta(days=6)
    
    # Get current week data
    current_week_entries = await db.time_entries.find({
        'date': {
            '$gte': current_week_start.strftime('%Y-%m-%d'),
            '$lte': current_week_end.strftime('%Y-%m-%d')
        }
    }).to_list(1000)
    
    # Get previous week data
    previous_week_entries = await db.time_entries.find({
        'date': {
            '$gte': previous_week_start.strftime('%Y-%m-%d'),
            '$lte': previous_week_end.strftime('%Y-%m-%d')
        }
    }).to_list(1000)
    
    # Calculate averages by tag
    current_week_totals = defaultdict(int)
    previous_week_totals = defaultdict(int)
    
    for entry in current_week_entries:
        current_week_totals[entry['tag']] += entry['duration_minutes']
    
    for entry in previous_week_entries:
        previous_week_totals[entry['tag']] += entry['duration_minutes']
    
    # Calculate weekly averages (divide by 7 days)
    all_tags = set(current_week_totals.keys()) | set(previous_week_totals.keys())
    
    weekly_stats = []
    for tag in all_tags:
        current_avg = current_week_totals[tag] / 7  # Average per day
        previous_avg = previous_week_totals[tag] / 7
        
        if previous_avg > 0:
            change_percentage = ((current_avg - previous_avg) / previous_avg) * 100
        else:
            change_percentage = 100 if current_avg > 0 else 0
        
        if abs(change_percentage) < 5:
            trend = "stable"
        elif change_percentage > 0:
            trend = "increasing"
        else:
            trend = "decreasing"
        
        weekly_stats.append(WeeklyStats(
            tag=tag,
            current_week_avg=round(current_avg, 1),
            previous_week_avg=round(previous_avg, 1),
            change_percentage=round(change_percentage, 1),
            trend=trend
        ))
    
    return weekly_stats

@api_router.get("/tags")
async def get_available_tags():
    """Get all unique tags used in time entries"""
    tags = await db.time_entries.distinct('tag')
    
    # Default tags from the user's example
    default_tags = ["Sleep", "Self-Care", "Unproductive", "Transit", "Class (Blocked)", "Productive"]
    
    # Combine and deduplicate
    all_tags = list(set(default_tags + tags))
    return sorted(all_tags)

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
