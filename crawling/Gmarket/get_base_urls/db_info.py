import os
from pymongo import MongoClient

mongo_username = os.getenv("MONGO_USERNAME")
mongo_password = os.getenv("MONGO_PASSWORD")
mongo_host = os.getenv("MONGO_URL")
# 테스트 계정 정보 (사용자 환경 변수로 대체 가능)
mongo_username = "gu"
mongo_password = "gh15985321"
mongo_host = "swdc-cluster01.whgi16p.mongodb.net"
mongo_uri = f"mongodb+srv://{mongo_username}:{mongo_password}@{mongo_host}/?retryWrites=true&w=majority"
client = MongoClient(mongo_uri)
