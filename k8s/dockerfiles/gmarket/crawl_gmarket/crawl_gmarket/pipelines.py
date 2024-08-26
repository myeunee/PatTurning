from pymongo import MongoClient, UpdateOne
from itemadapter import ItemAdapter
import gc
import os


class MongoDBPipeline:
    def __init__(self):
        self.items_processed = 0  # items_processed 초기화
        self.batch = []

    def open_spider(self, spider):
        # airflow on k8s로부터 받은 k8s secret
        mongo_username = os.getenv("MONGO_USERNAME")
        mongo_password = os.getenv("MONGO_PASSWORD")
        mongo_host = os.getenv("MONGO_URL")

        mongo_uri = f"mongodb+srv://{mongo_username}:{mongo_password}@{mongo_host}/?retryWrites=true&w=majority"

        self.client = MongoClient(mongo_uri)
        self.db = self.client["product_price_db"]
        self.collection = self.db["Gmarket_product_coll"]

        # 카테고리에 대한 인덱스 생성
        self.collection.create_index([("category_id", 1)])

    def close_spider(self, spider):
        # 남은 배치 존재하는 경우 Write
        if self.batch:
            self.collection.bulk_write(self.batch)
            self.batch.clear()
        # Mongo Client 종료
        self.client.close()
        gc.collect()

    def process_item(self, item, spider):
        adapter = ItemAdapter(item)
        category_id = adapter.get("category_id")
        product_id = adapter.get("product_id")
        reg_price = adapter.get("reg_price")
        sale_price = adapter.get("sale_price")
        date = adapter.get("date")

        # 가격 int로 변환
        if reg_price:
            reg_price = int(reg_price.replace(",", ""))
        if sale_price:
            sale_price = int(sale_price.replace(",", ""))

        price_data = {date: sale_price if sale_price else reg_price}

        # 1. category_id에 해당하는 document에 현재 product_id에 대한 정보가 있는 경우
        update_operation = UpdateOne(
            {"category_id": category_id, "products.product_id": product_id},
            {"$addToSet": {"products.$.prices": price_data}},
            upsert=False,
        )

        # 2. category_id에 해당하는 document에 현재 product_id에 대한 정보가 없는 경우
        insert_operation_existing_category = UpdateOne(
            {"category_id": category_id, "products.product_id": {"$ne": product_id}},
            {"$push": {"products": {"product_id": product_id, "prices": [price_data]}}},
            upsert=False,
        )

        # 두 개의 연산을 순차적으로 실행
        self.batch.extend([update_operation, insert_operation_existing_category])

        # 배치 크기 조정
        self.items_processed += 1
        # 1,000개씩 배치 처리
        if len(self.batch) >= 1000:  # 필요 시 배치 크기 조정
            self.collection.bulk_write(self.batch)
            self.batch.clear()
            gc.collect()

        # 메모리에서 Item 제거
        del item
        return None
