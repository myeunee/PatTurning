# import json
import datetime
# import os
import logging, time
import pymongo
import certifi, os
from concurrent.futures import ThreadPoolExecutor, ProcessPoolExecutor
from dotenv import load_dotenv

ca = certifi.where()


class PostyItems:
    def __init__(self, category_id, category_name, product_id, price):
        self.date = datetime.datetime.now().strftime('%Y-%m-%d')
        self.platform = 'HomePlus'
        self.category_id = category_id
        self.category_name = category_name
        self.product_id = product_id
        self.price = price
        # print(self.product_id, self.price)        
        
    def save_to_mongo(self):
        load_dotenv()
        
        mongo_username = os.getenv("MONGO_USERNAME")
        mongo_password = os.getenv("MONGO_PASSWORD")
        mongo_host = os.getenv("MONGO_URL")
        
        client = pymongo.MongoClient(f"mongodb+srv://{mongo_username}:{mongo_password}@{mongo_host}/?retryWrites=true&w=majority",  tlsCAFile=ca)

        db = client['product_price_db']
        collection_category = db['Posty_category_coll']
        collection_price = db['Posty_product_coll']
        
        total_start = time.time()
        
        start = time.time()
        collection_category.update_one(
            { '_id': self.category_id },
            {"$set": {'_id': self.category_id, 'category_name': self.category_name} },
            upsert=True 
        )
        collection_price.update_one(
            { 'category_id': self.category_id },
            { "$set": {'category_id': self.category_id, 'products': []}},
            upsert=True
        )
        end = time.time()
        logging.info(f"Time taken to insert category_id[{self.category_id}], category_name[{self.category_name}]: {datetime.timedelta(seconds=(end - start))}")
        
        for single_product_id, single_price in zip(self.product_id, self.price):
            start = time.time()
            product_exists = collection_price.aggregate([ 
                        { "$match": { "category_id": self.category_id } }, 
                        { "$unwind": "$products" }, 
                        { "$match": { "products.product_id": single_product_id } }, 
                        { "$group": {
                            "_id": "$_id", 
                            "category_id": { "$first": "$category_id" },  
                            "products": { "$push": "$products" } 
                        }},
                        { "$project": { 
                            "_id": 0, 
                            "customMessage": { "$literal": "given product exists!" } 
                        }}
            ])
            end = time.time()
            logging.info(f"Time taken to finding product[{single_product_id}]: {datetime.timedelta(seconds=(end - start))}")
                
            # product가 존재하지 않을 시 초기 입력
            if not product_exists:
                logging.info(f"product[{single_product_id}] not exists. so add it")
                start = time.time()
                collection_price.update_one(
                    {
                        'category_id': self.category_id
                    },
                    {
                        "$addToSet": {
                            'products': {
                                'product_id': single_product_id,
                                'prices': []
                            }
                        }
                    }
                )
                end = time.time()
                logging.info(f"Time taken to initial insert product[{single_product_id}]: {datetime.timedelta(seconds=(end - start))}")
            else:
                logging.info(f"product[{single_product_id}] exists.")
                
            
            # 해당하는 product에 price 추가
            # logging.info(f"product already exists.")
            start = time.time()
            collection_price.update_one(
                {
                    'category_id': self.category_id,
                    'products.product_id': single_product_id
                },
                {
                    "$addToSet": {
                        'products.$.prices': {self.date: single_price}
                    }
                }
            )
            end = time.time()
            logging.info(f"Time taken to insert product[{single_product_id}]: price[{single_price}]: {datetime.timedelta(seconds=(end - start))}")
        
        total_end = time.time()
        logging.info(f"Total time taken updating data of categoryId[{self.category_id}]: {datetime.timedelta(seconds=(total_end - total_start))}")
    
        # # 데이터를 여러 청크로 나누기
        # chunk_size = len(self.product_id) // 5  # 예를 들어 4개의 프로세스로 분할
        # logging.info(f"chunck size: {chunk_size}")
        # chunks = [(self.product_id[i:i + chunk_size], self.price[i:i + chunk_size]) \
        #             for i in range(0, len(self.product_id), chunk_size)]
        # print(f"chunks: {chunks}")

        # def process_chunk(chunk):
        #     with ThreadPoolExecutor(max_workers=4) as executor:
        #         futures = []
        #         for single_product_id, single_price in chunk:
        #             futures.append(executor.submit(process_single_product, single_product_id, single_price))
        #         # 모든 스레드가 작업을 완료할 때까지 대기
        #         for future in futures:
        #             future.result()
                    
        # with ProcessPoolExecutor(max_workers=6) as process_executor:
        #     process_executor.map(process_chunk, chunks)
            
        logging.info("Saving data in MongoDB Completed;")

