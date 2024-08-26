import os
from pymongo import MongoClient

mongo_username = os.getenv("MONGO_USERNAME")
mongo_password = os.getenv("MONGO_PASSWORD")
mongo_host = os.getenv("MONGO_URL")

mongo_uri = f"mongodb+srv://{mongo_username}:{mongo_password}@{mongo_host}/?retryWrites=true&w=majority"

client = MongoClient(mongo_uri)
