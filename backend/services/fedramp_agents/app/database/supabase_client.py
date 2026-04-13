import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL", "https://ehyvnclzcmazhxcdwsxn.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVoeXZuY2x6Y21hemh4Y2R3c3huIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjE1ODYwOSwiZXhwIjoyMDg3NzM0NjA5fQ.qKsWEYQcmLPnihlv0pix6HyCaLm5thS4fcfaiexKcQY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("Missing SUPABASE_URL or SUPABASE_KEY in environment.")

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)