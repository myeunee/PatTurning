import requests
from bs4 import BeautifulSoup
import re

from category_info import *
from rabbitmq_producer import *

RABBITMQ_HOST = os.getenv("RABBITMQ_HOST")
RABBITMQ_PORT = os.getenv("RABBITMQ_PORT")
RABBITMQ_USERNAME = os.getenv("RABBITMQ_USERNAME")
RABBITMQ_PASSWORD = os.getenv("RABBITMQ_PASSWORD")
RABBITMQ_QUEUE = os.getenv("RABBITMQ_QUEUE")

mq_producer = RabbitMQProducer(
    RABBITMQ_HOST,
    RABBITMQ_PORT,
    RABBITMQ_USERNAME,
    RABBITMQ_PASSWORD,
    RABBITMQ_QUEUE,
)


# product_id, 가격 정보 수집
def get_product_info(product_box):

    href = product_box.find("a")["href"]
    match = re.search(r"/product/detail/(\d+)", href)

    # 2.1 매칭 결과가 없을 경우 처리
    if not match:
        print(f"No product ID found in {href}")
        return None  # 매칭되지 않으면 None 반환
    product_id = int(match.group(1))

    sale_price = product_box.find("span", {"class": "price_discount"}).find("b").text

    reg_price = product_box.find("span", {"class": "price_original"}).find("b").text

    reg_price = int(reg_price.replace(",", ""))
    sale_price = int(sale_price.replace(",", ""))

    if sale_price:
        price = sale_price
    else:
        price = reg_price

    result = {"product_id": product_id, "price": price}
    return result


# 개별 url 요청
def crawl(url):
    response = requests.get(url)

    if response.status_code == 200:
        print(f"Successfully fetch.")

        soup = BeautifulSoup(response.text, "html.parser")
        product_boxes = soup.find_all("div", class_="wrapBox")

        result = []
        for product_box in product_boxes:
            product_info = get_product_info(product_box)
            if product_info:
                result.append(product_info)
        mq_producer.produce(result)

    else:
        print(f"Failed to retrieve {url}. Status code: {response.status_code}")


if __name__ == "__main__":

    for category_id in category_info.keys():

        url = f"https://www.oasis.co.kr/product/list?categoryId={category_id}&page=1&sort=priority&direction=desc&couponType=&rows=100000"

        crawl(url)

    mq_producer.close()
