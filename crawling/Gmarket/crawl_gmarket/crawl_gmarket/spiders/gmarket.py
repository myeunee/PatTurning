import scrapy
import re
from datetime import datetime
from pymongo import MongoClient
import os
from scrapy.spidermiddlewares.httperror import HttpError


class GmarketSpider(scrapy.Spider):
    name = "gmarket"
    allowed_domains = ["www.gmarket.co.kr"]
    max_retries = 3
    failed_requests = []

    def __init__(self, n, *args, **kwargs):
        super(GmarketSpider, self).__init__(*args, **kwargs)

        # MongoDB 설정
        mongo_username = os.getenv("MONGO_USERNAME")
        mongo_password = os.getenv("MONGO_PASSWORD")
        mongo_host = os.getenv("MONGO_URL")

        # MongoDB 설정
        mongo_username = os.getenv("MONGO_USERNAME", "gu")
        mongo_password = os.getenv("MONGO_PASSWORD", "gh15985321")
        mongo_host = os.getenv("MONGO_URL", "swdc-cluster01.whgi16p.mongodb.net")

        mongo_uri = f"mongodb+srv://{mongo_username}:{mongo_password}@{mongo_host}/?retryWrites=true&w=majority"

        self.client = MongoClient(mongo_uri)
        db = self.client["Crawl"]
        collection = db["Gmarket_info_for_crawl"]

        document = collection.find_one({"pod_id": int(n)})
        if document:
            self.category_data = document.get("urls", [])
        else:
            self.logger.error(f"Document with pod_id {n} not found.")
            self.category_data = []

        self.start_requests_data = [
            {
                "category_id": data["category_id"],
                "category_name": data["category_name"],
                "detail_category_id": data["detail_category_id"],
            }
            for data in self.category_data
        ]

    def start_requests(self):
        for request_data in self.start_requests_data:
            for page in range(1, 11):
                page_url = f"https://www.gmarket.co.kr/n/list?category={request_data['detail_category_id']}&s=8&p={page}"
                yield scrapy.Request(
                    url=page_url,
                    callback=self.parse,
                    errback=self.errback,
                    meta={
                        "category_id": request_data["category_id"],
                        "category_name": request_data["category_name"],
                        "detail_category_id": request_data["detail_category_id"],
                        "retry_count": 0,
                    },
                )

    def parse(self, response):
        category_id = response.meta["category_id"]
        category_name = response.meta["category_name"]
        detail_category_id = response.meta["detail_category_id"]

        items = response.css("div.box__item-container")

        for item in items:
            product_id_match = re.search(
                r"goodscode=(\d+)", item.css("a.link__item::attr(href)").get()
            )
            if product_id_match:
                product_id = product_id_match.group(1)
                today_date = datetime.today().strftime("%Y-%m-%d")

                reg_price = item.css(
                    "div.box__price-original span.text__value::text"
                ).get()
                sale_price = (
                    item.css("div.box__price-seller strong.text__value::text").get()
                    or item.css("div.box__price-sale strong.text__value::text").get()
                )

                yield {
                    "category_id": category_id,
                    "category_name": category_name,
                    "product_id": product_id,
                    "reg_price": reg_price,
                    "sale_price": sale_price,
                    "date": today_date,
                }

    def errback(self, failure):
        self.logger.error(repr(failure))

        if failure.check(HttpError):
            response = failure.value.response
            retry_count = response.meta.get("retry_count", 0)

            if response.status == 403 and retry_count < self.max_retries:
                retry_count += 1
                new_meta = response.meta.copy()
                new_meta["retry_count"] = retry_count
                yield scrapy.Request(
                    response.url,
                    callback=self.parse,
                    errback=self.errback,
                    meta=new_meta,
                    dont_filter=True,
                )
            else:
                if len(self.failed_requests) < 100:
                    self.failed_requests.append(response.url)
                else:
                    self.logger.error(f"Failed requests exceed limit: {response.url}")

    def close(self, reason):
        self.client.close()
        self.logger.info(
            f"Spider closed: {reason}. Failed requests: {len(self.failed_requests)}"
        )
