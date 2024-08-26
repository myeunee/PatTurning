from gmarket_item import *
from db_info import *
import os
import re
import json
from pymongo import MongoClient
from selenium import webdriver
from selenium.webdriver.chrome.service import Service as ChromeService
from selenium.webdriver.common.by import By
from selenium.common.exceptions import NoSuchElementException


def get_categories_push_mongo():
    # MongoDB
    db = client["product_price_db"]
    source_collection = db["Gmarket_category_coll"]
    # 기존 collection의 모든 문서를 삭제
    source_collection.delete_many({})

    data = GmarketItem()

    # Selenium Chrome 옵션 설정
    options = webdriver.ChromeOptions()
    options.add_argument(
        "user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36"
    )
    options.add_argument("headless")
    options.add_argument("accept=*/*")
    options.add_argument("accept-encoding=gzip, deflate, br, zstd")
    options.add_argument("accept-language=ko-KR,ko;q=0.9")
    options.add_argument("connection=keep-alive")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--disable-gpu")
    options.add_argument("--disable-extensions")
    options.add_argument("--remote-debugging-port=9222")

    # Dockerfile에서 설정된 ChromeDriver의 경로 사용
    service = ChromeService(executable_path="/usr/bin/chromedriver")

    # ChromeDriver 객체 생성
    driver = webdriver.Chrome(service=service, options=options)

    try:
        url = "https://www.gmarket.co.kr"
        driver.get(url)

        box_element = driver.find_element(By.CLASS_NAME, "box__category")
        # 대분류
        category_elements = box_element.find_elements(
            By.CLASS_NAME, "list-item__1depth"
        )
        for category in category_elements:
            # 대분류명
            category_name = category.text.split("\n")[0]
            # 대분류 Item
            category_item = CategoryItem(category_name=category_name)
            category.click()
            # 중분류
            subcategory_elements = category.find_elements(
                By.CLASS_NAME, "box__2depth-list"
            )
            for subcategory in subcategory_elements:
                # 중분류명
                subcategory_name = subcategory.text.split("\n")[0]
                # 중분류 Item
                if subcategory_name:
                    subcategory_item = SubCategoryItem(
                        subcategory_name=subcategory_name
                    )
                    # 소분류
                    subsubcategory_elements = subcategory.find_elements(
                        By.CLASS_NAME, "link__2depth-item"
                    )
                    for subsubcategory in subsubcategory_elements:
                        # 소분류명
                        subsubcategory_name = subsubcategory.text
                        # 소분류 url
                        subsubcategory_url = subsubcategory.get_attribute("href")
                        match = re.search(r"L(\d+)\.aspx", subsubcategory_url)
                        subsubcategory_id = int(match.group(1)) if match else -1
                        # 소분류 Item
                        subsubcategory_item = SubSubCategoryItem(
                            subsubcategory_name=subsubcategory_name,
                            subsubcategory_id=subsubcategory_id,
                            url=subsubcategory_url,
                        )
                        # 중분류 Item에 소분류 Item 삽입
                        subcategory_item.subsubcategories.append(subsubcategory_item)
                # 대분류 Item에 중분류 Item 삽입
                category_item.subcategories.append(subcategory_item)
            # 최종 데이터에 대분류 Item 삽입
            data.categories.append(category_item)
    except NoSuchElementException as e:
        print(f"Error while processing elements: {e}")
    finally:
        driver.quit()

    # 결과를 딕셔너리로 변환
    result = data.to_dict()

    # 새로운 데이터를 삽입
    for category in result["categories"]:
        for subcategory in category["subcategories"]:
            for subsubcategory in subcategory["subsubcategories"]:
                if subsubcategory["subsubcategory_id"] != -1:
                    document = {
                        "_id": subsubcategory["subsubcategory_id"],
                        "category_name": subsubcategory["subsubcategory_name"],
                    }
                    # _id가 중복되면 해당 문서를 업데이트
                    source_collection.update_one(
                        {"_id": document["_id"]}, {"$set": document}, upsert=True
                    )

    print("Data successfully saved to 'Gmarket_category_coll' collection.")

    return result
