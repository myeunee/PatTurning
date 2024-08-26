from pymongo import MongoClient, UpdateOne
from itemadapter import ItemAdapter
import gc
import os


class MongoDBPipeline:
    def __init__(self):
        self.items_processed = 0  # items_processed 초기화
        self.batch = []

    def open_spider(self, spider):
        mongo_username = os.getenv("MONGO_USERNAME", "gu")
        mongo_password = os.getenv("MONGO_PASSWORD", "gh15985321")
        mongo_host = os.getenv("MONGO_URL", "swdc-cluster01.whgi16p.mongodb.net")

        mongo_uri = f"mongodb+srv://{mongo_username}:{mongo_password}@{mongo_host}/?retryWrites=true&w=majority"

        self.client = MongoClient(mongo_uri)
        self.db = self.client["product_price_db"]
        self.collection = self.db["Gmarket_product_coll"]

        # 인덱스 생성
        self.collection.create_index([("category_id", 1), ("chunk", 1)])

    def close_spider(self, spider):
        if self.batch:
            self.collection.bulk_write(self.batch)
            self.batch.clear()
        self.client.close()
        gc.collect()

    def process_item(self, item, spider):
        adapter = ItemAdapter(item)
        category_id = adapter.get("category_id")
        product_id = adapter.get("product_id")
        reg_price = adapter.get("reg_price")
        sale_price = adapter.get("sale_price")
        date = adapter.get("date")

        if reg_price:
            reg_price = int(reg_price.replace(",", ""))
        if sale_price:
            sale_price = int(sale_price.replace(",", ""))

        price_data = {date: sale_price if sale_price else reg_price}

        # chunk는 해당 category_id에 있는 product 개수를 제한하기 위해 사용됨
        chunk = 0

        # product가 5000개 이상인 경우 새로운 chunk에 추가하도록 하는 로직
        while True:
            # 해당 chunk에서 product 개수 확인
            document = self.collection.find_one(
                {"category_id": category_id, "chunk": chunk}, {"products": 1}
            )
            if document is not None and len(document.get("products", [])) < 5000:
                break
            chunk += 1

        # 1. 해당 chunk에 product_id가 이미 있는 경우
        update_operation = UpdateOne(
            {
                "category_id": category_id,
                "chunk": chunk,
                "products.product_id": product_id,
            },
            {"$addToSet": {"products.$.prices": price_data}},
            upsert=False,
        )

        # 2. 해당 chunk에 product_id가 없는 경우 새로 추가
        """
        insert_operation_existing_category = UpdateOne(
            {
                "category_id": category_id,
                "chunk": chunk,
                "products.product_id": {"$ne": product_id},
            },
            {"$push": {"products": {"product_id": product_id, "prices": [price_data]}}},
            upsert=True,
        )
        """
        # 두 개의 연산을 순차적으로 실행
        self.batch.extend([update_operation])
        # self.batch.extend([update_operation, insert_operation_existing_category])

        # 배치 크기 조정
        self.items_processed += 1
        if len(self.batch) >= 1000:  # 필요 시 배치 크기 조정
            self.collection.bulk_write(self.batch)
            self.batch.clear()
            gc.collect()

        del item
        return None
