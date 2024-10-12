import requests, os
import json
import logging
import time, datetime
import pika
from dotenv import load_dotenv
from flask import Flask, request, jsonify

# config & rabbitmq connection
def config():
    # 로깅 설정
    logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(message)s')

    load_dotenv()
    username=os.getenv('RABBITMQ_USERNAME')
    password=os.getenv('RABBITMQ_PASSWORD')
    hostname=os.getenv('RABBITMQ_HOSTNAME')
    port=os.getenv('RABBITMQ_PORT')
    vhost=os.getenv('RABBITMQ_VHOST')
    queue=os.getenv('RABBITMQ_QUEUE')

    # RabbitMQ 연결 및 채널 생성
    credentials = pika.PlainCredentials(username, password) # RabbitMQ 인증 정보
    connection = pika.BlockingConnection(pika.ConnectionParameters(hostname, port, vhost, credentials=credentials)) # 연결 설정
    channel = connection.channel() 
    channel.queue_declare(queue=queue, durable=True)
    
    return channel, queue

# categoryId에 대한 데이터 수집 & rabbitmq로 전송
def produce_data(categoryId):
    total_start = time.time() # 전체 처리 시간 측정

    # RabbitMQ 채널 및 큐 설정
    channel, queue = config() 
    
    # initial response
    url = f"https://mfront.homeplus.co.kr/category/item.json?categoryDepth=1&categoryId={categoryId}&page=1&perPage=100&sort=RANK"
    response = requests.get(url)
    response_data = response.json()

    totalPages = response_data['pagination']['totalPage']
    category_name = response_data['data']['dataList'][0]['lcateNm']
    # # 파일 시스템 문제 방지
    category_name = category_name.replace('/', '_')
    category_name = category_name.replace(' ', '_') 
    logging.info(f"category_name: {category_name}; Total Page: {totalPages}")

    # 페이지 반복
    for page in range(1, totalPages + 1):
        start_time = time.time() # 페이지 처리 소요 시간 측정

        # 페이지에 대한 API 요청
        url = f"https://mfront.homeplus.co.kr/category/item.json?categoryDepth=1&categoryId={categoryId}&page={page}&perPage=100&sort=RANK"
        response = requests.get(url)
        response_data = response.json()

        # product_ids, prices 추출
        product_ids = [item['itemNo'] for item in response_data['data']['dataList']]
        prices = [
            item['dcPrice'] if item['dcTooltip'] and item['dcTooltip']['itemDcPrice'] else item['salePrice']
            for item in response_data['data']['dataList']
        ]

        end_time = time.time() # 페이지 처리 소요 시간 측정
        spent_time = (end_time - start_time)
        spent_time_s = datetime.timedelta(seconds=spent_time)

        logging.info(f"Request and collect ({page}/{totalPages}) pages")
        logging.info(f"time spent {spent_time_s}")

        # 수집한 데이터를 RabbitMQ로 전송
        for product_id, price in zip(product_ids, prices):
            start_time = time.time() # 메시지 전송 시간 측정

            # 메시지 데이터 생성
            message = {
                "category_name": category_name,
                "product_id": product_id,
                "price": price
            }
            json_message = json.dumps(message).encode("utf-8")
            
            # RabbitMQ에 메시지 전송
            channel.basic_publish(
                exchange='',
                routing_key=queue,
                body=json_message
            )

            end_time = time.time() # 메시지 전송 시간 측정
            spent_time = (end_time-start_time)
            spent_time_s = datetime.timedelta(seconds=spent_time)

            logging.info(f"Pushing Product ID[{product_id}] with price {price}원 to MQ")
            logging.info(f"time spent {spent_time_s}")

    total_end = time.time() # 전체 처리 시간 측정 종료
    total_spent_time = (total_end - total_start)
    total_spent_time_s = datetime.timedelta(seconds=total_spent_time)

    logging.info(f"Completed Saving CategoryId {categoryId}")
    logging.info(f"Total time spent {total_spent_time_s}")

    return total_spent_time_s

app = Flask(__name__)

# HTTP POST 요청 처리 엔드포인트
@app.route("/", methods=["POST"])
def trigger_rabbitmq_producer():
    # 요청에서 JSON 데이터를 추출
    data = request.get_json()
    # category_id를 request에서 추출, 없으면 400 error return
    if not data or 'category_id' not in data:
        return jsonify({"error": "category_id is REQUIRED"}), 400
    category_id = data['category_id']
    
    # HTTP 요청 시 데이터 수집 후 RabbitMQ로 전송
    spent_time = produce_data(category_id)
    return jsonify({"message": f"collected ALL categoryId[{category_id}] products, Total time spent {spent_time}"}), 200

# Cloud Run이 기본적으로 사용하는 포트 설정
if __name__ == "__main__":
    port = int(os.environ.get('PORT', 8080))
    app.run(host='0.0.0.0', port=port)