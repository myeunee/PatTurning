# import json
import datetime
# import os
import logging, time
import pymongo
import certifi, os
from concurrent.futures import ThreadPoolExecutor, ProcessPoolExecutor
from dotenv import load_dotenv

ca = certifi.where()

        
class HomePlusItems:
    def __init__(self, category_id, category_name, product_id, price):
        self.date = datetime.datetime.now().strftime('%Y-%m-%d')
        self.platform = 'HomePlus'
        self.category_id = category_id
        self.category_name = category_name
        self.product_id = product_id
        self.price = price
        # print(self.product_id, self.price)  
        
        load_dotenv()
        
        self.__mongo_username = os.getenv("MONGO_USERNAME")
        self.__mongo_password = os.getenv("MONGO_PASSWORD")
        self.__mongo_host = os.getenv("MONGO_URL")
        
        self.client = pymongo.MongoClient(f"mongodb+srv://{self.__mongo_username}:{self.__mongo_password}@{self.__mongo_host}/?retryWrites=true&w=majority",  tlsCAFile=ca)

        self.db = self.client['product_price_db']
        self.category_collection = self.db['HomePlus_category_coll']
        self.product_collection = self.db['HomePlus_product_coll']
        
    # NotPriamryError 처리 로직
    def retry_logic(self, retry_func, product_id=-1, price=-1, retries=3, delay=5):
        for attempt in range(retries):
            try:
                # 재시도 지연
                time.sleep(delay)
                
                # 재시도
                if retry_func.__name__ == "setup_mongo":
                    self.setup_mongo()
                elif retry_func.__name__ == "update_prices":
                    self.update_prices(product_id, price)
                elif retry_func.__name__ == "setup_products":
                    self.setup_products(product_id)
                elif retry_func.__name__ == "update_prices":
                    self.update_prices(product_id, price)
                    
                
                logging.info(f"'{retry_func.__name__}' function completed successfully after retry")
                break  # 성공 시 반복문 종료

            except pymongo.errors.NotPrimaryError as e:
                logging.info(f"Retry {attempt + 1} failed with NotPrimaryError:", e)
                if attempt + 1 == retries:
                    logging.info("Max retries reached. Could not insert data.")
                    raise  # 재시도 횟수 초과 시 예외를 다시 발생시킴    
    
    def handle_connection_failure(self, retry_func, product_id=-1, price=-1):
        # print("Handling connection failure:", e)
        self.client.close()
        self.client = pymongo.MongoClient(f"mongodb+srv://{self.__mongo_username}:{self.__mongo_password}@{self.__mongo_host}/?retryWrites=true&w=majority",  tlsCAFile=ca)

        self.db = self.client['product_price_db']
        self.category_collection = self.db['HomePlus_category_coll']
        self.product_collection = self.db['HomePlus_product_coll']
        self.retry_logic(retry_func, product_id, price)
        
        logging.info(f"Client Connection restared. Startedretrying '{retry_func.__name__}' function...")
        # 재시도
        if retry_func.__name__ == "setup_mongo":
            self.setup_mongo()
        elif retry_func.__name__ == "update_prices":
            self.update_prices(product_id, price)
        elif retry_func.__name__ == "setup_products":
            self.setup_products(product_id)
        elif retry_func.__name__ == "update_prices":
            self.update_prices(product_id, price)
        
    
    def setup_mongo(self):
        self.category_collection.update_one(
            { '_id': self.category_id },
            {"$set": {'_id': self.category_id, 'category_name': self.category_name} },
            upsert=True 
        )
        self.product_collection.update_one(
            { 'category_id': self.category_id },
            { "$set": {'category_id': self.category_id, 'products': []}},
            upsert=True
        )
        
    def exists_product(self, product_id):
        product_exists = self.product_collection.aggregate([ 
                    { "$match": { "category_id": self.category_id } }, 
                    { "$unwind": "$products" }, 
                    { "$match": { "products.product_id": product_id } }, 
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
        flag = False 
        if len(list(product_exists)) > 0:
            flag = True
            print("flag TRUE!")
        else:
            print("flag FALSE!")
        
        # product가 존재하면 true, 존재하지 않으면 false 반환
        return flag
        
    def setup_products(self, product_id):
        self.product_collection.update_one(
            {
                'category_id': self.category_id
            },
            {
                "$addToSet": {
                    'products': {
                        'product_id': product_id,
                        'prices': []
                    }
                }
            }
        )
        
    def update_prices(self, product_id, price):
        self.product_collection.update_one(
            {
                'category_id': self.category_id,
                'products.product_id': product_id
            },
            {
                "$addToSet": {
                    'products.$.prices': {self.date: price}
                }
            }
        )
    
    def save_to_mongo(self):
        total_start = time.time()
        
        # setup에 소요되는 시간
        start = time.time()
        # setup
        try:
            self.setup_mongo()
        except pymongo.errors.NotPrimaryError as e:
            logging.info("caught NotPriamryError during ```setup_mongo``` function,\n", e, "\nso trying retry")
            self.retry_logic(self.setup_mongo)
        except pymongo.errors.ConnectionFailure as e:
            logging.info("caught ConnectionFailure during ```setup_mongo``` function,\n", e, "\nso trying retry")
            self.handle_connection_failure(self.setup_mongo)
            
        end = time.time()
        logging.info(f"Completed Updating Category[{self.category_id};{self.category_name}]")
        
        logging.info(f"Time taken to mongo setup: {datetime.timedelta(seconds=(end - start))}")
        
        for single_product_id, single_price in zip(self.product_id, self.price):
            start = time.time()
            try:
                product_exists = self.exists_product(single_product_id)
            except pymongo.errors.NotPrimaryError as e:
                logging.info("caught NotPriamryError during ```exists_product``` function,\n", e, "\nso trying retry")
                self.retry_logic(self.exists_product, single_product_id)
            except pymongo.errors.ConnectionFailure as e:
                logging.info("caught ConnectionFailure during ```exists_product``` function,\n", e, "\nso trying retry")
                self.handle_connection_failure(self.self.exists_product, single_product_id)
            
            end = time.time()
            logging.info(f"Time taken to finding product[{single_product_id}]: {datetime.timedelta(seconds=(end - start))}")
            
            # product가 존재하지 않을 시 초기 입력
            if not product_exists:
                logging.info(f"product[{single_product_id}] not exists. so add it")
                start = time.time()
                try:
                    self.setup_products(single_product_id)
                except pymongo.errors.NotPrimaryError as e:
                    logging.info("caught NotPriamryError during ```setup_products``` function,\n", e, "\nso trying retry")
                    self.retry_logic(self.setup_products, single_product_id)
                except pymongo.errors.ConnectionFailure as e:
                    logging.info("caught ConnectionFailure during ```setup_products``` function,\n", e, "\nso trying retry")
                    self.handle_connection_failure(self.setup_products, single_product_id)
                end = time.time()
                logging.info(f"Time taken to initial insert product[{single_product_id}]: {datetime.timedelta(seconds=(end - start))}")
            else:
                logging.info(f"product[{single_product_id}] exists.")
                
            
            # 해당하는 product에 price 추가
            start = time.time()
            try:
                self.update_prices(single_product_id, single_price)
            except pymongo.errors.NotPrimaryError as e:
                logging.info("caught NotPriamryError during ```update_prices``` function,\n", e, "\nso trying retry")
                self.retry_logic(self.update_prices, single_product_id, single_price)
            except pymongo.errors.ConnectionFailure as e:
                logging.info("caught ConnectionFailure during ```update_prices``` function,\n", e, "\nso trying retry")
                self.handle_connection_failure(self.update_prices, single_product_id, single_price)
            end = time.time()
            logging.info(f"Time taken to insert product[{single_product_id}]: price[{single_price}]: {datetime.timedelta(seconds=(end - start))}")
        
        total_end = time.time()
        logging.info(f"Total time taken updating data of categoryId[{self.category_id}]: {datetime.timedelta(seconds=(total_end - total_start))}")
        logging.info(f"Saving data of categoryId[{self.category_id}]into MongoDB Completed;")

