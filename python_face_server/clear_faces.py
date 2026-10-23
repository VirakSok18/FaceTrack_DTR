from pymongo import MongoClient
import os
from dotenv import load_dotenv

load_dotenv()
MONGO_URI = os.getenv('MONGO_URI', 'mongodb://localhost:27017/employee_dtr')
client = MongoClient(MONGO_URI)
db = client['employee_dtr']
result = db.face_data.delete_many({})
print(f"Deleted {result.deleted_count} stale face records.")
